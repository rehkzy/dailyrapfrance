-- Certification des comptes (badge à côté du pseudo, façon réseaux sociaux)
alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists verification_requested_at timestamptz;
-- Un joueur peut demander la certification (mise à jour de sa propre ligne — policy existante),
-- seul l'admin (service role) passe verified à true.
