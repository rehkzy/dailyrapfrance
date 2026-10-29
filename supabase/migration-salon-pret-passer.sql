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
