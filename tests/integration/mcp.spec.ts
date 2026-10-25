import { expect, test, type APIRequestContext } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { resetData, sign, sql, USERS } from '../stack/stack.mjs';

// Talks MCP to the TypeScript server (mcp/local.ts) the way Claude or ChatGPT would,
// against the Docker Postgres with every migration and RLS rule.
// tests/stack/run.mjs starts it and sets MCP_URL.
const MCP_URL = process.env.MCP_URL;
test.skip(!MCP_URL, 'The local MCP server is not running');

type Who = 'a' | 'b';
const users = USERS as Record<Who, { id: string; email: string }>;
const token = (who: Who) => sign({ sub: users[who].id, email: users[who].email, role: 'authenticated', aud: 'authenticated' });

let nextId = 0;
async function rpc(request: APIRequestContext, method: string, params: object, who: Who | null = 'a') {
  const response = await request.post(MCP_URL!, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18',
      ...(who ? { Authorization: 'Bearer ' + token(who) } : {}),
    },
    data: { jsonrpc: '2.0', id: ++nextId, method, params },
  });
  const raw = await response.text();
  const body = raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(raw.split('\n').find(l => l.startsWith('data:'))?.slice(5) ?? 'null');
  return { status: response.status(), body };
}
const toolText = async (request: APIRequestContext, name: string, args: object = {}, who: Who = 'a') =>
  (await rpc(request, 'tools/call', { name, arguments: args }, who)).body.result.content[0].text as string;

test.beforeAll(() => {
  resetData();
  const json = (value: object) => `'${JSON.stringify(value)}'`;
  const game = (owner: string, id: string, data: object) => `('${owner}','${id}',${json({ id, ...data })})`;
  sql(`
    insert into public.games(user_id, app_id, data) values
      ${game(users.a.id, 'g1', { name: 'Catan', players: '3–4', types: ['Estrategia'], weight: 2, duration: 90, location: 'Casa Sergio' })},
      ${game(users.a.id, 'g2', { name: 'Magic Maze', players: '1–8', types: ['Cooperativo'] })},
      ${game(users.b.id, 'g3', { name: 'Juego secreto de B' })};
    insert into public.groups(user_id, app_id, data) values
      ('${users.a.id}', 'grp1', ${json({ id: 'grp1', name: 'Los Balcánicos', size: 4, friendIds: [], likes: '', notes: '' })});
    insert into public.plays(id, owner_id, group_owner, group_key, group_name, game_name, played_on) values
      ('11111111-1111-1111-1111-111111111111', '${users.a.id}', '${users.a.id}', 'grp1', 'Los Balcánicos', 'Catan', '2026-10-20');
    insert into public.play_players(play_id, name, user_id, winner, rating) values
      ('11111111-1111-1111-1111-111111111111', 'usuario_a', '${users.a.id}', true, 9),
      ('11111111-1111-1111-1111-111111111111', 'Pepe', null, false, 7);
    -- B's collection is public: A may browse it in the app, but it is not A's collection.
    update public.profiles set collection_visibility = 'public' where user_id = '${users.b.id}';`, { admin: true });
});

test('introduces itself and lists its tools', async ({ request }) => {
  const init = await rpc(request, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  expect(init.status).toBe(200);
  expect(init.body.result.serverInfo.name).toBe('el-baul-de-los-jogos');
  const list = await rpc(request, 'tools/list', {});
  expect(list.body.result.tools.map((t: { name: string }) => t.name).sort())
    .toEqual(['list_games', 'list_groups', 'play_stats', 'recommend_games', 'who_am_i']);
});

test('answers as the signed-in person', async ({ request }) => {
  expect(await toolText(request, 'who_am_i')).toBe('Conectado como @usuario_a (a@x.com).');
});

test('each person only sees their own collection, thanks to RLS', async ({ request }) => {
  const mine = await toolText(request, 'list_games');
  expect(mine).toContain('2 juegos:');
  expect(mine).toContain('- Catan (3–4 jugadores; 90 min; dureza 2/5; Estrategia; en Casa Sergio)');
  expect(mine).not.toContain('secreto');
  expect(await toolText(request, 'list_games', { search: 'cooperativo' })).toBe('1 juego:\n- Magic Maze (1–8 jugadores; Cooperativo)');
  expect(await toolText(request, 'list_games', {}, 'b')).toBe('1 juego:\n- Juego secreto de B');
  expect(await toolText(request, 'list_groups', {}, 'b')).toBe('Todavía no hay grupos.');
});

test('group statistics and recommendations come from the real plays', async ({ request }) => {
  const stats = await toolText(request, 'play_stats', { group: 'balcánicos' });
  expect(stats).toContain('1 partida en Los Balcánicos.');
  expect(stats).toContain('Quién gana más: tú (1).');
  expect(stats).toContain('Mejor valorados: Catan (8/10).');
  const picks = await toolText(request, 'recommend_games', { group: 'Los Balcánicos', players: 4 });
  expect(picks.split('\n')[0]).toBe('Sugerencias para 4 personas · Los Balcánicos:');
  expect(picks).toContain('[Nota del grupo: 8/10]');
});

test('asks to sign in when there is no token', async ({ request }) => {
  expect((await rpc(request, 'tools/list', {}, null)).status).toBe(401);
});

test('without a token, the 401 points to the OAuth metadata, which names Supabase as the issuer', async ({ request }) => {
  const response = await request.post(MCP_URL!, { data: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} } });
  expect(response.status()).toBe(401);
  const challenge = response.headers()['www-authenticate'];
  const metadataUrl = challenge.match(/resource_metadata="([^"]+)"/)?.[1];
  expect(metadataUrl).toMatch(/\/\.well-known\/oauth-protected-resource\/mcp$/);
  const metadata = await (await request.get(metadataUrl!)).json();
  expect(metadata.resource).toMatch(/\/mcp$/);
  expect(metadata.authorization_servers).toEqual(['http://localhost:8790/auth/v1']);
});
