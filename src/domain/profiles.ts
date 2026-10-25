import type { PersonGameStat, Visibility } from './types';

/**
 * Same rule as public.can_see() in sql/profiles-privacy.sql. The database is what
 * enforces it; the app only uses it to explain why something is hidden.
 */
export function canSee(level: Visibility, viewer: { isOwner: boolean; isFriend: boolean }): boolean {
  return viewer.isOwner || level === 'public' || (level === 'friends' && viewer.isFriend);
}

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: 'Pública',
  friends: 'Solo mis amigos',
  private: 'Privada',
};

/** A best win rate only means something after a few plays. */
export const MIN_PLAYS_FOR_WIN_RATE = 3;

export interface ProfileHighlights {
  plays: number;
  wins: number;
  /** 0–1, or null without plays. */
  winRate: number | null;
  mostPlayed?: PersonGameStat;
  favourite?: PersonGameStat;
  best?: PersonGameStat & { winRate: number };
  mostWins?: PersonGameStat;
  mostLosses?: PersonGameStat;
}

/** Picks the first game by a score, ties broken by more plays and then by name. */
function top(stats: PersonGameStat[], score: (stat: PersonGameStat) => number): PersonGameStat | undefined {
  return [...stats].sort((a, b) => score(b) - score(a) || b.plays - a.plays || a.game_name.localeCompare(b.game_name, 'es'))[0];
}

/** The headline facts of a profile, from the per-game summary of their plays. */
export function profileHighlights(stats: PersonGameStat[]): ProfileHighlights {
  const plays = stats.reduce((sum, stat) => sum + stat.plays, 0);
  const wins = stats.reduce((sum, stat) => sum + stat.wins, 0);
  const rated = stats.filter(stat => stat.rating != null);
  const withWins = stats.filter(stat => stat.wins > 0);
  const withLosses = stats.filter(stat => stat.losses > 0);
  const regular = stats.filter(stat => stat.plays >= MIN_PLAYS_FOR_WIN_RATE);
  const best = top(regular, stat => stat.wins / stat.plays);
  return {
    plays,
    wins,
    winRate: plays ? wins / plays : null,
    mostPlayed: top(stats, stat => stat.plays),
    favourite: top(rated, stat => stat.rating ?? 0),
    best: best && best.wins ? { ...best, winRate: best.wins / best.plays } : undefined,
    mostWins: top(withWins, stat => stat.wins),
    mostLosses: top(withLosses, stat => stat.losses),
  };
}
