// Local copy of the backend for integration tests: Supabase's Postgres image with
// every migration in sql/ applied, plus PostgREST (the REST API Supabase runs).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

export const DB = 'jogos-test-db';
export const REST = 'jogos-test-rest';
export const DB_PORT = 54329;
export const REST_PORT = 54330;
export const JWT_SECRET = 'jogos-local-test-secret-0123456789abcdef';
export const USERS = {
  a: { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'a@x.com', nickname: 'usuario_a' },
  b: { id: 'bbbbbbbb-0000-0000-0000-000000000002', email: 'b@x.com', nickname: 'usuario_b' },
  c: { id: 'cccccccc-0000-0000-0000-000000000003', email: 'c@x.com', nickname: 'usuario_c' },
};
const MIGRATIONS = ['schema.sql', 'unique-game-names.sql', 'user-features.sql', 'profile-appearance.sql', 'community-plays.sql', 'wishlist-hype.sql', 'profiles-privacy.sql', 'wishlist-meeples.sql', 'plays-duration.sql', 'ranking.sql', 'google-login.sql'];

function docker(args, input) {
  try {
    return execFileSync('docker', args, { input, stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] }).toString();
  } catch (error) {
    throw new Error(`docker ${args.slice(0, 2).join(' ')} failed: ${error.stderr?.toString().trim() || error.message}`);
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Runs SQL as `postgres` (like Supabase's SQL Editor) or as the superuser for test-only setup. */
export function sql(text, { admin = false } = {}) {
  const user = admin ? ['-h', 'localhost', '-U', 'supabase_admin'] : ['-U', 'postgres'];
  return docker(['exec', '-i', '-e', 'PGPASSWORD=postgres', DB, 'psql', ...user, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-tA'], text);
}

const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
export function sign(claims) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ exp: Math.floor(Date.now() / 1000) + 86400, ...claims });
  return `${head}.${body}.${createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url')}`;
}
export const anonKey = () => sign({ role: 'anon' });

async function waitFor(check, what, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      if (await check()) return;
    } catch { /* not ready yet */ }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

export async function up() {
  down();
  docker(['run', '-d', '--name', DB, '-e', 'POSTGRES_PASSWORD=postgres', '-p', `${DB_PORT}:5432`, 'supabase/postgres:15.8.1.085']);
  // The image restarts Postgres while running its own init scripts, so wait until auth.uid() exists.
  await waitFor(() => sql("select to_regprocedure('auth.uid()') is not null", { admin: true }).trim() === 't', 'Postgres');

  // Pieces the real Supabase adds through its other services (Auth, Storage).
  sql(`
    create or replace function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
    create or replace function auth.uid() returns uuid language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
    grant execute on function auth.jwt() to authenticated, anon, postgres;
    alter table storage.buckets add column if not exists public boolean default false,
      add column if not exists file_size_limit bigint, add column if not exists allowed_mime_types text[];
    alter role authenticator with login password 'postgres';
  `, { admin: true });

  for (const file of MIGRATIONS) sql(readFileSync(new URL(`../../sql/${file}`, import.meta.url), 'utf8'));
  // Second run of the newest migration: it must be safe to run twice.
  sql(readFileSync(new URL('../../sql/google-login.sql', import.meta.url), 'utf8'));

  addUsers();

  docker(['run', '-d', '--name', REST, '-p', `${REST_PORT}:3000`, '--add-host=host.docker.internal:host-gateway',
    '-e', `PGRST_DB_URI=postgres://authenticator:postgres@host.docker.internal:${DB_PORT}/postgres`,
    '-e', 'PGRST_DB_SCHEMAS=public', '-e', 'PGRST_DB_ANON_ROLE=anon', '-e', `PGRST_JWT_SECRET=${JWT_SECRET}`,
    'postgrest/postgrest:v12.2.3']);
  await waitFor(async () => (await fetch(`http://localhost:${REST_PORT}/profiles?select=nickname`, {
    headers: { Authorization: 'Bearer ' + sign({ role: 'authenticated', sub: USERS.a.id }) },
  })).ok, 'PostgREST');
}

export function down() {
  for (const name of [REST, DB]) {
    try {
      docker(['rm', '-f', name]);
    } catch { /* already gone */ }
  }
}

/** Empties the app tables between tests (accounts and profiles stay). */
/** Creates the test accounts that don't exist (a test may delete one). */
function addUsers() {
  const values = Object.values(USERS)
    .map(u => `('${u.id}','${u.email}','{"nickname":"${u.nickname}"}')`).join(',');
  sql(`insert into auth.users(id, email, raw_user_meta_data) values ${values} on conflict (id) do nothing;`, { admin: true });
}

export function resetData() {
  addUsers();
  sql('truncate public.plays, public.friend_links, public.group_shares, public.groups, public.games, public.places, public.friends, public.wishlist_games cascade;', { admin: true });
  sql("update public.profiles set collection_visibility = 'friends', stats_visibility = 'friends';", { admin: true });
}
