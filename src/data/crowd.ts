import { nameKey } from '../domain/text';
import type { CrowdPick } from '../domain/recommend';
import { requireClient } from './client';

/**
 * Games that people with tastes like yours rated well (sql/similar-taste.sql), by name
 * key. Anonymous: only the estimate and how many similar people back it. Null if the
 * database function isn't there yet.
 */
export async function loadSimilarTaste(): Promise<Map<string, CrowdPick> | null> {
  const { data, error } = await requireClient().rpc('similar_taste_games');
  if (error?.code === 'PGRST202') return null;
  if (error) throw error;
  const rows = data as { game_name: string; predicted: number; neighbours: number }[];
  return new Map(rows.map(row => [nameKey(row.game_name), {
    name: row.game_name, predicted: Math.max(1, Math.min(10, Number(row.predicted))), neighbours: Number(row.neighbours),
  }]));
}
