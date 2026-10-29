"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/*
 * Retour à l'écran précédent (historique de navigation) plutôt qu'un jeu fixe — avant,
 * ce bouton pointait en dur vers /blindtest, ce qui avait du sens quand c'était le seul
 * jeu du site ; ce n'est plus le cas (arcade à 7 jeux).
 *
 * On vérifie que la page précédente vient bien du site (via document.referrer) avant
 * d'utiliser router.back() — sinon un lien partagé venant d'ailleurs (Instagram, un
 * groupe WhatsApp...) ramènerait la personne hors du site au clic sur "Retour". Dans ce
 * cas (ou s'il n'y a simplement pas d'historique), on retombe sur le hub /jouer, jamais
 * sur un jeu en particulier.
 */
export default function BackToGame() {
  const router = useRouter();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const cameFromSite =
      typeof document !== "undefined" &&
      !!document.referrer &&
      new URL(document.referrer).origin === window.location.origin;

    if (cameFromSite && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
    // Sinon : navigation normale vers href="/jouer" (fallback déjà posé sur le lien).
  }

  return (
    <a
      href="/jouer"
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-5 min-h-[40px] mr-4"
    >
      <ChevronLeft size={16} /> Retour
    </a>
  );
}
