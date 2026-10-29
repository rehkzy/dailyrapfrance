-- Sécurité : les colonnes « pilotées par l'équipe » ne peuvent pas être modifiées par un
-- joueur via le client Supabase, même sur sa propre ligne (RLS autorise la mise à jour de
-- la ligne, pas de ces colonnes-là). Seule la clé service_role (back-office) peut.
create or replace function public.protect_admin_columns() returns trigger
language plpgsql security definer as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_table_name = 'profiles' then
      new.verified := old.verified;
    elsif tg_table_name = 'custom_blindtests' then
      new.featured := old.featured;
      new.plays := old.plays;
      new.user_id := old.user_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_admin_columns on public.profiles;
create trigger protect_admin_columns before update on public.profiles
  for each row execute function public.protect_admin_columns();

drop trigger if exists protect_admin_columns on public.custom_blindtests;
create trigger protect_admin_columns before update on public.custom_blindtests
  for each row execute function public.protect_admin_columns();

-- À l'insertion aussi : un joueur ne peut pas se créer certifié ni créer un blind test déjà « mis en avant »
create or replace function public.protect_admin_columns_insert() returns trigger
language plpgsql security definer as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_table_name = 'profiles' then new.verified := false; end if;
    if tg_table_name = 'custom_blindtests' then new.featured := false; new.plays := 0; end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_admin_columns_insert on public.profiles;
create trigger protect_admin_columns_insert before insert on public.profiles
  for each row execute function public.protect_admin_columns_insert();
drop trigger if exists protect_admin_columns_insert on public.custom_blindtests;
create trigger protect_admin_columns_insert before insert on public.custom_blindtests
  for each row execute function public.protect_admin_columns_insert();

-- Les scores n'entrent plus que par l'API (bornée, espacée) : plus d'insertion directe par le client.
drop policy if exists "Chacun n'enregistre que ses propres scores" on public.blindtest_scores;
