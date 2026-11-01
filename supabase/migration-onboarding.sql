-- Première connexion : choix du pseudo / de la photo (une seule fois)
alter table public.profiles add column if not exists onboarded_at timestamptz;
-- Les comptes déjà existants ne doivent pas revoir la fenêtre
update public.profiles set onboarded_at = now() where onboarded_at is null and created_at < now() - interval '1 day';
