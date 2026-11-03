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
