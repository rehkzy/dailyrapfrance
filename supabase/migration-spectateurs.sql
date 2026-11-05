-- Mode spectateur : on peut entrer dans un salon dont la partie a déjà commencé pour la
-- regarder (classement en direct, chat, réactions), sans jouer. Les spectateurs deviennent
-- joueurs à la partie suivante du salon. Idempotent.
alter table public.room_players add column if not exists spectator boolean not null default false;
