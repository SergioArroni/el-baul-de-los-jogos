import type { WishlistGame, WishlistVote } from '../domain/types';
import { requireClient } from './client';

export async function loadWishlist(): Promise<{ games: WishlistGame[]; votes: WishlistVote[] }> {
  const db = requireClient();
  const [games, votes] = await Promise.all([
    db.from('wishlist_games').select('*').order('created_at', { ascending: false }),
    db.from('wishlist_votes').select('game_id,user_id'),
  ]);
  if (games.error) throw games.error;
  if (votes.error) throw votes.error;
  return { games: games.data, votes: votes.data };
}

export type WishlistDraft = Omit<WishlistGame, 'id' | 'created_at'>;

export async function proposeGame(game: WishlistDraft): Promise<void> {
  const db = requireClient();
  let { error } = await db.from('wishlist_games').insert(game);
  // PGRST204: the hype column doesn't exist yet (sql/wishlist-hype.sql not run), so save without it.
  if (error?.code === 'PGRST204' && 'hype' in game) {
    const { hype: _, ...rest } = game;
    ({ error } = await db.from('wishlist_games').insert(rest));
  }
  if (error) throw error;
}

export async function deleteProposal(id: string, userId: string): Promise<void> {
  const { error } = await requireClient().from('wishlist_games').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

/** Places or takes back your meeple on a proposal (the database allows 3 per person). */
export async function setMeeple(gameId: string, userId: string, give: boolean): Promise<void> {
  const db = requireClient();
  const { error } = give
    ? await db.from('wishlist_votes').insert({ game_id: gameId, user_id: userId })
    : await db.from('wishlist_votes').delete().eq('game_id', gameId).eq('user_id', userId);
  if (error) throw error;
}
