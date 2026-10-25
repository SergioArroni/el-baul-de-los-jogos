import { nameKey } from './text';
import type { Game, Play } from './types';

/**
 * What a person (or a group) seems to like, learnt from the ratings in their plays.
 * This is "content-based" recommendation: games are described by their styles and
 * weight, and a good rating makes similar games more likely to be suggested.
 */
export interface Taste {
  /** Affinity per style: average of (rating − 5.5) over the rated games with that style. */
  styles: Map<string, number>;
  /** Average weight of the games rated 7 or more; null without such games. */
  weight: number | null;
  /** The lowest rating anyone counted gave each game, by name key. */
  worst: Map<string, number>;
  /** The last time each game was played, by name key (ISO date). */
  last: Map<string, string>;
}

/** Middle of the 1–10 scale: above it, a rating says "I liked it". */
const NEUTRAL = 5.5;

/**
 * `people`: whose ratings count (your account, or the group's members). Without it,
 * every rating in the plays counts.
 */
export function learnTaste(plays: Play[], games: Game[], people?: Set<string> | null): Taste {
  const ratings = new Map<string, number[]>();
  const last = new Map<string, string>();
  for (const play of plays) {
    const key = nameKey(play.game_name);
    if (!last.has(key) || play.played_on > last.get(key)!) last.set(key, play.played_on);
    for (const player of play.play_players) {
      if (!player.rating || (people && (!player.user_id || !people.has(player.user_id)))) continue;
      ratings.set(key, [...(ratings.get(key) ?? []), player.rating]);
    }
  }

  const byKey = new Map(games.map(game => [nameKey(game.name), game]));
  const styleSums = new Map<string, { sum: number; count: number }>();
  const liked: number[] = [];
  const worst = new Map<string, number>();
  for (const [key, list] of ratings) {
    worst.set(key, Math.min(...list));
    const game = byKey.get(key);
    if (!game) continue;
    const average = list.reduce((a, b) => a + b, 0) / list.length;
    for (const style of game.types) {
      const entry = styleSums.get(style) ?? { sum: 0, count: 0 };
      entry.sum += average - NEUTRAL;
      entry.count++;
      styleSums.set(style, entry);
    }
    if (average >= 7 && game.weight) liked.push(game.weight);
  }
  return {
    styles: new Map([...styleSums].map(([style, { sum, count }]) => [style, sum / count])),
    weight: liked.length ? liked.reduce((a, b) => a + b, 0) / liked.length : null,
    worst,
    last,
  };
}

/** Whole months between two ISO dates. */
export function monthsBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() - (b.getDate() < a.getDate() ? 1 : 0);
}
