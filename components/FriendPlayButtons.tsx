"use client";

import { useState } from "react";
import { Swords, Wifi, Check } from "lucide-react";
import { getDailyTheme } from "@/lib/themes";

/*
 * Actions de jeu par ami, sur la page Amis :
 *
 * · "Défier" — envoie à l'ami un lien direct vers le défi du jour (même thème pour tout
 *   le monde, scores comparables au classement) avec un message personnalisé. Partage
 *   natif (WhatsApp, iMessage…) quand le navigateur le permet, sinon copie du lien.
 * · "Salon" — emmène directement sur l'écran de création de salon privé en ligne
 *   (?mode=online) ; une fois le salon créé, le code se partage depuis le lobby.
 */
export default function FriendPlayButtons({ friendName }: { friendName: string }) {
  const [copied, setCopied] = useState(false);

  async function challenge() {
    const daily = getDailyTheme();
    const url = `${window.location.origin}/blindtest?theme=${daily.id}`;
    const text = `${friendName}, je te défie sur le défi du jour du Blind Test Rap Français (thème : ${daily.label}) — viens battre mon score 🔥`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Blind Test Rap Français", text, url });
        return;
      } catch {
        // partage annulé → on retombe sur la copie
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // dernier recours : navigation directe vers le défi
      window.location.href = url;
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={challenge}
        className="press inline-flex items-center gap-1.5 rounded-full bg-gold hover:bg-glow text-white text-xs font-semibold px-3.5 py-2 transition-colors"
        title="Envoyer un défi sur le défi du jour"
      >
        {copied ? <Check size={13} /> : <Swords size={13} />}
        {copied ? "Copié !" : "Défier"}
      </button>
      <a
        href="/blindtest?mode=online"
        className="press inline-flex items-center gap-1.5 rounded-full glass text-xs font-semibold px-3.5 py-2 text-ink hover:border-gold/40 transition-colors"
        title="Créer un salon privé et l'inviter"
      >
        <Wifi size={13} className="text-glow" />
        Salon
      </a>
    </div>
  );
}
