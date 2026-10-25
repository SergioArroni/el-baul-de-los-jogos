import type { Play, PlayPlayer } from '../domain/types';
import { requireClient } from './client';

export interface PlaysResult {
  plays: Play[];
  /** The plays tables do not exist yet (sql/community-plays.sql not run). */
  missing: boolean;
}

export async function loadPlays(): Promise<PlaysResult> {
  const { data, error } = await requireClient().from('plays').select('*,play_players(*)')
    .order('played_on', { ascending: false }).order('created_at', { ascending: false });
  if (error) {
    console.warn('Partidas no disponibles:', error.message);
    return { plays: [], missing: true };
  }
  return { plays: data as Play[], missing: false };
}

export type PlayRow = Pick<Play, 'game_name' | 'played_on' | 'place' | 'notes' | 'group_owner' | 'group_key' | 'group_name' | 'duration_minutes'>;

/** PGRST204: the duration column doesn't exist yet (sql/plays-duration.sql not run). */
const missingDuration = (error: { code?: string; message?: string } | null) => error?.code === 'PGRST204' && /duration_minutes/.test(error.message ?? '');
const withoutDuration = ({ duration_minutes: _, ...row }: PlayRow) => row;

/** A player in the form; `rowId` is set for players already saved. */
export interface PlayerDraft {
  rowId?: string;
  name: string;
  userId: string | null;
  points: number | null;
  winner: boolean;
  rating: number | null;
}

/**
 * Creates or updates a play and its players. Existing player rows are updated
 * one by one so other people's ratings are never overwritten; only the
 * current user's own rating is written.
 */
export async function savePlay(row: PlayRow, players: PlayerDraft[], me: string, existing?: Play): Promise<string> {
  const db = requireClient();
  let id = existing?.id;
  let created = false;
  try {
    if (existing) {
      let { error } = await db.from('plays').update(row).eq('id', existing.id);
      if (missingDuration(error)) ({ error } = await db.from('plays').update(withoutDuration(row)).eq('id', existing.id));
      if (error) throw error;
    } else {
      let { data, error } = await db.from('plays').insert(row).select('id').single();
      if (missingDuration(error)) ({ data, error } = await db.from('plays').insert(withoutDuration(row)).select('id').single());
      if (error || !data) throw error ?? new Error('No se pudo guardar la partida.');
      id = data.id as string;
      created = true;
    }
    const removed = (existing?.play_players ?? []).filter(old => !players.some(p => p.rowId === old.id)).map(old => old.id);
    if (removed.length) {
      const { error } = await db.from('play_players').delete().in('id', removed);
      if (error) throw error;
    }
    const updates = await Promise.all(players.filter(p => p.rowId).map(p =>
      db.from('play_players').update({
        name: p.name.slice(0, 60), points: p.points, winner: p.winner,
        ...(p.userId === me ? { rating: p.rating } : {}),
      }).eq('id', p.rowId!)));
    for (const result of updates) if (result.error) throw result.error;
    const inserts: Omit<PlayPlayer, 'id'>[] = players.filter(p => !p.rowId).map(p => ({
      play_id: id!, name: p.name.slice(0, 60), user_id: p.userId, points: p.points, winner: p.winner,
      rating: p.userId === me ? p.rating : null,
    }));
    if (inserts.length) {
      const { error } = await db.from('play_players').insert(inserts);
      if (error) throw error;
    }
    return id!;
  } catch (error) {
    // Don't leave a new play without players behind.
    if (created) await db.from('plays').delete().eq('id', id!);
    throw error;
  }
}

export async function deletePlay(id: string): Promise<void> {
  const { error } = await requireClient().from('plays').delete().eq('id', id);
  if (error) throw error;
}

/** Each participant rates the game for themselves through a database function. */
export async function ratePlay(id: string, rating: number | null): Promise<void> {
  const { error } = await requireClient().rpc('rate_play', { pid: id, value: rating });
  if (error) throw error;
}
