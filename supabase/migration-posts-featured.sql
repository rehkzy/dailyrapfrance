-- Posts DailyRap (onglet « DailyRap » de /actu, gérés depuis le back-office)
create table if not exists public.media_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  image text,
  kind text not null default 'instagram',
  body text,
  published boolean not null default true,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.media_posts enable row level security;
drop policy if exists "media_posts_public_read" on public.media_posts;
create policy "media_posts_public_read" on public.media_posts for select using (published = true);

-- Blind tests mis en avant par l'équipe (communauté)
alter table public.custom_blindtests add column if not exists featured boolean not null default false;

-- Couverture d'un blind test perso
alter table public.custom_blindtests add column if not exists cover text;
