-- Mode « Devine le clip » : cache des clips YouTube retrouvés pour chaque morceau Deezer.
-- Une recherche YouTube coûte 100 unités de quota ; ce cache garantit qu'un morceau n'est
-- cherché qu'une seule fois pour tous les joueurs.
create table if not exists public.clip_videos (
  track_id    text primary key,
  video_id    text,              -- null = aucun clip exploitable trouvé (on ne recherche plus)
  duration    integer,           -- secondes
  video_title text,
  created_at  timestamptz not null default now()
);

alter table public.clip_videos enable row level security;

drop policy if exists "Cache clips lisible par tous" on public.clip_videos;
create policy "Cache clips lisible par tous"
  on public.clip_videos for select using (true);

-- Les écritures viennent des Route Handlers (clé anon) : on les autorise, le contenu est
-- validé côté serveur (id vidéo YouTube = 11 caractères).
drop policy if exists "Cache clips alimenté par le serveur" on public.clip_videos;
create policy "Cache clips alimenté par le serveur"
  on public.clip_videos for insert with check (video_id is null or video_id ~ '^[A-Za-z0-9_-]{11}$');
drop policy if exists "Cache clips mis à jour par le serveur" on public.clip_videos;
create policy "Cache clips mis à jour par le serveur"
  on public.clip_videos for update using (true) with check (video_id is null or video_id ~ '^[A-Za-z0-9_-]{11}$');
