-- ─────────────────────────────────────────────────────────────────────────────
-- Blind tests PERSONNALISÉS enregistrés (constructeur /creer) — avec compte.
-- Le lien auto-porteur (?custom=<code>) continue de marcher sans compte ; ici on
-- ajoute : retrouver ses créations depuis n'importe quel appareil, un lien court
-- /b/<slug>, et la publication ("jouable par tout le monde").
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.custom_blindtests (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  track_ids   bigint[] not null,
  settings    jsonb not null default '{}'::jsonb,   -- { s: secondes, a: "qcm"|"text" }
  is_public   boolean not null default false,
  plays       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists custom_blindtests_user_idx on public.custom_blindtests (user_id);
create index if not exists custom_blindtests_public_idx on public.custom_blindtests (is_public, plays desc);

alter table public.custom_blindtests enable row level security;

drop policy if exists "Blind tests publics lisibles par tous, privés par leur auteur" on public.custom_blindtests;
create policy "Blind tests publics lisibles par tous, privés par leur auteur"
  on public.custom_blindtests for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "Chacun crée ses blind tests" on public.custom_blindtests;
create policy "Chacun crée ses blind tests"
  on public.custom_blindtests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Chacun modifie ses blind tests" on public.custom_blindtests;
create policy "Chacun modifie ses blind tests"
  on public.custom_blindtests for update
  using (auth.uid() = user_id);

drop policy if exists "Chacun supprime ses blind tests" on public.custom_blindtests;
create policy "Chacun supprime ses blind tests"
  on public.custom_blindtests for delete
  using (auth.uid() = user_id);

-- Compteur de parties : incrémenté par n'importe qui (via la route /api/blindtest/custom/play
-- en service_role), jamais directement par le client.

-- ─────────────────────────────────────────────────────────────────────────────
-- PARRAINAGE — un code par profil, un filleul = une chance au tirage.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists referral_code text unique;

create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references public.profiles(id) on delete cascade,
  referred_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (referred_id)                      -- un filleul ne compte qu'une fois
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;

drop policy if exists "Chacun voit ses parrainages" on public.referrals;
create policy "Chacun voit ses parrainages"
  on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);
-- Insertion uniquement via /api/referral/claim (service_role), qui vérifie le code et
-- l'ancienneté du compte.
