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

-- Présence dans le salon (matchmaking côté serveur : fantômes retirés après 25 s sans signe de vie)
alter table public.room_players add column if not exists last_seen_at timestamptz default now();

-- Notifications push (matchmaking : « adversaire trouvé »)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
-- (aucune policy : lecture/écriture uniquement via la clé service, depuis l'API)
alter table public.rooms add column if not exists notified_phase text;

-- Chacun peut quitter un salon (supprimer SA ligne) — l'API le fait aussi côté serveur
drop policy if exists "Chacun peut quitter un salon" on public.room_players;
create policy "Chacun peut quitter un salon" on public.room_players for delete
  using (auth.uid() = user_id or auth.uid() = (select host_id from public.rooms r where r.id = room_players.room_id));
