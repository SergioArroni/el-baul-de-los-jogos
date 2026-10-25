-- Run once after plays-duration.sql (safe to run again). The global ranking: ratings of
-- every account, but only as anonymous totals, and only for games rated by at least 3
-- different people, so nobody's rating can be singled out.
create or replace function public.game_ranking()
returns table (game_name text, rating_sum bigint, ratings bigint, raters bigint)
language sql stable security definer set search_path = public as $$
  select min(btrim(p.game_name)), sum(pp.rating), count(pp.rating), count(distinct pp.user_id)
  from public.play_players pp
  join public.plays p on p.id = pp.play_id
  where pp.rating is not null and pp.user_id is not null and auth.uid() is not null
  group by lower(btrim(p.game_name))
  having count(distinct pp.user_id) >= 3;
$$;

revoke execute on function public.game_ranking() from public, anon;
grant execute on function public.game_ranking() to authenticated;
