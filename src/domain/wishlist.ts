import type { WishlistVote } from './types';

/** Each person has this many meeples to place on the games they want to buy next. */
export const MEEPLES = 3;

export const meeplesLeft = (votes: WishlistVote[], userId: string): number =>
  Math.max(0, MEEPLES - votes.filter(vote => vote.user_id === userId).length);

/** A steady colour per person, for meeples without a photo. */
const COLOURS = ['#c96f3d', '#245b45', '#3a86ff', '#9d4edd', '#e63946', '#e9b949', '#2a9d8f', '#6d6875'];
export function meepleColour(userId: string): string {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLOURS[hash % COLOURS.length];
}
