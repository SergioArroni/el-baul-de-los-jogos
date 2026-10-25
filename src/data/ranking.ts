import type { RankRow } from '../domain/ranking';
import { requireClient } from './client';

/** Anonymous totals of every account's ratings (sql/ranking.sql); null if not set up yet. */
export async function loadGlobalRanking(): Promise<RankRow[] | null> {
  const { data, error } = await requireClient().rpc('game_ranking');
  if (error?.code === 'PGRST202') return null;
  if (error) throw error;
  return (data as { game_name: string; rating_sum: number; ratings: number; raters: number }[])
    .map(row => ({ name: row.game_name, sum: Number(row.rating_sum), count: Number(row.ratings), people: Number(row.raters) }));
}
