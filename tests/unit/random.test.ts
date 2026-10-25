import { describe, expect, it } from 'vitest';
import { drawGame, randomCandidates } from '../../src/domain/random';
import type { Game } from '../../src/domain/types';

const game = (id: string, over: Partial<Game> = {}): Game =>
  ({ id, name: id, players: '2–4', types: [], weight: 2, duration: 30, locations: ['Casa Lu'], notes: '', ...over });

describe('random game', () => {
  const games = [
    game('a'),
    game('b', { locations: ['Casa Enzo', 'Casa Lu'], duration: 90 }),
    game('c', { locations: ['Casa Enzo'], players: '5–10' }),
    game('d', { duration: null }),
  ];

  it('keeps the games that fit the place, the players and the time', () => {
    expect(randomCandidates(games, { place: '', players: 0, maxMinutes: 0 })).toHaveLength(4);
    expect(randomCandidates(games, { place: 'Casa Enzo', players: 0, maxMinutes: 0 }).map(g => g.id)).toEqual(['b', 'c']);
    expect(randomCandidates(games, { place: '', players: 6, maxMinutes: 0 }).map(g => g.id)).toEqual(['c']);
    expect(randomCandidates(games, { place: 'Casa Lu', players: 0, maxMinutes: 45 }).map(g => g.id)).toEqual(['a', 'd']);
  });

  it('does not repeat until every game has come out', () => {
    const seen = new Set<string>();
    const drawn = [0, 1, 2].map(() => drawGame(games.slice(0, 3), seen, () => 0)?.id);
    expect(new Set(drawn).size).toBe(3);
    expect(drawGame(games.slice(0, 3), seen, () => 0)).not.toBeNull();
    expect(seen.size).toBe(1);
    expect(drawGame([], seen)).toBeNull();
  });
});
