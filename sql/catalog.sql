-- Run once after similar-taste.sql (safe to run again). Our copy of the BoardGameGeek
-- games people have looked up, so BGG is asked once per game and the catalog grows
-- with use. Everyone signed in can read it; only the server (secret key) writes.
create table if not exists public.catalog_games (
  bgg_id integer primary key,
  name text not null,
  alt_names text[] not null default '{}',
  search_text text not null default '',
  year integer,
  min_players integer,
  max_players integer,
  minutes integer,
  weight numeric(3, 2),
  categories text[] not null default '{}',
  mechanics text[] not null default '{}',
  image text,
  thumbnail text,
  fetched_at timestamptz not null default now()
);
alter table public.catalog_games enable row level security;
drop policy if exists "Signed-in users read the catalog" on public.catalog_games;
create policy "Signed-in users read the catalog" on public.catalog_games for select to authenticated using (true);
grant select on public.catalog_games to authenticated;
