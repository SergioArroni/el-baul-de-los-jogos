-- Run once after google-login.sql (safe to run again). Collaborative recommendations:
-- "people with tastes like yours loved…". Only anonymous results, and only games backed
-- by at least 3 similar people; nobody's ratings or identity are returned.
create or replace function public.similar_taste_games()
returns table (game_name text, predicted numeric, neighbours bigint)
language sql stable security definer set search_path = public as $$
  -- One rating per person and game (their average if they rated it several times).
  with ratings as (
    select pp.user_id as person, lower(btrim(p.game_name)) as game, min(btrim(p.game_name)) as name, avg(pp.rating)::numeric as rating
    from public.play_players pp
    join public.plays p on p.id = pp.play_id
    where pp.rating is not null and pp.user_id is not null and auth.uid() is not null
    group by pp.user_id, lower(btrim(p.game_name))
  ),
  mine as (select game, rating from ratings where person = auth.uid()),
  means as (select person, avg(rating) as mean from ratings group by person),
  -- How close each person's ratings are to yours (1 = identical, 0 = opposite), on at least 2 shared games.
  alike as (
    select r.person, 1 - avg(abs(r.rating - m.rating)) / 9 as closeness
    from ratings r
    join mine m on m.game = r.game
    where r.person <> auth.uid()
    group by r.person
    having count(*) >= 2
  )
  -- Your average plus how much above their own average similar people rate each game.
  select min(r.name),
         round((select coalesce(avg(rating), 5.5) from mine) + sum(s.closeness * (r.rating - mn.mean)) / sum(s.closeness), 2),
         count(*)
  from ratings r
  join alike s on s.person = r.person
  join means mn on mn.person = r.person
  where s.closeness >= 0.6 and r.game not in (select game from mine)
  group by r.game
  having count(*) >= 3
  order by 2 desc
  limit 30;
$$;

revoke execute on function public.similar_taste_games() from public, anon;
grant execute on function public.similar_taste_games() to authenticated;
