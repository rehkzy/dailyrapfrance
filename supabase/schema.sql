-- ─────────────────────────────────────────────────────────────────────────
-- DailyRapFrance — Blind Test : comptes + scores
-- À exécuter dans Supabase → SQL Editor (une seule fois).
-- ─────────────────────────────────────────────────────────────────────────

-- Profil public (nom affiché, avatar) — séparé de auth.users qui n'est pas
-- directement lisible côté client pour des raisons de sécurité.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Les profils sont visibles par tous (classement)"
  on public.profiles for select
  using (true);

create policy "Chacun ne modifie que son propre profil"
  on public.profiles for update
  using (auth.uid() = id);

-- Un profil est créé automatiquement à la première connexion (Google/Apple
-- fournissent le nom et l'avatar dans les métadonnées OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Joueur'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Scores du blind test — une ligne par partie terminée.
-- Référence profiles(id) plutôt que auth.users(id) directement : Supabase (PostgREST) a
-- besoin d'une clé étrangère directe entre les deux tables pour permettre la jointure
-- automatique utilisée par la page classement (`.select("...profiles(display_name)")`).
-- Comme profiles.id référence déjà auth.users(id) en 1:1, la cohérence est garantie.
create table if not exists public.blindtest_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  theme text not null,
  rounds int not null,
  points int not null,
  created_at timestamptz not null default now()
);

create index if not exists blindtest_scores_points_idx on public.blindtest_scores (points desc);
create index if not exists blindtest_scores_user_idx on public.blindtest_scores (user_id);

alter table public.blindtest_scores enable row level security;

create policy "Les scores sont visibles par tous (classement)"
  on public.blindtest_scores for select
  using (true);

create policy "Chacun n'enregistre que ses propres scores"
  on public.blindtest_scores for insert
  with check (auth.uid() = user_id);
