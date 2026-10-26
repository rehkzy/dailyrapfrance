import { redirect } from "next/navigation";

// Ancien jeu de l'arcade — retiré. Le site ne propose plus que le blind test (/jouer).
export default function RemovedGamePage() {
  redirect("/jouer");
}
