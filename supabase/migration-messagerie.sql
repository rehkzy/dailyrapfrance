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
