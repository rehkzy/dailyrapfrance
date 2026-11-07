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
