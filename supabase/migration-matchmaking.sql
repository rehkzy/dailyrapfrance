-- Matchmaking : salons publics (« Trouver des joueurs ») + compte à rebours partagé
alter table public.rooms add column if not exists is_public boolean not null default false;
alter table public.rooms add column if not exists starts_at timestamptz;
create index if not exists rooms_public_lobby_idx on public.rooms (is_public, status, created_at);

-- Blind tests perso jouables en salon en ligne / soirée TV : les titres choisis par le créateur
alter table public.rooms add column if not exists custom_ids integer[];
alter table public.rooms add column if not exists custom_title text;
