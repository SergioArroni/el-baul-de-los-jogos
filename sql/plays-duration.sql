-- Run once after wishlist-meeples.sql (safe to run again). How long each play lasted,
-- to compare the real length of a game with the one on its box.
alter table public.plays add column if not exists duration_minutes integer;
alter table public.plays drop constraint if exists plays_duration_check;
alter table public.plays add constraint plays_duration_check check (duration_minutes is null or duration_minutes between 1 and 1440);
