-- Run once after profiles-privacy.sql (safe to run again). Votes in "Por comprar" are
-- now meeples: each person has 3. Someone who already had more keeps them, but can't
-- place another until they are under 3.
create or replace function public.limit_meeples()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.wishlist_votes where user_id = new.user_id) >= 3 then
    raise exception 'Solo tienes 3 meeples: quita uno para ponerlo en otro juego.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists wishlist_votes_limit on public.wishlist_votes;
create trigger wishlist_votes_limit before insert on public.wishlist_votes
  for each row execute function public.limit_meeples();
