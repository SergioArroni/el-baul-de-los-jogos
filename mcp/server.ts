// MCP server for El Baúl de los Jogos: people connect it to their own Claude or
// ChatGPT. The tools reuse the app's own logic in src/domain/ (catalog filters,
// recommender, play statistics), so answers match what the app shows.
//
// Tools never talk to Supabase directly: they ask a BaulData "port" for data.
// In production that port reads Supabase with the caller's token (mcp/supabase.ts),
// so the same RLS rules decide what each person can see; tests plug in fake data.
import { createMcpHandler, hostHeaderValidationResponse, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { filterGames } from '../src/domain/catalog';
import { groupKey, groupMembers, playGroupKey } from '../src/domain/groups';
import { recommend } from '../src/domain/recommend';
import { averageRating, playStats } from '../src/domain/stats';
import { formatDecimal, nameKey } from '../src/domain/text';
import type { Friend, Game, Group, Play } from '../src/domain/types';

export interface Account {
  id: string;
  email: string;
  nickname: string;
}

/** Everything the tools may read, already limited to what the caller is allowed to see. */
export interface BaulData {
  account(): Promise<Account>;
  collection(): Promise<{ games: Game[]; groups: Group[]; friends: Friend[] }>;
  plays(): Promise<Play[]>;
}

/** A readable error for the person, not a stack trace. */
export class BaulError extends Error {}

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;
const text = (value: string) => ({ content: [{ type: 'text' as const, text: value }] });

export function formatGame(game: Game): string {
  const facts = [
    game.players && `${game.players} jugadores`,
    game.duration && `${game.duration} min`,
    game.weight && `dureza ${game.weight}/5`,
    game.types.length && game.types.join(', '),
    game.locations.length && `en ${game.locations.join(', ')}`,
  ].filter(Boolean);
  return `- ${game.name}${facts.length ? ` (${facts.join('; ')})` : ''}${game.notes ? ` — ${game.notes}` : ''}`;
}

const countGames = (count: number) => (count === 1 ? '1 juego' : `${count} juegos`);

/** Finds a group by name, ignoring case and accents in spaces; explains the options when it isn't found. */
function findGroup(groups: Group[], name: string): Group {
  const wanted = nameKey(name);
  const group = groups.find(g => nameKey(g.name) === wanted) ?? groups.find(g => nameKey(g.name).includes(wanted));
  if (!group) {
    throw new BaulError(groups.length
      ? `No hay ningún grupo llamado «${name}». Grupos disponibles: ${groups.map(g => g.name).join(', ')}.`
      : 'Todavía no hay grupos. Se crean en la sección Comunidad de la app.');
  }
  return group;
}

/** The public site, where the connector's icon lives. */
const SITE = 'https://el-baul-de-los-jogos.vercel.app';

/** One MCP server per request: the tools close over that caller's data port. */
export function buildServer(data: BaulData): McpServer {
  const server = new McpServer(
    {
      name: 'el-baul-de-los-jogos',
      version: '0.2.0',
      title: 'El Baúl de los Jogos',
      websiteUrl: SITE,
      // Jogiño, shown by Claude or ChatGPT next to the connector.
      icons: [
        { src: `${SITE}/brand/jogino-icon.svg`, mimeType: 'image/svg+xml' },
        { src: `${SITE}/brand/jogino-icon-512.png`, mimeType: 'image/png', sizes: ['512x512'] },
        { src: `${SITE}/brand/jogino-icon-192.png`, mimeType: 'image/png', sizes: ['192x192'] },
      ],
    },
    {
      instructions:
        'Herramientas de El Baúl de los Jogos, la colección de juegos de mesa del usuario, sus grupos de amigos y sus partidas. ' +
        'Antes de recomendar, usa recommend_games (usa la misma lógica que la app). Los nombres de grupo salen de list_groups.',
    },
  );

  server.registerTool('who_am_i', {
    title: 'Mi cuenta',
    description: 'Dice con qué cuenta de El Baúl de los Jogos está conectado el usuario (apodo y correo).',
    annotations: READ_ONLY,
  }, async () => {
    const account = await data.account();
    return text(`Conectado como @${account.nickname} (${account.email}).`);
  });

  server.registerTool('list_games', {
    title: 'Mis juegos',
    description: 'Lista los juegos de mesa de la colección del usuario con jugadores, duración, dureza (1-5), estilos, lugar y notas. Se puede filtrar.',
    inputSchema: z.object({
      search: z.string().optional().describe('Texto a buscar en el nombre, los estilos o las notas.'),
      style: z.string().optional().describe('Estilo exacto, por ejemplo "Cooperativo" o "Fiesta".'),
      players: z.number().int().min(1).max(30).optional().describe('Solo juegos que admitan exactamente este número de personas.'),
    }),
    annotations: READ_ONLY,
  }, async ({ search, style, players }) => {
    const { games } = await data.collection();
    const list = filterGames(games, { search: search ?? '', type: style ?? '', players: players ?? 0, place: '' });
    return text(list.length ? `${countGames(list.length)}:\n${list.map(formatGame).join('\n')}` : 'No hay juegos que coincidan.');
  });

  server.registerTool('list_groups', {
    title: 'Mis grupos',
    description: 'Lista los grupos de amigos del usuario (propios y compartidos con él), con sus miembros y lo que les gusta.',
    annotations: READ_ONLY,
  }, async () => {
    const { groups, friends } = await data.collection();
    if (!groups.length) return text('Todavía no hay grupos.');
    return text(groups.map(group => {
      const members = groupMembers(group, friends).map(m => m.name);
      return `- ${group.name}${group._shared ? ' (compartido contigo)' : ''}: ${members.length ? members.join(', ') : 'sin miembros apuntados'}` +
        `${group.likes ? `. Les gusta: ${group.likes}` : ''}`;
    }).join('\n'));
  });

  server.registerTool('recommend_games', {
    title: 'Qué jugamos',
    description: 'Recomienda juegos de la colección para un plan, con la misma lógica que la app: personas, grupo (tiene en cuenta sus gustos, sus notas y lo que no han estrenado), estilo, dureza, duración y lugar.',
    inputSchema: z.object({
      players: z.number().int().min(1).max(30).optional().describe('Cuántas personas jugáis. Si se indica un grupo y no esto, se usan sus miembros más el usuario.'),
      group: z.string().optional().describe('Nombre de un grupo (ver list_groups).'),
      style: z.string().optional().describe('Tipo de plan, por ejemplo "Fiesta", "Cooperativo" o "Estrategia".'),
      difficulty: z.number().int().min(1).max(5).optional().describe('Dureza deseada de 1 (muy ligero) a 5 (muy duro).'),
      max_minutes: z.number().int().min(5).max(600).optional().describe('Duración máxima en minutos.'),
      place: z.string().optional().describe('Lugar donde se juega (los juegos que estén en otro sitio bajan).'),
    }),
    annotations: READ_ONLY,
  }, async ({ players, group: groupName, style, difficulty, max_minutes, place }) => {
    const [{ games, groups, friends }, plays, account] = await Promise.all([data.collection(), data.plays(), data.account()]);
    const group = groupName ? findGroup(groups, groupName) : undefined;
    const members = group ? groupMembers(group, friends) : [];
    const count = players ?? (members.length ? members.length + 1 : group?.size ?? 0);
    const groupGames = group ? playStats(plays.filter(p => playGroupKey(p) === groupKey(group, account.id))).games : undefined;
    const picks = recommend(games, { players: count, group, groupGames, mood: style ?? '', weight: difficulty ?? 0, duration: max_minutes ?? 0, place: place ?? '' });
    if (!picks.length) return text('No he encontrado una combinación clara. Prueba con otro número de personas o plan.');
    const heading = `Sugerencias${count ? ` para ${count} ${count === 1 ? 'persona' : 'personas'}` : ''}${group ? ` · ${group.name}` : ''}:`;
    return text(`${heading}\n${picks.map(p => formatGame(p.game) + (p.groupNote ? ` [${p.groupNote}]` : '')).join('\n')}`);
  });

  server.registerTool('play_stats', {
    title: 'Estadísticas de partidas',
    description: 'Resume las partidas registradas (de un grupo o de todas): cuántas, el juego más jugado, quién gana más, los mejor valorados y los juegos sin estrenar.',
    inputSchema: z.object({
      group: z.string().optional().describe('Nombre de un grupo (ver list_groups). Sin él, todas las partidas que el usuario puede ver.'),
    }),
    annotations: READ_ONLY,
  }, async ({ group: groupName }) => {
    const [{ games, groups }, allPlays, account] = await Promise.all([data.collection(), data.plays(), data.account()]);
    const group = groupName ? findGroup(groups, groupName) : undefined;
    const plays = group ? allPlays.filter(p => playGroupKey(p) === groupKey(group, account.id)) : allPlays;
    const where = group ? ` en ${group.name}` : '';
    if (!plays.length) return text(`Todavía no hay partidas registradas${where}.`);
    const stats = playStats(plays);
    const unplayed = games.filter(g => !stats.games.has(nameKey(g.name)));
    const lines = [
      `${plays.length} ${plays.length === 1 ? 'partida' : 'partidas'}${where}.`,
      stats.mostPlayed && `Más jugado: ${stats.mostPlayed.name} (${stats.mostPlayed.count} ${stats.mostPlayed.count === 1 ? 'vez' : 'veces'}).`,
      stats.winners.length && `Quién gana más: ${stats.winners.map(w => `${w.userId === account.id ? 'tú' : w.name} (${w.count})`).join(', ')}.`,
      stats.bestRated.length && `Mejor valorados: ${stats.bestRated.map(g => `${g.name} (${formatDecimal(g.avg)}/10)`).join(', ')}.`,
      unplayed.length && `Sin estrenar${where}: ${unplayed.length} (${unplayed.slice(0, 8).map(g => g.name).join(', ')}${unplayed.length > 8 ? '…' : ''}).`,
    ].filter(Boolean);
    const recent = plays.slice(0, 5).map(p => {
      const rated = p.play_players.filter(x => x.rating);
      const avg = averageRating({ name: '', count: 1, sum: rated.reduce((s, x) => s + (x.rating ?? 0), 0), ratings: rated.length, last: '' });
      const winners = p.play_players.filter(x => x.winner).map(x => (x.user_id === account.id ? 'tú' : x.name));
      return `- ${p.played_on}: ${p.game_name}${winners.length ? `, ganó ${winners.join(' y ')}` : ''}${avg != null ? `, nota media ${formatDecimal(avg)}` : ''}`;
    });
    return text(`${lines.join('\n')}\nÚltimas partidas:\n${recent.join('\n')}`);
  });

  return server;
}

export interface BaulHandlerOptions {
  /** Hostnames allowed in the Host header (protection against DNS rebinding). */
  allowedHosts: string[];
  /** The data port for a caller, given their bearer token. */
  dataFor: (token: string) => BaulData;
  /** Who issues the tokens: Supabase Auth's OAuth 2.1 server (…/auth/v1). */
  authorizationServer: string;
  /** Path of the MCP endpoint on this host (default /api/mcp). */
  mcpPath?: string;
  /** Checks a token before using it; an expired one gets a 401 so the client renews it. */
  verify?: (token: string) => Promise<boolean>;
}

const METADATA = '/.well-known/oauth-protected-resource';

/**
 * The OAuth "protected resource" description (RFC 9728). MCP clients such as Claude
 * read it after a 401 to learn who issues tokens for this server, then sign the
 * person in there (Supabase shows our consent page) and come back with a token.
 */
export const protectedResource = (origin: string, mcpPath: string, authorizationServer: string) => ({
  resource: origin + mcpPath,
  authorization_servers: [authorizationServer],
  bearer_methods_supported: ['header'],
  resource_name: 'El Baúl de los Jogos',
  resource_documentation: origin + '/inicio',
});

/** The public origin of a request (Vercel puts the real host in x-forwarded-* headers). */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? url.host;
  const protocol = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  return `${protocol}://${host}`;
}

const json = (status: number, body: object, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

/** The /api/mcp endpoint as a web-standard handler: Request in, Response out. */
export function createBaulHandler(options: BaulHandlerOptions): (request: Request) => Promise<Response> {
  const { allowedHosts, dataFor, authorizationServer, mcpPath = '/api/mcp', verify } = options;
  const mcp = createMcpHandler(({ authInfo }) => buildServer(dataFor(authInfo!.token)), { responseMode: 'json' });
  return async request => {
    const rejected = hostHeaderValidationResponse(request, allowedHosts);
    if (rejected) return rejected;
    const origin = requestOrigin(request);
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && (path === METADATA || path === METADATA + mcpPath)) {
      return json(200, protectedResource(origin, mcpPath, authorizationServer), { 'Access-Control-Allow-Origin': '*' });
    }
    // 401 says "sign in first" and points to the metadata above, which starts the OAuth flow.
    const challenge = (extra = '') => ({ 'WWW-Authenticate': `Bearer ${extra}resource_metadata="${origin}${METADATA}${mcpPath}"` });
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) return json(401, { error: 'Conecta tu cuenta de El Baúl de los Jogos.' }, challenge());
    if (verify && !(await verify(token))) {
      return json(401, { error: 'Tu sesión de El Baúl no es válida o ha caducado.' }, challenge('error="invalid_token", '));
    }
    return mcp.fetch(request, { authInfo: { token, clientId: 'el-baul-de-los-jogos', scopes: [] } });
  };
}

/** Hostnames of this deployment: production plus Vercel's own URLs for the current deployment. */
export function allowedHosts(env: Record<string, string | undefined> = process.env): string[] {
  return ['el-baul-de-los-jogos.vercel.app', 'localhost', '127.0.0.1',
    ...[env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter((h): h is string => !!h)];
}
