import { nameKey } from './text';
import type { Play, PlayPlayer } from './types';

export interface RankRow {
  name: string;
  /** Sum and number of ratings. */
  sum: number;
  count: number;
  /** Different people who rated it. */
  people: number;
}

export interface Ranked extends RankRow {
  average: number;
  /** Bayesian average: what the ranking sorts by. */
  score: number;
}

/** How many "average" ratings every game starts with, so one lucky 10 can't top the list. */
export const PRIOR_WEIGHT = 3;

/**
 * Sorts games by Bayesian average: each game's ratings are mixed with PRIOR_WEIGHT
 * imaginary ratings equal to the overall mean. A game needs several good ratings to
 * climb; with many ratings, its own average dominates.
 */
export function bayesianRanking(rows: RankRow[], priorWeight = PRIOR_WEIGHT): Ranked[] {
  const total = rows.reduce((sum, row) => sum + row.sum, 0);
  const count = rows.reduce((sum, row) => sum + row.count, 0);
  const mean = count ? total / count : 0;
  return rows
    .filter(row => row.count > 0)
    .map(row => ({ ...row, average: row.sum / row.count, score: (priorWeight * mean + row.sum) / (priorWeight + row.count) }))
    .sort((a, b) => b.score - a.score || b.count - a.count || a.name.localeCompare(b.name, 'es'));
}

/** Ratings per game from some plays, keeping only the players `keep` accepts. */
export function ratingsByGame(plays: Play[], keep: (player: PlayPlayer) => boolean = () => true): RankRow[] {
  const rows = new Map<string, RankRow & { who: Set<string> }>();
  for (const play of plays) {
    const key = nameKey(play.game_name);
    for (const player of play.play_players) {
      if (!player.rating || !keep(player)) continue;
      const row = rows.get(key) ?? { name: play.game_name.trim(), sum: 0, count: 0, people: 0, who: new Set<string>() };
      row.sum += player.rating;
      row.count++;
      row.who.add(player.user_id ?? 'n:' + nameKey(player.name));
      rows.set(key, row);
    }
  }
  return [...rows.values()].map(({ who, ...row }) => ({ ...row, people: who.size }));
}
