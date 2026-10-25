// The catalog cache in Supabase (sql/catalog.sql), written with the secret key from the
// server. Before that SQL is run the table doesn't exist: then it simply has nothing.
import { createClient } from '@supabase/supabase-js';
import type { CatalogCache, CatalogGame } from './bgg';

interface Row {
  bgg_id: number; name: string; alt_names: string[]; year: number | null; min_players: number | null; max_players: number | null;
  minutes: number | null; weight: number | null; categories: string[]; mechanics: string[]; image: string | null; thumbnail: string | null;
}

const toRow = (game: CatalogGame) => ({
  bgg_id: game.bggId, name: game.name, alt_names: game.altNames, search_text: [game.name, ...game.altNames].join(' ').toLowerCase(),
  year: game.year, min_players: game.minPlayers, max_players: game.maxPlayers, minutes: game.minutes, weight: game.weight,
  categories: game.categories, mechanics: game.mechanics, image: game.image, thumbnail: game.thumbnail, fetched_at: new Date().toISOString(),
});
const fromRow = (row: Row): CatalogGame => ({
  bggId: row.bgg_id, name: row.name, altNames: row.alt_names, year: row.year, minPlayers: row.min_players, maxPlayers: row.max_players,
  minutes: row.minutes, weight: row.weight == null ? null : Number(row.weight), categories: row.categories, mechanics: row.mechanics,
  image: row.image, thumbnail: row.thumbnail,
});
/** PGRST205 / 42P01: the table doesn't exist yet. */
const missing = (error: { code?: string } | null) => error?.code === 'PGRST205' || error?.code === '42P01';
const likeText = (text: string) => `%${text.toLowerCase().replace(/[\\%_]/g, char => '\\' + char)}%`;

export function supabaseCatalogCache(url: string, secretKey: string): CatalogCache {
  const db = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  return {
    async search(query) {
      const { data, error } = await db.from('catalog_games').select('bgg_id,name,year').ilike('search_text', likeText(query)).order('name').limit(10);
      if (missing(error)) return [];
      if (error) throw error;
      return data.map(row => ({ bggId: row.bgg_id, name: row.name, year: row.year }));
    },
    async get(bggId) {
      const { data, error } = await db.from('catalog_games').select('*').eq('bgg_id', bggId).maybeSingle();
      if (missing(error)) return null;
      if (error) throw error;
      return data ? fromRow(data as Row) : null;
    },
    async save(games) {
      const { error } = await db.from('catalog_games').upsert(games.map(toRow), { onConflict: 'bgg_id' });
      if (error && !missing(error)) throw error;
    },
  };
}
