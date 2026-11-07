-- Résultats de salon — la mémoire des parties en ligne (les salons eux-mêmes sont nettoyés).
-- Une ligne par partie terminée : joueurs, scores, équipes, gagnants. Sert aux classements
-- « Rivaux » (face-à-face) et « Duos » (équipes 2v2). Écrit par le serveur. Idempotent.
create table if not exists public.room_results (
  room_id      uuid primary key,
  code         text,
  theme        text not null,
  format       text,                       -- 1v1 | 2v2 | royale | null (privé)
  is_public    boolean not null default false,
  rounds       int not null default 0,
  players      jsonb not null,             -- [{user_id,name,score,team}]
  winner_ids   uuid[] not null default '{}',
  finished_at  timestamptz not null default now()
);
create index if not exists room_results_finished_idx on public.room_results (finished_at desc);
create index if not exists room_results_players_idx on public.room_results using gin (players);

alter table public.room_results enable row level security;
drop policy if exists "Résultats lisibles par tous" on public.room_results;
create policy "Résultats lisibles par tous" on public.room_results for select using (true);
-- Pas d'insert/update côté client : seul le serveur (service role) écrit.
