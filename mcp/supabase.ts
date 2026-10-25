// The production BaulData port: reads Supabase *as the caller* (their token goes in
// every request), so RLS returns exactly what they may see — the same as in the app.
import { createClient } from '@supabase/supabase-js';
import { normalizeGamePlace, type StoredGame } from '../src/domain/seed';
import type { Friend, Group, Play } from '../src/domain/types';
import { BaulError, type Account, type BaulData } from './server';

// Public values (the same ones the web app ships); env vars can override them.
const DEFAULT_URL = 'https://ibllpkczcsjxqzszwiby.supabase.co';
const DEFAULT_KEY = 'sb_publishable_Q1uBq8AgBRhSLRfYIqW7lA_zhwj6KeR';

/** Stored games may miss fields (old saves, hand-made rows); give the domain logic complete objects. */
const completeGame = (data: Partial<StoredGame>) => normalizeGamePlace({
  id: data.id ?? '', name: data.name ?? '', players: data.players ?? '', types: Array.isArray(data.types) ? data.types : [],
  weight: data.weight ?? null, duration: data.duration ?? null, location: data.location, locations: data.locations, notes: data.notes ?? '',
});

const SESSION_EXPIRED = 'Tu sesión de El Baúl no es válida o ha caducado. Vuelve a conectar la cuenta.';

export function supabaseData(token: string, env: Record<string, string | undefined> = process.env): BaulData {
  const db = createClient(env.SUPABASE_URL ?? DEFAULT_URL, env.SUPABASE_PUBLISHABLE_KEY ?? DEFAULT_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const fail = (error: { message?: string; status?: number; code?: string }): never => {
    if (error.status === 401 || error.code === 'PGRST301' || /jwt/i.test(error.message ?? '')) throw new BaulError(SESSION_EXPIRED);
    throw new BaulError('No se pudo leer El Baúl ahora mismo. Inténtalo de nuevo en un momento.');
  };

  // Each request builds a fresh port, so caching inside it only lasts one tool call.
  let account: Promise<Account> | undefined;
  return {
    account: () => (account ??= (async () => {
      const { data, error } = await db.auth.getUser(token);
      if (error || !data.user) throw new BaulError(SESSION_EXPIRED);
      const profile = await db.from('profiles').select('nickname').eq('user_id', data.user.id).maybeSingle();
      return { id: data.user.id, email: data.user.email ?? '', nickname: profile.data?.nickname ?? '(sin apodo)' };
    })()),

    async collection() {
      const me = await this.account();
      const [games, groups, friends] = await Promise.all([
        // Only their own games: RLS also returns other people's visible collections.
        db.from('games').select('data').eq('user_id', me.id),
        db.from('groups').select('user_id,data'),
        db.from('friends').select('data'),
      ]);
      for (const result of [games, groups, friends]) if (result.error) fail(result.error);
      return {
        games: (games.data ?? []).map(row => completeGame(row.data)),
        // RLS also returns groups other people shared with this account; mark them like the app does.
        groups: (groups.data ?? []).map(row => (row.user_id === me.id ? row.data : { ...row.data, _shared: true, _ownerId: row.user_id }) as Group),
        friends: (friends.data ?? []).map(row => row.data as Friend),
      };
    },

    async plays() {
      const { data, error } = await db.from('plays').select('*,play_players(*)')
        .order('played_on', { ascending: false }).order('created_at', { ascending: false });
      if (error) fail(error);
      return (data ?? []) as Play[];
    },
  };
}
