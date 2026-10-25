import { describe, expect, it } from 'vitest';
import { bayesianRanking, ratingsByGame } from '../../src/domain/ranking';
import type { Play } from '../../src/domain/types';

const play = (game_name: string, ratings: [string | null, number | null][]): Play => ({
  id: game_name, owner_id: 'u', group_owner: null, group_key: null, group_name: null, game_name, played_on: '2026-10-01',
  place: null, notes: null, created_at: '',
  play_players: ratings.map(([user, rating], i) => ({ id: String(i), play_id: game_name, name: user ?? 'Invitado', user_id: user, points: null, winner: false, rating })),
});

describe('ranking', () => {
  it('does not let a single 10 beat many nines', () => {
    const ranked = bayesianRanking([
      { name: 'Suerte', sum: 10, count: 1, people: 1 },
      { name: 'Clásico', sum: 9 * 50, count: 50, people: 20 },
      { name: 'Flojo', sum: 4 * 10, count: 10, people: 5 },
    ]);
    expect(ranked.map(r => r.name)).toEqual(['Clásico', 'Suerte', 'Flojo']);
    expect(ranked[0].average).toBe(9);
  });

  it('adds up ratings per game, ignoring case and unrated players', () => {
    const rows = ratingsByGame([play('Azul', [['a', 8], ['b', 6], ['c', null]]), play('azul ', [['a', 10]]), play('Catan', [[null, 7]])]);
    expect(rows).toEqual([
      { name: 'Azul', sum: 24, count: 3, people: 2 },
      { name: 'Catan', sum: 7, count: 1, people: 1 },
    ]);
    expect(ratingsByGame([play('Azul', [['a', 8], ['b', 6]])], player => player.user_id === 'a')).toEqual([{ name: 'Azul', sum: 8, count: 1, people: 1 }]);
  });
});
