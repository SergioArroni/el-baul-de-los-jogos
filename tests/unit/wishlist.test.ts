import { describe, expect, it } from 'vitest';
import { meepleColour, meeplesLeft, MEEPLES } from '../../src/domain/wishlist';

describe('meeples', () => {
  const votes = [{ game_id: 'g1', user_id: 'a' }, { game_id: 'g2', user_id: 'a' }, { game_id: 'g1', user_id: 'b' }];

  it('counts the meeples each person still has', () => {
    expect(MEEPLES).toBe(3);
    expect(meeplesLeft(votes, 'a')).toBe(1);
    expect(meeplesLeft(votes, 'b')).toBe(2);
    expect(meeplesLeft(votes, 'c')).toBe(3);
    expect(meeplesLeft([...votes, ...votes], 'a')).toBe(0);
  });

  it('gives each person the same colour every time', () => {
    expect(meepleColour('abc')).toBe(meepleColour('abc'));
    expect(meepleColour('abc')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
