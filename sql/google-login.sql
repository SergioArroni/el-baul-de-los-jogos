-- Run once after ranking.sql (safe to run again). Accounts created with Google (or any
-- other provider) don't choose a nickname at sign-up: give them one from their email,
-- unique, that they can change later in "Mi perfil". Sign-ups by email still choose theirs.
create or replace function public.create_profile_for_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := btrim(new.raw_user_meta_data->>'nickname');
  base text;
  candidate text;
  suffix int := 0;
begin
  if requested is not null then
    if requested !~ '^[A-Za-z0-9_.-]{3,24}$' then
      raise exception 'Choose a nickname with 3–24 letters, numbers, dots, dashes or underscores';
    end if;
    insert into public.profiles(user_id, nickname) values (new.id, requested);
    return new;
  end if;
  base := left(coalesce(nullif(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_.-]', '', 'g'), ''), 'jugador'), 18);
  if length(base) < 3 then base := base || '_jug'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where lower(btrim(nickname)) = lower(candidate)) loop
    suffix := suffix + 1;
    candidate := base || '_' || suffix;
  end loop;
  insert into public.profiles(user_id, nickname) values (new.id, candidate);
  return new;
end;
$$;
