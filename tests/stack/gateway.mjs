// Stands in for Supabase + Vercel during integration tests: serves the built app
// from dist/, forwards /rest/v1 to PostgREST and answers the few auth/storage/api
// calls the app makes. Only for tests — it does no real authentication.
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { anonKey, REST_PORT, sign, sql } from './stack.mjs';

const require = createRequire(import.meta.url);
const { deleteAccount, refusal } = require('../../api/_account.js');
const { catalogGame, searchCatalog, toGameDraft } = await import('../../catalog/bgg.ts');

// The catalog with a fake BGG (the fixtures) and an in-memory cache.
const fixture = name => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
const catalogStore = new Map();
const catalog = {
  token: 'test',
  fetch: async url => new Response(fixture(url.includes('/search') ? 'bgg-search.xml' : 'bgg-thing.xml')),
  cache: {
    search: async query => [...catalogStore.values()].filter(game => game.name.toLowerCase().includes(query.toLowerCase())),
    get: async id => catalogStore.get(id) ?? null,
    save: async games => games.forEach(game => catalogStore.set(game.bggId, game)),
  },
};

const PORT = 8790;
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const REST = `http://localhost:${REST_PORT}`;
// Same clean URLs as Vercel (/inicio, /privacidad).
const REWRITES = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')).rewrites ?? [];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript' };
const claimsOf = header => {
  try {
    return JSON.parse(Buffer.from((header ?? '').replace(/^Bearer /, '').split('.')[1], 'base64url'));
  } catch {
    return null;
  }
};
const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const body = await new Promise(resolve => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

  if (url.pathname === '/supabase-config.js') {
    res.writeHead(200, { 'content-type': 'application/javascript' });
    return res.end(`window.LUDOTECA_SUPABASE={url:"http://localhost:${PORT}",publishableKey:"${anonKey()}"};`);
  }
  if (url.pathname.startsWith('/rest/v1/')) {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.apikey;
    headers.authorization ??= 'Bearer ' + anonKey();
    const upstream = await fetch(REST + url.pathname.slice(8) + url.search, {
      method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
    });
    const skip = ['content-encoding', 'transfer-encoding', 'content-length'];
    res.writeHead(upstream.status, Object.fromEntries([...upstream.headers].filter(([key]) => !skip.includes(key))));
    return res.end(Buffer.from(await upstream.arrayBuffer()));
  }
  if (url.pathname.startsWith('/auth/v1/')) {
    const claims = claimsOf(req.headers.authorization);
    return json(res, 200, claims ? { id: claims.sub, email: claims.email } : {});
  }
  if (url.pathname.startsWith('/storage/v1/')) return json(res, 400, { error: 'Storage is not available in tests' });
  if (url.pathname === '/api/catalog') {
    if (!claimsOf(req.headers.authorization)?.sub) return json(res, 401, { error: 'Inicia sesión para continuar.' });
    const id = Number(url.searchParams.get('id'));
    if (id > 0) {
      const game = await catalogGame(id, catalog);
      return game ? json(res, 200, { game: toGameDraft(game) }) : json(res, 404, { error: 'No se ha encontrado ese juego.' });
    }
    return json(res, 200, { hits: await searchCatalog(url.searchParams.get('q') ?? '', catalog) });
  }
  if (url.pathname === '/api/delete-account') {
    // Runs the real api/_account.js steps with full database access (like the secret key).
    // Storage and the Auth admin API don't exist here: no photo to remove, and the user
    // is deleted with SQL, which cascades exactly like Supabase Auth does.
    const claims = claimsOf(req.headers.authorization);
    if (!claims?.sub) return json(res, 401, { error: 'Inicia sesión para continuar.' });
    const user = { id: claims.sub, email: claims.email, app_metadata: {} };
    const reason = refusal(user);
    if (reason) return json(res, 403, { error: reason });
    const db = createClient(`http://localhost:${PORT}`, sign({ role: 'service_role' }), { auth: { persistSession: false, autoRefreshToken: false } });
    const admin = {
      from: table => db.from(table),
      storage: { from: () => ({ list: async () => ({ data: [], error: null }), remove: async () => ({ data: null, error: null }) }) },
      auth: { admin: { deleteUser: async id => (sql(`delete from auth.users where id = '${id}';`, { admin: true }), { data: null, error: null }) } },
    };
    try {
      await deleteAccount(admin, user);
      return json(res, 200, { deleted: true });
    } catch (error) {
      return json(res, 500, { error: error.message });
    }
  }
  if (url.pathname === '/api/friend-lookup') {
    // Same answer shape as api/friend-lookup.js, using the caller's token to read profiles.
    const claims = claimsOf(req.headers.authorization);
    const queries = JSON.parse(body.toString() || '{}').queries ?? [];
    const profiles = await (await fetch(`${REST}/profiles?select=user_id,nickname,created_at`, { headers: { authorization: req.headers.authorization } })).json();
    return json(res, 200, {
      results: queries.map(raw => {
        const query = raw.toLowerCase();
        const match = profiles.find(p => p.nickname.toLowerCase() === query);
        return match
          ? { query, found: true, userId: match.user_id, nickname: match.nickname, createdAt: match.created_at, self: match.user_id === claims?.sub }
          : { query, found: false };
      }),
    });
  }

  const page = REWRITES.find(rule => rule.source === url.pathname)?.destination ?? url.pathname;
  const file = normalize(join(DIST, page === '/' ? 'index.html' : page));
  if (file.startsWith(normalize(DIST)) && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    return res.end(readFileSync(file));
  }
  res.writeHead(404);
  res.end('not found');
}).listen(PORT, () => console.log(`Test gateway on http://localhost:${PORT}`));
