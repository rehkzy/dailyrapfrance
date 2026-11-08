-- ═══ Joueurs IA (matchmaking) ═══════════════════════════════════════════
-- Des profils marqués is_bot, créés par le serveur, qui comblent les salons publics quand
-- personne n'arrive. Exclus des suggestions d'amis, des compteurs et des classements.
alter table public.profiles add column if not exists is_bot boolean not null default false;
create index if not exists profiles_is_bot_idx on public.profiles (is_bot) where is_bot;
