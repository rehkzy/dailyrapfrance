-- ─────────────────────────────────────────────────────────────────────────
-- DailyRapFrance — Blind Test : comptes + scores
-- À exécuter dans Supabase → SQL Editor. Peut être relancé sans risque autant
-- de fois que nécessaire (tables en "if not exists", règles recréées à chaque fois).
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists unaccent;


-- Profil public (nom affiché, avatar) — séparé de auth.users qui n'est pas
-- directement lisible côté client pour des raisons de sécurité.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_key'
  ) then
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "Les profils sont visibles par tous (classement)" on public.profiles;
create policy "Les profils sont visibles par tous (classement)"
  on public.profiles for select
  using (true);

drop policy if exists "Chacun ne modifie que son propre profil" on public.profiles;
create policy "Chacun ne modifie que son propre profil"
  on public.profiles for update
  using (auth.uid() = id);

-- Génère un identifiant "@pseudo" unique et propre (minuscules, sans accents ni espaces) à
-- partir du nom OAuth — avec un suffixe numérique en cas de collision, pour que le pseudo
-- affiché ne soit jamais garanti unique (deux "Jul" possibles) mais que l'identifiant de
-- recherche/ajout d'ami, lui, le soit toujours.
create or replace function public.generate_username(base text)
returns text
language plpgsql
as $$
declare
  slug text;
  candidate text;
  suffix int := 0;
begin
  slug := lower(regexp_replace(unaccent(coalesce(base, 'joueur')), '[^a-z0-9]+', '', 'gi'));
  if slug = '' then slug := 'joueur'; end if;
  slug := left(slug, 20);
  candidate := slug;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(slug, 20) || suffix::text;
  end loop;
  return candidate;
end;
$$;

-- Un profil est créé automatiquement à la première connexion (Google/Apple
-- fournissent le nom et l'avatar dans les métadonnées OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Joueur'),
    public.generate_username(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'joueur')),
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

-- Rattrapage pour les comptes créés avant l'ajout du champ username.
update public.profiles set username = public.generate_username(display_name) where username is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Parties privées en ligne — salons avec code, synchronisés via Supabase Realtime.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null references public.profiles(id) on delete cascade,
  theme text not null default 'mix',
  rounds int not null default 10,
  tracks jsonb not null default '[]', -- rempli une fois au démarrage, identique pour tous
  status text not null default 'lobby', -- lobby | playing | finished
  current_round int not null default 0,
  round_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Une ligne par (manche, champ trouvé) : la clé primaire composite arbitre elle-même le
-- "premier arrivé, premier servi" — un deuxième insert sur le même (room, manche, champ)
-- échoue automatiquement (conflit de clé), pas besoin de logique de verrouillage manuelle.
create table if not exists public.room_round_solves (
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_index int not null,
  field text not null, -- title | artist | feat
  user_id uuid not null references public.profiles(id) on delete cascade,
  solved_at timestamptz not null default now(),
  primary key (room_id, round_index, field)
);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_round_solves enable row level security;

drop policy if exists "Salons visibles par tout utilisateur connecté" on public.rooms;
create policy "Salons visibles par tout utilisateur connecté"
  on public.rooms for select
  using (auth.role() = 'authenticated');

drop policy if exists "Un utilisateur connecté peut créer un salon" on public.rooms;
create policy "Un utilisateur connecté peut créer un salon"
  on public.rooms for insert
  with check (auth.uid() = host_id);

drop policy if exists "Seul l'hôte modifie son salon" on public.rooms;
create policy "Seul l'hôte modifie son salon"
  on public.rooms for update
  using (auth.uid() = host_id);

drop policy if exists "Joueurs d'un salon visibles par tout utilisateur connecté" on public.room_players;
create policy "Joueurs d'un salon visibles par tout utilisateur connecté"
  on public.room_players for select
  using (auth.role() = 'authenticated');

drop policy if exists "Un utilisateur ne rejoint que lui-même" on public.room_players;
create policy "Un utilisateur ne rejoint que lui-même"
  on public.room_players for insert
  with check (auth.uid() = user_id);

drop policy if exists "Solutions visibles par tout utilisateur connecté" on public.room_round_solves;
create policy "Solutions visibles par tout utilisateur connecté"
  on public.room_round_solves for select
  using (auth.role() = 'authenticated');

drop policy if exists "Un utilisateur ne revendique une réponse qu'en son nom" on public.room_round_solves;
create policy "Un utilisateur ne revendique une réponse qu'en son nom"
  on public.room_round_solves for insert
  with check (auth.uid() = user_id);

-- Active la réplication temps réel sur ces trois tables (lobby + scores en direct).
-- Enveloppé pour ignorer l'erreur si une table est déjà dans la publication (pas de
-- "ADD TABLE IF NOT EXISTS" en PostgreSQL).
do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.room_players;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.room_round_solves;
  exception when duplicate_object then null;
  end;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Scores du blind test — une ligne par partie solo terminée.
-- ─────────────────────────────────────────────────────────────────────────
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

drop policy if exists "Les scores sont visibles par tous (classement)" on public.blindtest_scores;
create policy "Les scores sont visibles par tous (classement)"
  on public.blindtest_scores for select
  using (true);

drop policy if exists "Chacun n'enregistre que ses propres scores" on public.blindtest_scores;
create policy "Chacun n'enregistre que ses propres scores"
  on public.blindtest_scores for insert
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Amis — demande / acceptation, dans les deux sens depuis une seule ligne.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending', -- pending | accepted
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id);

alter table public.friendships enable row level security;

drop policy if exists "Chacun voit les demandes qui le concernent" on public.friendships;
create policy "Chacun voit les demandes qui le concernent"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "On envoie une demande en son propre nom" on public.friendships;
create policy "On envoie une demande en son propre nom"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Seul le destinataire accepte, l'un ou l'autre peut retirer" on public.friendships;
create policy "Seul le destinataire accepte, l'un ou l'autre peut retirer"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "L'un ou l'autre peut supprimer une relation" on public.friendships;
create policy "L'un ou l'autre peut supprimer une relation"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

do $$
begin
  begin
    alter publication supabase_realtime add table public.friendships;
  exception when duplicate_object then null;
  end;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Stockage — photos de profil personnalisées (page Paramètres du compte).
-- Bucket public en lecture (les avatars s'affichent partout sans authentification :
-- classement, amis, salons...) mais chacun ne peut écrire/modifier/supprimer que ses
-- propres fichiers, rangés sous un dossier nommé par son propre user id.
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatars publics en lecture" on storage.objects;
create policy "Avatars publics en lecture"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Chacun envoie son propre avatar" on storage.objects;
create policy "Chacun envoie son propre avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Chacun remplace son propre avatar" on storage.objects;
create policy "Chacun remplace son propre avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Chacun supprime son propre avatar" on storage.objects;
create policy "Chacun supprime son propre avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────
-- Cycle de vie des salons : rejouable (même code, nouveaux réglages) tant que
-- personne ne quitte explicitement. Le salon n'est supprimé QUE quand un joueur
-- clique sur "Quitter" — jamais automatiquement à la fin d'une partie.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "Un joueur du salon peut le supprimer" on public.rooms;
create policy "Un joueur du salon peut le supprimer"
  on public.rooms for delete
  using (exists (
    select 1 from public.room_players rp
    where rp.room_id = rooms.id and rp.user_id = auth.uid()
  ));

drop policy if exists "L'hote peut reinitialiser les reponses de son salon" on public.room_round_solves;
create policy "L'hote peut reinitialiser les reponses de son salon"
  on public.room_round_solves for delete
  using (exists (
    select 1 from public.rooms r
    where r.id = room_round_solves.room_id and r.host_id = auth.uid()
  ));

-- Mode de réponse du salon (facile = QCM, difficile = texte) — choisi à la création et
-- modifiable à chaque rejeu, appliqué à tous les joueurs du salon pour une expérience
-- cohérente entre eux.
alter table public.rooms add column if not exists answer_mode text not null default 'text';
alter table public.rooms drop constraint if exists rooms_answer_mode_check;
alter table public.rooms add constraint rooms_answer_mode_check check (answer_mode in ('text', 'qcm'));

-- ─────────────────────────────────────────────────────────────────────────
-- RLS sur les tables de CONTENU du média (Security Advisor Supabase, 29/07/2026).
-- Ces tables sont du contenu public en lecture (news, charts, artistes...) mais sans
-- RLS, la clé anon permettait aussi d'ÉCRIRE dedans. Correctif : RLS activée + policy
-- de lecture seule pour tous. Aucune policy d'écriture = écritures possibles uniquement
-- via la clé service (scripts d'admin), qui contourne RLS par conception.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'ReleaseArtist', 'Release', 'Label', 'Artist', 'Credit', 'SocialStat',
    'ChartEntry', 'HypeScore', 'NewsItem', 'Certification', 'Track'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Lecture publique" on public.%I', t);
    execute format('create policy "Lecture publique" on public.%I for select using (true)', t);
  end loop;
end $$;
