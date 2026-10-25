// Vercel function /api/catalog: ?q=… searches the BGG catalog, ?id=… gives one game ready
// for the form. Only for signed-in people (it spends our BGG quota). BGG_TOKEN is the
// application token from BoardGameGeek; without it, only games already cached are found.
import { catalogGame, searchCatalog, toGameDraft } from '../catalog/bgg';
import { supabaseCatalogCache } from '../catalog/supabase';
import { verifyToken } from '../mcp/supabase';

const APP_ORIGINS = ['https://localhost', 'capacitor://localhost'];

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  return APP_ORIGINS.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Authorization', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
    : {};
}

const json = (request: Request, status: number, body: object) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...corsHeaders(request) } });

export const OPTIONS = (request: Request): Response => new Response(null, { status: 204, headers: corsHeaders(request) });

export async function GET(request: Request): Promise<Response> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || !(await verifyToken(token))) return json(request, 401, { error: 'Inicia sesión para continuar.' });
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, BGG_TOKEN } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return json(request, 503, { error: 'El catálogo no está configurado en el servidor.' });

  const deps = { fetch, token: BGG_TOKEN, cache: supabaseCatalogCache(SUPABASE_URL, SUPABASE_SECRET_KEY) };
  const url = new URL(request.url);
  try {
    const id = Number(url.searchParams.get('id'));
    if (id > 0) {
      const game = await catalogGame(id, deps);
      return game ? json(request, 200, { game: toGameDraft(game) }) : json(request, 404, { error: 'No se ha encontrado ese juego.' });
    }
    return json(request, 200, { hits: await searchCatalog(url.searchParams.get('q') ?? '', deps) });
  } catch (error) {
    console.error('catalog', error);
    return json(request, 502, { error: 'El catálogo no responde ahora mismo.' });
  }
}
