import { supports } from './players';
import type { Game } from './types';

export interface RandomFilters {
  /** '' = anywhere. */
  place: string;
  /** 0 = any number of players. */
  players: number;
  /** 0 = no limit. Games without a duration are allowed. */
  maxMinutes: number;
}

/** The games that fit the place, the number of players and the time you have. */
export const randomCandidates = (games: Game[], filters: RandomFilters): Game[] =>
  games.filter(game =>
    (!filters.place || game.locations.includes(filters.place)) &&
    supports(game, filters.players) &&
    (!filters.maxMinutes || !game.duration || game.duration <= filters.maxMinutes));

/**
 * Draws a game like from a shuffled deck: no repeats until every candidate has come
 * out once. `seen` keeps the ids already drawn and is reset when the deck runs out.
 */
export function drawGame(pool: Game[], seen: Set<string>, random: () => number = Math.random): Game | null {
  if (!pool.length) return null;
  let left = pool.filter(game => !seen.has(game.id));
  if (!left.length) {
    seen.clear();
    left = pool;
  }
  const pick = left[Math.floor(random() * left.length)];
  seen.add(pick.id);
  return pick;
}
