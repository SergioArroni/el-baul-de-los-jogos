import { describe, expect, it } from 'vitest';
import { canSee, profileHighlights } from '../../src/domain/profiles';
import type { PersonGameStat } from '../../src/domain/types';

const stat = (game_name: string, over: Partial<PersonGameStat> = {}): PersonGameStat =>
  ({ game_name, plays: 1, wins: 0, losses: 0, rating: null, last_played: '2026-10-01', ...over });

describe('canSee', () => {
  const stranger = { isOwner: false, isFriend: false };
  const friend = { isOwner: false, isFriend: true };
  const owner = { isOwner: true, isFriend: false };

  it('public is for everyone, private only for the owner', () => {
    expect(canSee('public', stranger)).toBe(true);
    expect(canSee('private', friend)).toBe(false);
    expect(canSee('private', owner)).toBe(true);
  });

  it('"friends" means the people the owner added', () => {
    expect(canSee('friends', friend)).toBe(true);
    expect(canSee('friends', stranger)).toBe(false);
    expect(canSee('friends', owner)).toBe(true);
  });
});

describe('profileHighlights', () => {
  it('sums plays and wins and picks each highlight', () => {
    const result = profileHighlights([
      stat('Catan', { plays: 6, wins: 1, losses: 5, rating: 7 }),
      stat('Azul', { plays: 4, wins: 3, losses: 1, rating: 9 }),
      stat('Hanabi', { plays: 2, wins: 2, rating: 6 }),
    ]);
    expect(result.plays).toBe(12);
    expect(result.wins).toBe(6);
    expect(result.winRate).toBe(0.5);
    expect(result.mostPlayed?.game_name).toBe('Catan');
    expect(result.favourite?.game_name).toBe('Azul');
    expect(result.mostWins?.game_name).toBe('Azul');
    expect(result.mostLosses?.game_name).toBe('Catan');
  });

  it('only counts the best win rate after 3 plays', () => {
    const result = profileHighlights([stat('Hanabi', { plays: 2, wins: 2 }), stat('Azul', { plays: 3, wins: 2, losses: 1 })]);
    expect(result.best?.game_name).toBe('Azul');
    expect(result.best?.winRate).toBeCloseTo(2 / 3);
    expect(profileHighlights([stat('Hanabi', { plays: 2, wins: 2 })]).best).toBeUndefined();
  });

  it('breaks ties by more plays, then by name', () => {
    const result = profileHighlights([stat('Zombis', { plays: 2, rating: 8 }), stat('Azul', { plays: 2, rating: 8 }), stat('Catan', { plays: 5, rating: 8 })]);
    expect(result.favourite?.game_name).toBe('Catan');
    expect(profileHighlights([stat('Zombis', { plays: 2 }), stat('Azul', { plays: 2 })]).mostPlayed?.game_name).toBe('Azul');
  });

  it('leaves out what has no data', () => {
    const result = profileHighlights([stat('Catan', { plays: 3 })]);
    expect(result.favourite).toBeUndefined();
    expect(result.mostWins).toBeUndefined();
    expect(result.mostLosses).toBeUndefined();
    expect(result.best).toBeUndefined();
    expect(profileHighlights([]).winRate).toBeNull();
  });
});
