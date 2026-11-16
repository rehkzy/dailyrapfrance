-- Vues de profil (comme TikTok) : qui a regardé ton profil ces 30 derniers jours.
-- Activé par défaut ; chacun peut le couper dans Paramètres. Règle TikTok : si tu le
-- coupes, tu ne vois plus qui te visite ET tes visites ne sont plus enregistrées.
-- Une ligne par (visiteur, profil), remise à jour à chaque visite. Écrit par le serveur.
alter table public.profiles add column if not exists profile_views_on boolean not null default true;

create table if not exists public.profile_views (
  viewer_id  uuid not null references public.profiles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (viewer_id, profile_id)
);
create index if not exists profile_views_profile_idx on public.profile_views (profile_id, viewed_at desc);

alter table public.profile_views enable row level security;
drop policy if exists "Chacun voit qui l'a visité" on public.profile_views;
create policy "Chacun voit qui l'a visité" on public.profile_views for select using (auth.uid() = profile_id);
-- Insert/update : serveur uniquement (service role), après vérification des deux réglages.
