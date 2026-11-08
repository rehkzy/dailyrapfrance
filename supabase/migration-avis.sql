-- ═══ Avis de vrais joueurs ═══════════════════════════════════════════════
-- Déposés en fin de partie, affichés sur l'accueil une fois approuvés (colonne approved à
-- passer à true dans Supabase → Table Editor). Jamais d'avis inventés.
create table if not exists public.player_reviews (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  text text not null check (char_length(text) between 3 and 180),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists player_reviews_approved_idx on public.player_reviews (approved, created_at desc);
alter table public.player_reviews enable row level security;
drop policy if exists "Avis approuvés visibles, les miens aussi" on public.player_reviews;
create policy "Avis approuvés visibles, les miens aussi" on public.player_reviews for select using (approved = true or auth.uid() = user_id);
drop policy if exists "Je dépose mon avis" on public.player_reviews;
create policy "Je dépose mon avis" on public.player_reviews for insert with check (auth.uid() = user_id);
