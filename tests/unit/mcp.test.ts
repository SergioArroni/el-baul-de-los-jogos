import { describe, expect, it } from 'vitest';
import { BaulError, createBaulHandler, type BaulData } from '../../mcp/server';
import type { Game, Group, Play } from '../../src/domain/types';

// The whole MCP endpoint with a fake data port: real protocol messages, no network.
const ME = { id: 'me', email: 'yo@x.com', nickname: 'sergio' };
const game = (name: string, over: Partial<Game> = {}): Game =>
  ({ id: name, name, players: '2–5', types: [], weight: 2, duration: 30, locations: [], notes: '', ...over });
const GAMES = [
  game('Catan', { players: '3–4', types: ['Estrategia'], duration: 90 }),
  game('Dixit', { players: '3–8', types: ['Fiesta'] }),
  game('Magic Maze', { players: '1–8', types: ['Cooperativo'], duration: 15 }),
];
const GROUP: Group = { id: 'g1', name: 'Los Balcánicos', size: null, friendIds: ['f1', 'f2'], likes: 'fiesta', notes: '' };
const play = (game_name: string, winner: string, rating: number): Play => ({
  id: game_name + winner, owner_id: 'me', group_owner: 'me', group_key: 'g1', group_name: 'Los Balcánicos', game_name,
  played_on: '2026-10-20', place: null, notes: null, created_at: '',
  play_players: [{ id: 'x', play_id: 'p', name: winner, user_id: winner === 'Yo' ? 'me' : null, points: null, winner: true, rating }],
});
const data: BaulData = {
  account: async () => ME,
  collection: async () => ({ games: GAMES, groups: [GROUP], friends: [{ id: 'f1', name: 'Ana' }, { id: 'f2', name: 'Pepe' }] }),
  plays: async () => [play('Dixit', 'Yo', 9), play('Dixit', 'Ana', 7), play('Catan', 'Ana', 6)],
};
const AUTH = 'https://x.supabase.co/auth/v1';
const handle = createBaulHandler({ allowedHosts: ['localhost'], dataFor: token => (token === 'good' ? data : failing), authorizationServer: AUTH });
const failing: BaulData = { ...data, account: async () => { throw new BaulError('Tu sesión de El Baúl no es válida o ha caducado.'); } };

let id = 0;
async function rpc(method: string, params: object, { token = 'good', host = 'localhost' } = {}) {
  const response = await handle(new Request(`http://${host}/api/mcp`, {
    method: 'POST',
    headers: {
      host, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18', ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  }));
  const raw = await response.text();
  // Older protocol versions may answer as an SSE stream: take the JSON from its data line.
  const body = raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(raw.split('\n').find(l => l.startsWith('data:'))?.slice(5) ?? 'null');
  return { status: response.status, body };
}
const call = async (name: string, args: object = {}, token = 'good') => {
  const { body } = await rpc('tools/call', { name, arguments: args }, { token });
  return { text: body.result.content[0].text as string, isError: !!body.result.isError };
};

describe('MCP endpoint', () => {
  it('introduces itself and lists read-only tools', async () => {
    const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    expect(init.body.result.serverInfo.name).toBe('el-baul-de-los-jogos');
    const { body } = await rpc('tools/list', {});
    const tools = body.result.tools as { name: string; annotations?: { readOnlyHint?: boolean } }[];
    expect(tools.map(t => t.name).sort()).toEqual(['list_games', 'list_groups', 'play_stats', 'recommend_games', 'who_am_i']);
    expect(tools.every(t => t.annotations?.readOnlyHint)).toBe(true);
  });

  it('points clients without a token to the OAuth metadata', async () => {
    const response = await handle(new Request('http://localhost/api/mcp', { method: 'POST', headers: { host: 'localhost' } }));
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer resource_metadata="http://localhost/.well-known/oauth-protected-resource/api/mcp"');
    const metadata = await handle(new Request('http://localhost/.well-known/oauth-protected-resource/api/mcp', { headers: { host: 'localhost' } }));
    expect(await metadata.json()).toEqual({
      resource: 'http://localhost/api/mcp', authorization_servers: [AUTH], bearer_methods_supported: ['header'],
      resource_name: 'El Baúl de los Jogos', resource_documentation: 'http://localhost/inicio',
    });
  });

  it('asks for a new token when it has expired', async () => {
    const checked = createBaulHandler({ allowedHosts: ['localhost'], dataFor: () => data, authorizationServer: AUTH, verify: async token => token === 'good' });
    const response = await checked(new Request('http://localhost/api/mcp', { method: 'POST', headers: { host: 'localhost', Authorization: 'Bearer old' } }));
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('error="invalid_token"');
  });

  it('rejects requests without a token or for another host', async () => {
    expect((await rpc('tools/list', {}, { token: '' })).status).toBe(401);
    expect((await rpc('tools/list', {}, { host: 'evil.example' })).status).toBe(403);
  });

  it('lists and filters games with the app’s catalog logic', async () => {
    expect((await call('list_games')).text).toBe(
      '3 juegos:\n- Catan (3–4 jugadores; 90 min; dureza 2/5; Estrategia)\n- Dixit (3–8 jugadores; 30 min; dureza 2/5; Fiesta)\n- Magic Maze (1–8 jugadores; 15 min; dureza 2/5; Cooperativo)');
    expect((await call('list_games', { style: 'Cooperativo' })).text).toMatch(/^1 juego:\n- Magic Maze/);
    expect((await call('list_games', { players: 6 })).text).not.toContain('Catan');
  });

  it('recommends for a group: its size, likes and ratings', async () => {
    const { text } = await call('recommend_games', { group: 'balcánicos' });
    expect(text.split('\n')[0]).toBe('Sugerencias para 3 personas · Los Balcánicos:');
    expect(text.split('\n')[1]).toMatch(/^- Dixit .*\[Nota del grupo: 8\/10\]$/);
    expect(text).toContain('[Sin estrenar con el grupo]');
  });

  it('summarises a group’s plays', async () => {
    const { text } = await call('play_stats', { group: 'Los Balcánicos' });
    expect(text).toContain('3 partidas en Los Balcánicos.');
    expect(text).toContain('Más jugado: Dixit (2 veces).');
    expect(text).toContain('Quién gana más: Ana (2), tú (1).');
    expect(text).toContain('Sin estrenar en Los Balcánicos: 1 (Magic Maze).');
  });

  it('explains problems in plain words instead of failing', async () => {
    const missing = await call('recommend_games', { group: 'Los del jueves' });
    expect(missing).toEqual({ isError: true, text: 'No hay ningún grupo llamado «Los del jueves». Grupos disponibles: Los Balcánicos.' });
    expect(await call('who_am_i', {}, 'expired')).toEqual({ isError: true, text: 'Tu sesión de El Baúl no es válida o ha caducado.' });
  });
});
