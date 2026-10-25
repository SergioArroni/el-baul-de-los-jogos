// Other people's profiles. What comes back is decided by Supabase (sql/profiles-privacy.sql):
// a hidden collection simply returns no games, and hidden statistics no rows.
import { byName } from '../domain/catalog';
import { normalizeGamePlace, type StoredGame } from '../domain/seed';
import type { Game, PersonGameStat, Visibility } from '../domain/types';
import { requireClient } from './client';

export interface PersonSummary {
  userId: string;
  nickname: string;
}

export interface PersonProfile extends PersonSummary {
  collection: Visibility;
  stats: Visibility;
  /** They added the viewer as a friend, so "Solo amigos" includes the viewer. */
  addedMe: boolean;
  /** False until sql/profiles-privacy.sql has been run. */
  privacyReady: boolean;
}

/** Escapes the LIKE wildcards, so "a_b" looks for a real underscore. */
const contains = (text: string): string => `%${text.replace(/[\\%_]/g, char => '\\' + char)}%`;

/** Accounts whose nickname contains the text. Every signed-in user can see nicknames. */
export async function searchPeople(text: string): Promise<PersonSummary[]> {
  const query = text.trim();
  if (query.length < 2) return [];
  const { data, error } = await requireClient().from('profiles')
    .select('user_id,nickname').ilike('nickname', contains(query)).order('nickname').limit(20);
  if (error) throw error;
  return data.map(row => ({ userId: row.user_id, nickname: row.nickname }));
}

export async function loadPersonProfile(userId: string, viewerId: string): Promise<PersonProfile> {
  const db = requireClient();
  const [withPrivacy, link] = await Promise.all([
    db.from('profiles').select('nickname,collection_visibility,stats_visibility').eq('user_id', userId).maybeSingle(),
    db.from('friend_links').select('owner_id').eq('owner_id', userId).eq('friend_id', viewerId).maybeSingle(),
  ]);
  let profile = withPrivacy;
  // Before sql/profiles-privacy.sql the visibility columns don't exist yet.
  if (profile.error) profile = await db.from('profiles').select('nickname').eq('user_id', userId).maybeSingle() as typeof profile;
  if (profile.error) throw profile.error;
  if (!profile.data) throw new Error('No existe esa cuenta.');
  return {
    userId,
    nickname: profile.data.nickname,
    collection: profile.data.collection_visibility ?? 'friends',
    stats: profile.data.stats_visibility ?? 'friends',
    addedMe: !!link.data,
    privacyReady: !withPrivacy.error,
  };
}

export async function loadPersonCollection(userId: string): Promise<Game[]> {
  const { data, error } = await requireClient().from('games').select('data').eq('user_id', userId);
  if (error) throw error;
  return data.map(row => normalizeGamePlace(row.data as StoredGame)).sort(byName);
}

/** Per-game summary of their plays; null when the database function doesn't exist yet. */
export async function loadPersonStats(userId: string): Promise<PersonGameStat[] | null> {
  const { data, error } = await requireClient().rpc('profile_game_stats', { target: userId });
  if (error?.code === 'PGRST202') return null;
  if (error) throw error;
  return (data as PersonGameStat[]).map(row => ({
    ...row,
    plays: Number(row.plays),
    wins: Number(row.wins),
    losses: Number(row.losses),
    rating: row.rating == null ? null : Number(row.rating),
  }));
}
