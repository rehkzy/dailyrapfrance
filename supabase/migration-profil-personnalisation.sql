-- Personnalisation du profil : bannière (preset ou image), bio, badges mis en avant.
alter table public.profiles add column if not exists banner text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists showcase text[] not null default '{}';
