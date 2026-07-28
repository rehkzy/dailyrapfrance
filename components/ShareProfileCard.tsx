"use client";

import { useState } from "react";
import { Check, Copy, Share2, AtSign } from "lucide-react";

// Carte "@handle" bien visible — l'identifiant que le joueur donne à ses amis pour être
// retrouvé/ajouté. Gros, copiable en un tap, partageable nativement.
export default function ShareProfileCard({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const profileUrl =
    typeof window !== "undefined" ? `${window.location.origin}/profil/${username}` : `/profil/${username}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* rien */
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "DailyRapFrance",
          text: `Ajoute-moi sur le Blind Test Rap Français — @${username}`,
          url: profileUrl,
        });
        return;
      } catch {
        return;
      }
    }
    copy();
  }

  return (
    <div className="glass rounded-2xl p-5 mb-8">
      <p className="font-mono text-[10px] text-ink-faint uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <AtSign size={12} /> Ton identifiant de jeu — partage-le à tes amis
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-display text-2xl sm:text-3xl font-bold text-gold truncate">@{username}</span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={copy}
            className="press inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/12 text-xs font-semibold px-3.5 py-2 text-ink hover:bg-white/10 transition-colors"
          >
            {copied ? <Check size={14} className="text-[#3DDC84]" /> : <Copy size={14} />}
            {copied ? "Copié !" : "Copier le lien"}
          </button>
          <button
            onClick={share}
            className="press inline-flex items-center gap-1.5 rounded-full bg-gold hover:bg-glow text-white text-xs font-semibold px-3.5 py-2 transition-colors"
          >
            <Share2 size={14} />
            Partager
          </button>
        </div>
      </div>
    </div>
  );
}
