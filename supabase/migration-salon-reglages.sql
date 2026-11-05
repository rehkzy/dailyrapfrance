-- Réglages de salon : durée d'un extrait par salon (15 à 45 s). Idempotent.
alter table public.rooms add column if not exists round_seconds int not null default 25;
