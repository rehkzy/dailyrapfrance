-- ─────────────────────────────────────────────────────────────────────────────
-- PARRAINAGE — vrai suivi : clics sur les liens, partages, origine de chaque
-- rattachement. À exécuter dans l'éditeur SQL Supabase (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- Chaque visite arrivée par un lien ?ref=CODE (loggée par le middleware, service_role).
create table if not exists public.referral_visits (
  id           bigint generated always as identity primary key,
  code         text not null,
  referrer_id  uuid references public.profiles(id) on delete cascade,
  visited_at   timestamptz not null default now(),
  path         text,
  ip_hash      text,                 -- sha-256 tronqué de l'IP : dédoublonnage, jamais l'IP en clair
  country      text,
  user_agent   text,
  referer      text
);
create index if not exists referral_visits_code_idx on public.referral_visits (code, visited_at desc);
create index if not exists referral_visits_referrer_idx on public.referral_visits (referrer_id, visited_at desc);
alter table public.referral_visits enable row level security;
-- Aucune policy : lecture/écriture uniquement via les routes serveur (service_role).

-- Chaque partage (bouton Partager / Copier) : pour savoir qui a vraiment diffusé son lien.
create table if not exists public.referral_shares (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  channel     text not null default 'share',   -- share | copy | code
  created_at  timestamptz not null default now()
);
create index if not exists referral_shares_user_idx on public.referral_shares (user_id, created_at desc);
alter table public.referral_shares enable row level security;
drop policy if exists "Chacun journalise ses partages" on public.referral_shares;
create policy "Chacun journalise ses partages"
  on public.referral_shares for insert
  with check (auth.uid() = user_id);
drop policy if exists "Chacun voit ses partages" on public.referral_shares;
create policy "Chacun voit ses partages"
  on public.referral_shares for select
  using (auth.uid() = user_id);

-- D'où vient chaque rattachement : cookie (lien, puis connexion Google), url, localStorage,
-- ou code saisi à la main par le filleul.
alter table public.referrals add column if not exists source text;
alter table public.referrals add column if not exists ip_hash text;
