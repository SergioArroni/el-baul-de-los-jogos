// Shapes of the data the app works with. Rows stored as JSON in Supabase
// (games, groups, places, friends) keep the field names the old app used.

export interface Game {
  id: string;
  name: string;
  players: string;
  types: string[];
  weight: number | null;
  duration: number | null;
  /** Places with a copy of the game: it can be in several houses. */
  locations: string[];
  /** BoardGameGeek id, when it was filled in from the catalog. */
  bggId?: number;
  notes: string;
}

export interface Place {
  id: string;
  name: string;
}

export interface Friend {
  id: string;
  name: string;
  /** Linked app account. */
  userId?: string;
  nickname?: string;
  /** Pending invitation: suggested nickname and when it was sent. */
  invite?: string;
  invitedAt?: string;
  /** Legacy pending invitation by email. */
  email?: string;
}

export interface GroupMember {
  name: string;
  userId: string | null;
}

export interface Group {
  id: string;
  name: string;
  size: number | null;
  friendIds: string[];
  likes: string;
  notes: string;
  /** Snapshot of members, saved so people the group is shared with can see them. */
  members?: GroupMember[];
  /** Set on groups other accounts shared with the current user. */
  _shared?: boolean;
  _ownerId?: string;
}

export interface PlayPlayer {
  id: string;
  play_id: string;
  name: string;
  user_id: string | null;
  points: number | null;
  winner: boolean;
  rating: number | null;
}

export interface Play {
  id: string;
  owner_id: string;
  group_owner: string | null;
  group_key: string | null;
  group_name: string | null;
  game_name: string;
  played_on: string;
  place: string | null;
  notes: string | null;
  /** How long it lasted. Missing in old plays and before sql/plays-duration.sql. */
  duration_minutes?: number | null;
  created_at: string;
  play_players: PlayPlayer[];
}

export interface WishlistGame {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description: string;
  price: number | null;
  publisher: string | null;
  players: string | null;
  duration: string | null;
  notes: string | null;
  /** How much the proposer feels like playing it. Missing before sql/wishlist-hype.sql. */
  hype?: WishlistHype | null;
  created_at: string;
}

export type WishlistHype = 'culo' | 'le-daba' | 'y-si-si';

export interface WishlistVote {
  game_id: string;
  user_id: string;
}

export interface Person {
  nickname: string;
  avatarUrl: string;
}

/** Who can see a person's collection or statistics. "friends" = the people they added. */
export type Visibility = 'public' | 'friends' | 'private';

/** One game in someone's play history, summarised by the database (sql/profiles-privacy.sql). */
export interface PersonGameStat {
  game_name: string;
  plays: number;
  wins: number;
  losses: number;
  /** Average of the ratings this person gave; null if they never rated it. */
  rating: number | null;
  last_played: string;
}

export interface FriendRequest {
  owner_id: string;
}
