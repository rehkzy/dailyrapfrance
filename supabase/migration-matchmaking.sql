-- Matchmaking : salons publics (« Trouver des joueurs ») + compte à rebours partagé
alter table public.rooms add column if not exists is_public boolean not null default false;
alter table public.rooms add column if not exists starts_at timestamptz;
create index if not exists rooms_public_lobby_idx on public.rooms (is_public, status, created_at);

-- Blind tests perso jouables en salon en ligne / soirée TV : les titres choisis par le créateur
alter table public.rooms add column if not exists custom_ids integer[];
alter table public.rooms add column if not exists custom_title text;

-- Formats de matchmaking (duel 1v1, 2v2 en équipes, battle royale) et équipes
alter table public.rooms add column if not exists format text;
alter table public.room_players add column if not exists team integer;
