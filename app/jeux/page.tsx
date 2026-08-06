import { redirect } from "next/navigation";

/*
 * /jouer est désormais LE hub de tous les jeux — cette page redirige pour ne pas
 * maintenir deux hubs concurrents. Les sous-pages (/jeux/tracklist, etc.) restent
 * les vraies pages de jeu, inchangées.
 */
export default function JeuxPage() {
  redirect("/jouer");
}
