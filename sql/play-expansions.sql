-- Run once after catalog.sql (safe to run again). Which expansions each play used, so a
-- play of Scythe can say it was with El auge de Fenris. Up to 20 names per play.
alter table public.plays add column if not exists expansions text[] not null default '{}';
alter table public.plays drop constraint if exists plays_expansions_check;
alter table public.plays add constraint plays_expansions_check check (cardinality(expansions) <= 20 and char_length(array_to_string(expansions, '|')) <= 1300);
