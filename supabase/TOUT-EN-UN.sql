-- ============================================================================
-- DailyRapFrance — TOUTES les migrations, dans l'ordre, en un seul fichier.
-- Idempotent : chaque bloc peut être rejoué sans rien casser (if not exists,
-- drop … if exists, create or replace). À coller tel quel dans
-- Supabase → SQL Editor → Run. Le socle (schema.sql) doit déjà être en place.
-- Généré le 05/11/2026.
-- ============================================================================


-- ───────────────────────── migration-custom-blindtests-parrainage ─────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Blind tests PERSONNALISÉS enregistrés (constructeur /creer) — avec compte.
-- Le lien auto-porteur (?custom=<code>) continue de marcher sans compte ; ici on
-- ajoute : retrouver ses créations depuis n'importe quel appareil, un lien court
-- /b/<slug>, et la publication ("jouable par tout le monde").
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.custom_blindtests (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  track_ids   bigint[] not null,
  settings    jsonb not null default '{}'::jsonb,   -- { s: secondes, a: "qcm"|"text" }
  is_public   boolean not null default false,
  plays       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists custom_blindtests_user_idx on public.custom_blindtests (user_id);
create index if not exists custom_blindtests_public_idx on public.custom_blindtests (is_public, plays desc);

alter table public.custom_blindtests enable row level security;

drop policy if exists "Blind tests publics lisibles par tous, privés par leur auteur" on public.custom_blindtests;
create policy "Blind tests publics lisibles par tous, privés par leur auteur"
  on public.custom_blindtests for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "Chacun crée ses blind tests" on public.custom_blindtests;
create policy "Chacun crée ses blind tests"
  on public.custom_blindtests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Chacun modifie ses blind tests" on public.custom_blindtests;
create policy "Chacun modifie ses blind tests"
  on public.custom_blindtests for update
  using (auth.uid() = user_id);

drop policy if exists "Chacun supprime ses blind tests" on public.custom_blindtests;
create policy "Chacun supprime ses blind tests"
  on public.custom_blindtests for delete
  using (auth.uid() = user_id);

-- Compteur de parties : incrémenté par n'importe qui (via la route /api/blindtest/custom/play
-- en service_role), jamais directement par le client.

-- ─────────────────────────────────────────────────────────────────────────────
-- PARRAINAGE — un code par profil, un filleul = une chance au tirage.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists referral_code text unique;

create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references public.profiles(id) on delete cascade,
  referred_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (referred_id)                      -- un filleul ne compte qu'une fois
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

alter table public.referrals enable row level security;

drop policy if exists "Chacun voit ses parrainages" on public.referrals;
create policy "Chacun voit ses parrainages"
  on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);
-- Insertion uniquement via /api/referral/claim (service_role), qui vérifie le code et
-- l'ancienneté du compte.


-- ───────────────────────── migration-securite ─────────────────────────
-- Sécurité : les colonnes « pilotées par l'équipe » ne peuvent pas être modifiées par un
-- joueur via le client Supabase, même sur sa propre ligne (RLS autorise la mise à jour de
-- la ligne, pas de ces colonnes-là). Seule la clé service_role (back-office) peut.
create or replace function public.protect_admin_columns() returns trigger
language plpgsql security definer as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_table_name = 'profiles' then
      new.verified := old.verified;
    elsif tg_table_name = 'custom_blindtests' then
      new.featured := old.featured;
      new.plays := old.plays;
      new.user_id := old.user_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_admin_columns on public.profiles;
create trigger protect_admin_columns before update on public.profiles
  for each row execute function public.protect_admin_columns();

drop trigger if exists protect_admin_columns on public.custom_blindtests;
create trigger protect_admin_columns before update on public.custom_blindtests
  for each row execute function public.protect_admin_columns();

-- À l'insertion aussi : un joueur ne peut pas se créer certifié ni créer un blind test déjà « mis en avant »
create or replace function public.protect_admin_columns_insert() returns trigger
language plpgsql security definer as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_table_name = 'profiles' then new.verified := false; end if;
    if tg_table_name = 'custom_blindtests' then new.featured := false; new.plays := 0; end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_admin_columns_insert on public.profiles;
create trigger protect_admin_columns_insert before insert on public.profiles
  for each row execute function public.protect_admin_columns_insert();
drop trigger if exists protect_admin_columns_insert on public.custom_blindtests;
create trigger protect_admin_columns_insert before insert on public.custom_blindtests
  for each row execute function public.protect_admin_columns_insert();

-- Les scores n'entrent plus que par l'API (bornée, espacée) : plus d'insertion directe par le client.
drop policy if exists "Chacun n'enregistre que ses propres scores" on public.blindtest_scores;


-- ───────────────────────── migration-solves-par-joueur ─────────────────────────
-- Migration : en salon en ligne, CHAQUE joueur qui trouve un champ marque ses
-- points (avant : seul le premier à valider prenait le point, contrainte PK).
-- À exécuter une fois dans Supabase → SQL Editor.

alter table public.room_round_solves
  drop constraint if exists room_round_solves_pkey;

alter table public.room_round_solves
  add primary key (room_id, round_index, field, user_id);


-- ───────────────────────── migration-salon-pret-passer ─────────────────────────
-- Salons en ligne : « Je suis prêt » dans le lobby, et « J'ai fini / Passer » pendant une manche.
alter table public.room_players add column if not exists ready boolean not null default false;
alter table public.room_players add column if not exists done_round integer;

-- Chacun met à jour sa propre ligne ; l'hôte peut remettre les « prêts » à zéro pour tout le salon.
drop policy if exists "Chacun met à jour sa présence dans le salon" on public.room_players;
create policy "Chacun met à jour sa présence dans le salon"
  on public.room_players for update
  using (
    auth.uid() = user_id
    or auth.uid() = (select host_id from public.rooms r where r.id = room_players.room_id)
  );

-- Les mises à jour doivent remonter en temps réel avec la ligne complète.
alter table public.room_players replica identity full;


-- ───────────────────────── migration-matchmaking ─────────────────────────
-- Matchmaking : salons publics (« Trouver des joueurs ») + compte à rebours partagé
alter table public.rooms add column if not exists is_public boolean not null default false;
alter table public.rooms add column if not exists starts_at timestamptz;
create index if not exists rooms_public_lobby_idx on public.rooms (is_public, status, created_at);

-- Blind tests perso jouables en salon en ligne / soirée TV : les titres choisis par le créateur
alter table public.rooms add column if not exists custom_ids integer[];
alter table public.rooms add column if not exists custom_title text;

-- Formats de matchmaking (duel 1v1, 2v2 en équipes, battle royale) et équipes
alter table public.rooms add column if not exists format text;
alter table public.room_players add column if not exists team integer;

-- Présence dans le salon (matchmaking côté serveur : fantômes retirés après 25 s sans signe de vie)
alter table public.room_players add column if not exists last_seen_at timestamptz default now();

-- Notifications push (matchmaking : « adversaire trouvé »)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
-- (aucune policy : lecture/écriture uniquement via la clé service, depuis l'API)
alter table public.rooms add column if not exists notified_phase text;

-- Chacun peut quitter un salon (supprimer SA ligne) — l'API le fait aussi côté serveur
drop policy if exists "Chacun peut quitter un salon" on public.room_players;
create policy "Chacun peut quitter un salon" on public.room_players for delete
  using (auth.uid() = user_id or auth.uid() = (select host_id from public.rooms r where r.id = room_players.room_id));


-- ───────────────────────── migration-certification ─────────────────────────
-- Certification des comptes (badge à côté du pseudo, façon réseaux sociaux)
alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists verification_requested_at timestamptz;
-- Un joueur peut demander la certification (mise à jour de sa propre ligne — policy existante),
-- seul l'admin (service role) passe verified à true.


-- ───────────────────────── migration-posts-featured ─────────────────────────
-- Posts DailyRap (onglet « DailyRap » de /actu, gérés depuis le back-office)
create table if not exists public.media_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  image text,
  kind text not null default 'instagram',
  body text,
  published boolean not null default true,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.media_posts enable row level security;
drop policy if exists "media_posts_public_read" on public.media_posts;
create policy "media_posts_public_read" on public.media_posts for select using (published = true);

-- Blind tests mis en avant par l'équipe (communauté)
alter table public.custom_blindtests add column if not exists featured boolean not null default false;

-- Couverture d'un blind test perso
alter table public.custom_blindtests add column if not exists cover text;


-- ───────────────────────── migration-profil-personnalisation ─────────────────────────
-- Personnalisation du profil : bannière (preset ou image), bio, badges mis en avant.
alter table public.profiles add column if not exists banner text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists showcase text[] not null default '{}';


-- ───────────────────────── migration-onboarding ─────────────────────────
-- Première connexion : choix du pseudo / de la photo (une seule fois)
alter table public.profiles add column if not exists onboarded_at timestamptz;
-- Les comptes déjà existants ne doivent pas revoir la fenêtre
update public.profiles set onboarded_at = now() where onboarded_at is null and created_at < now() - interval '1 day';


-- ───────────────────────── migration-parrainage-suivi ─────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- PARRAINAGE — vrai suivi : clics sur les liens, partages, origine de chaque
-- rattachement. À exécuter dans l'éditeur SQL Supabase (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- Chaque visite arrivée par un lien ?ref=CODE (loggée par le middleware, service_role).
create table if not exists public.referral_visits (
  id           bigint generated always as identity primary key,
  code         text not null,
  referrer_id  uuid references public.profiles(id) on delete cascade,
  visited_at   timestamptz not null default now(),
  path         text,
  ip_hash      text,                 -- sha-256 tronqué de l'IP : dédoublonnage, jamais l'IP en clair
  country      text,
  user_agent   text,
  referer      text
);
create index if not exists referral_visits_code_idx on public.referral_visits (code, visited_at desc);
create index if not exists referral_visits_referrer_idx on public.referral_visits (referrer_id, visited_at desc);
alter table public.referral_visits enable row level security;
-- Aucune policy : lecture/écriture uniquement via les routes serveur (service_role).

-- Chaque partage (bouton Partager / Copier) : pour savoir qui a vraiment diffusé son lien.
create table if not exists public.referral_shares (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  channel     text not null default 'share',   -- share | copy | code
  created_at  timestamptz not null default now()
);
create index if not exists referral_shares_user_idx on public.referral_shares (user_id, created_at desc);
alter table public.referral_shares enable row level security;
drop policy if exists "Chacun journalise ses partages" on public.referral_shares;
create policy "Chacun journalise ses partages"
  on public.referral_shares for insert
  with check (auth.uid() = user_id);
drop policy if exists "Chacun voit ses partages" on public.referral_shares;
create policy "Chacun voit ses partages"
  on public.referral_shares for select
  using (auth.uid() = user_id);

-- D'où vient chaque rattachement : cookie (lien, puis connexion Google), url, localStorage,
-- ou code saisi à la main par le filleul.
alter table public.referrals add column if not exists source text;
alter table public.referrals add column if not exists ip_hash text;


-- ───────────────────────── migration-clip-videos ─────────────────────────
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


-- ───────────────────────── migration-clip-catalog ─────────────────────────
-- Jeu « Devine le clip » (feed vertical) : catalogue de clips SÉLECTIONNÉS.
-- Alimenté depuis /admin (import automatique par thème depuis la chaîne officielle de
-- l'artiste, ou ajout manuel par URL). Le jeu ne pioche que dans ce catalogue.
create table if not exists public.clip_catalog (
  id            bigserial primary key,
  video_id      text not null unique,
  artist        text not null,
  title         text not null,
  feats         text[] not null default '{}',
  start_seconds integer not null default 45,   -- point de départ (après l'intro)
  duration      integer,                        -- secondes
  tags          text[] not null default '{}',   -- ids de thèmes (ex. '93', 'artist-jul')
  enabled       boolean not null default true,
  source        text not null default 'manual', -- 'auto' (import) | 'manual'
  created_at    timestamptz not null default now()
);
create index if not exists clip_catalog_enabled_idx on public.clip_catalog (enabled);

alter table public.clip_catalog enable row level security;

drop policy if exists "Catalogue de clips lisible par tous" on public.clip_catalog;
create policy "Catalogue de clips lisible par tous"
  on public.clip_catalog for select using (enabled = true);
-- Aucune policy d'écriture publique : seules les routes /api/admin/* (service_role) écrivent.


-- ───────────────────────── migration-chat-salon ─────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- CHAT DE SALON — messages en direct pendant l'attente et pendant la partie
-- (style TikTok Live). Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.room_messages (
  id          bigint generated always as identity primary key,
  room_id     uuid not null references public.rooms(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  avatar_url  text,
  text        text not null check (char_length(text) between 1 and 200),
  created_at  timestamptz not null default now()
);
create index if not exists room_messages_room_idx on public.room_messages (room_id, created_at desc);

alter table public.room_messages enable row level security;

-- Seuls les membres du salon lisent et écrivent ; on ne peut écrire qu'en son nom.
drop policy if exists "Les membres lisent le chat" on public.room_messages;
create policy "Les membres lisent le chat"
  on public.room_messages for select
  using (exists (select 1 from public.room_players rp where rp.room_id = room_messages.room_id and rp.user_id = auth.uid()));

drop policy if exists "Les membres écrivent dans le chat" on public.room_messages;
create policy "Les membres écrivent dans le chat"
  on public.room_messages for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.room_players rp where rp.room_id = room_messages.room_id and rp.user_id = auth.uid())
  );

-- Temps réel : le salon reçoit chaque message dès l'insertion.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_messages'
  ) then
    alter publication supabase_realtime add table public.room_messages;
  end if;
end $$;


-- ───────────────────────── migration-spectateurs ─────────────────────────
-- Mode spectateur : on peut entrer dans un salon dont la partie a déjà commencé pour la
-- regarder (classement en direct, chat, réactions), sans jouer. Les spectateurs deviennent
-- joueurs à la partie suivante du salon. Idempotent.
alter table public.room_players add column if not exists spectator boolean not null default false;


-- ───────────────────────── migration-salon-reglages ─────────────────────────
-- Réglages de salon : durée d'un extrait par salon (15 à 45 s). Idempotent.
alter table public.rooms add column if not exists round_seconds int not null default 25;


-- ───────────────────────── migration-resultats-salons ─────────────────────────
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


-- ───────────────────────── migration-messagerie ─────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGERIE ENTRE AMIS, CHIFFRÉE DE BOUT EN BOUT
-- Le serveur ne voit jamais un message en clair : chaque appareil génère une paire de
-- clés (ECDH P-256), publie sa clé publique ici, et chiffre chaque message (AES-256-GCM)
-- avec un secret dérivé des deux clés. La clé privée ne quitte jamais l'appareil.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- Clés publiques : une par appareil (device_id), pour qu'un ami puisse chiffrer vers
-- chacun de tes appareils.
create table if not exists public.user_keys (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  device_id   text not null,
  public_jwk  jsonb not null,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  primary key (user_id, device_id)
);
alter table public.user_keys enable row level security;
drop policy if exists "Clés publiques lisibles par les connectés" on public.user_keys;
create policy "Clés publiques lisibles par les connectés" on public.user_keys for select using (auth.role() = 'authenticated');
drop policy if exists "Chacun publie ses clés" on public.user_keys;
create policy "Chacun publie ses clés" on public.user_keys for insert with check (auth.uid() = user_id);
drop policy if exists "Chacun met à jour ses clés" on public.user_keys;
create policy "Chacun met à jour ses clés" on public.user_keys for update using (auth.uid() = user_id);
drop policy if exists "Chacun retire ses clés" on public.user_keys;
create policy "Chacun retire ses clés" on public.user_keys for delete using (auth.uid() = user_id);

-- Messages : un enregistrement par (message, appareil destinataire) — chiffré pour la clé
-- de cet appareil. L'expéditeur garde aussi une copie chiffrée pour ses propres appareils.
create table if not exists public.direct_messages (
  id            bigint generated always as identity primary key,
  msg_id        uuid not null,                 -- même message, plusieurs appareils
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  peer_id       uuid not null references public.profiles(id) on delete cascade, -- l'autre personne de la conversation, vue de l'appareil destinataire
  device_id     text not null,                 -- appareil destinataire
  sender_device text not null,                 -- appareil expéditeur (sa clé publique)
  ciphertext    text not null,                 -- base64 AES-GCM
  iv            text not null,                 -- base64, 12 octets
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index if not exists direct_messages_inbox_idx on public.direct_messages (recipient_id, device_id, created_at desc);
create index if not exists direct_messages_thread_idx on public.direct_messages (recipient_id, device_id, peer_id, created_at desc);

alter table public.direct_messages enable row level security;
-- Lire : ce qui m'est adressé (mes appareils) ou ce que j'ai envoyé.
drop policy if exists "Chacun lit ses messages" on public.direct_messages;
create policy "Chacun lit ses messages" on public.direct_messages for select
  using (auth.uid() = recipient_id or auth.uid() = sender_id);
-- Écrire : en mon nom, uniquement à un ami accepté (ou à moi-même pour mes autres appareils).
drop policy if exists "On écrit à ses amis" on public.direct_messages;
create policy "On écrit à ses amis" on public.direct_messages for insert
  with check (
    auth.uid() = sender_id
    and (
      recipient_id = auth.uid()
      or exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and ((f.requester_id = auth.uid() and f.addressee_id = recipient_id) or (f.addressee_id = auth.uid() and f.requester_id = recipient_id))
      )
    )
  );
-- Marquer lu : le destinataire seulement.
drop policy if exists "Le destinataire marque lu" on public.direct_messages;
create policy "Le destinataire marque lu" on public.direct_messages for update
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
drop policy if exists "Chacun supprime ses messages" on public.direct_messages;
create policy "Chacun supprime ses messages" on public.direct_messages for delete
  using (auth.uid() = recipient_id or auth.uid() = sender_id);

-- Temps réel
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages') then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;


-- ═══ messagerie : photos chiffrées ═══
-- Messagerie : photos chiffrées. Le bucket ne contient que des blobs chiffrés (AES-GCM, clé
-- envoyée dans le message chiffré de bout en bout) : lisible publiquement, illisible sans la clé.
insert into storage.buckets (id, name, public) values ('dm', 'dm', true) on conflict (id) do nothing;
drop policy if exists "dm lecture" on storage.objects;
create policy "dm lecture" on storage.objects for select using (bucket_id = 'dm');
drop policy if exists "dm envoi" on storage.objects;
create policy "dm envoi" on storage.objects for insert to authenticated
  with check (bucket_id = 'dm' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "dm suppression" on storage.objects;
create policy "dm suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'dm' and (storage.foldername(name))[1] = auth.uid()::text);


-- ═══ Notifications (cloche) ══════════════════════════════════════════════
-- Une ligne par événement utile : demande d'ami, ami accepté, invitation salon, score battu,
-- message reçu, parrainage. Créées par des triggers (amis, messages) ou par le serveur.
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,                 -- friend_request | friend_accepted | room_invite | beaten | message | referral | system
  actor_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text,
  url text,
  dedupe text,                        -- clé d'unicité par destinataire (évite les doublons)
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create unique index if not exists notifications_dedupe_idx on public.notifications (user_id, dedupe) where dedupe is not null;

alter table public.notifications enable row level security;
drop policy if exists "Chacun lit ses notifications" on public.notifications;
create policy "Chacun lit ses notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "Chacun marque lu" on public.notifications;
create policy "Chacun marque lu" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Chacun efface les siennes" on public.notifications;
create policy "Chacun efface les siennes" on public.notifications for delete using (auth.uid() = user_id);

-- Nom affiché d'un profil (pour les textes)
create or replace function public.display_of(uid uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce(display_name, username, 'Un pote') from public.profiles where id = uid
$$;

-- Amis : demande reçue / demande acceptée
create or replace function public.notify_friendship() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (user_id, kind, actor_id, title, body, url, dedupe)
    values (new.addressee_id, 'friend_request', new.requester_id, public.display_of(new.requester_id) || ' veut être ton ami', 'Accepte pour jouer en salon privé et vous écrire.', '/amis', 'friend_request:' || new.id)
    on conflict do nothing;
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.notifications (user_id, kind, actor_id, title, body, url, dedupe)
    values (new.requester_id, 'friend_accepted', new.addressee_id, public.display_of(new.addressee_id) || ' a accepté ta demande', 'Vous êtes amis. Défie-le ou écris-lui.', '/amis', 'friend_accepted:' || new.id)
    on conflict do nothing;
    -- la demande est traitée : on la marque lue chez celui qui l'a acceptée
    update public.notifications set read_at = coalesce(read_at, now()) where user_id = new.addressee_id and dedupe = 'friend_request:' || new.id;
  end if;
  return new;
end $$;
drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify after insert or update on public.friendships for each row execute function public.notify_friendship();

-- Messages : une notification par message (pas par appareil), sans contenu (il est chiffré)
create or replace function public.notify_message() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.recipient_id <> new.sender_id then
    insert into public.notifications (user_id, kind, actor_id, title, body, url, dedupe)
    values (new.recipient_id, 'message', new.sender_id, public.display_of(new.sender_id) || ' t''a écrit', 'Message chiffré de bout en bout.', '/messages/' || coalesce((select username from public.profiles where id = new.sender_id), new.sender_id::text), 'message:' || new.msg_id)
    on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists direct_messages_notify on public.direct_messages;
create trigger direct_messages_notify after insert on public.direct_messages for each row execute function public.notify_message();

-- Temps réel
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;


-- ═══ Joueurs IA (matchmaking) ═══════════════════════════════════════════
-- Des profils marqués is_bot, créés par le serveur, qui comblent les salons publics quand
-- personne n'arrive. Exclus des suggestions d'amis, des compteurs et des classements.
alter table public.profiles add column if not exists is_bot boolean not null default false;
create index if not exists profiles_is_bot_idx on public.profiles (is_bot) where is_bot;
