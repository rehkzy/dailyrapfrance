-- Jeu « Devine le clip » (feed vertical) : catalogue de clips SÉLECTIONNÉS.
-- Alimenté depuis /admin (import automatique par thème depuis la chaîne officielle de
-- l'artiste, ou ajout manuel par URL). Le jeu ne pioche que dans ce catalogue.
create table if not exists public.clip_catalog (
  id            bigserial primary key,
  video_id      text not null unique,
  artist        text not null,
  title         text not null,
  feats         text[] not null default '{}',
  start_seconds integer not null default 45,   -- point de départ (après l'intro)
  duration      integer,                        -- secondes
  tags          text[] not null default '{}',   -- ids de thèmes (ex. '93', 'artist-jul')
  enabled       boolean not null default true,
  source        text not null default 'manual', -- 'auto' (import) | 'manual'
  created_at    timestamptz not null default now()
);
create index if not exists clip_catalog_enabled_idx on public.clip_catalog (enabled);

alter table public.clip_catalog enable row level security;

drop policy if exists "Catalogue de clips lisible par tous" on public.clip_catalog;
create policy "Catalogue de clips lisible par tous"
  on public.clip_catalog for select using (enabled = true);
-- Aucune policy d'écriture publique : seules les routes /api/admin/* (service_role) écrivent.
