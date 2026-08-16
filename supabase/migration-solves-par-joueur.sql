-- Migration : en salon en ligne, CHAQUE joueur qui trouve un champ marque ses
-- points (avant : seul le premier à valider prenait le point, contrainte PK).
-- À exécuter une fois dans Supabase → SQL Editor.

alter table public.room_round_solves
  drop constraint if exists room_round_solves_pkey;

alter table public.room_round_solves
  add primary key (room_id, round_index, field, user_id);
