-- ═══ Mode soirée (TV) ════════════════════════════════════════════════════
-- Un salon marqué « soirée » : la TV joue le son, les téléphones sont les manettes,
-- les invités rejoignent SANS compte (connexion anonyme Supabase, pseudo seulement).
alter table public.rooms add column if not exists is_party boolean not null default false;

-- ⚠️ À activer aussi dans le tableau de bord Supabase (pas faisable en SQL) :
--   Authentication → Sign In / Providers → « Allow anonymous sign-ins » → ON
-- Sans ça, les invités devront se connecter avec Google ou un e-mail.

-- Les comptes invités (anonymes) sont nettoyés au bout de 7 jours par le cron de ménage.
