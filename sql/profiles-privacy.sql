-- Run once after wishlist-hype.sql (safe to run again). Each person decides who sees
-- their collection and their play statistics: everyone, only the people they added
-- as friends, or nobody. The database enforces it, not the app.
alter table public.profiles add column if not exists collection_visibility text not null default 'friends';
alter table public.profiles add column if not exists stats_visibility text not null default 'friends';
alter table public.profiles drop constraint if exists profiles_visibility_check;
alter table public.profiles add constraint profiles_visibility_check check (
  collection_visibility in ('public', 'friends', 'private') and stats_visibility in ('public', 'friends', 'private'));

-- "Friend" means: the target added the viewer (friend_links row target → viewer).
create or replace function public.can_see(target uuid, level text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    target = auth.uid()
    or level = 'public'
    or (level = 'friends' and exists (
      select 1 from public.friend_links f where f.owner_id = target and f.friend_id = auth.uid())));
$$;

create or replace function public.collection_visible(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_see(target, coalesce(
    (select p.collection_visibility from public.profiles p where p.user_id = target), 'friends'));
$$;

-- Read-only access to other people's games. Writing stays limited to the owner
-- by the existing "Users manage their own games" policy.
drop policy if exists "Visible collections" on public.games;
create policy "Visible collections" on public.games
  for select to authenticated using (public.collection_visible(user_id));

-- Per-game summary of someone's plays (never the plays themselves, which stay
-- visible only to their group and players), if their statistics are visible.
create or replace function public.profile_game_stats(target uuid)
returns table (game_name text, plays bigint, wins bigint, losses bigint, rating numeric, last_played date)
language sql stable security definer set search_path = public as $$
  with mine as (
    select btrim(p.game_name) as name, p.played_on, me.winner, me.rating,
           (not me.winner and exists (
             select 1 from public.play_players w where w.play_id = p.id and w.winner)) as lost
    from public.play_players me
    join public.plays p on p.id = me.play_id
    where me.user_id = target
      and public.can_see(target, coalesce(
        (select pr.stats_visibility from public.profiles pr where pr.user_id = target), 'friends'))
  )
  select min(name), count(*), count(*) filter (where winner), count(*) filter (where lost),
         round(avg(rating), 2), max(played_on)
  from mine
  group by lower(name);
$$;

revoke execute on function public.can_see(uuid, text) from public;
revoke execute on function public.collection_visible(uuid) from public;
revoke execute on function public.profile_game_stats(uuid) from public;
grant execute on function public.can_see(uuid, text) to authenticated;
grant execute on function public.collection_visible(uuid) to authenticated;
grant execute on function public.profile_game_stats(uuid) to authenticated;
