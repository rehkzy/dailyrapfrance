"use client";

import { Bug, MessageSquare, Lightbulb, Shield, FileText, Info, ChevronRight, type LucideIcon } from "lucide-react";

/*
 * Aide & contact — tout ce qu'on cherche dans les réglages d'un jeu : signaler un bug,
 * écrire à l'équipe, proposer un thème, lire les règles. Les mailto pré-remplissent le
 * sujet et, pour un bug, l'appareil et la page (ça évite trois allers-retours).
 */
const CONTACT = "contact@dailyrapfrance.best";

function mail(subject: string, body = "") {
  return `mailto:${CONTACT}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
}

function bugBody() {
  if (typeof window === "undefined") return "";
  const ua = navigator.userAgent;
  return `Ce qui s'est passé :\n\n\nCe que j'attendais :\n\n\n— Infos techniques (laisse-les, ça aide) —\nPage : ${window.location.href}\nAppareil : ${ua}\nÉcran : ${window.innerWidth}×${window.innerHeight}\nDate : ${new Date().toLocaleString("fr-FR")}`;
}

export default function HelpLinks({ username }: { username?: string | null }) {
  const who = username ? ` (@${username})` : "";
  const rows: { Icon: LucideIcon; t: string; s: string; href: string; external?: boolean }[] = [
    { Icon: Bug, t: "Signaler un bug", s: "Un son qui ne part pas, un écran cassé, un score perdu", href: mail(`[Bug] DailyRapFrance${who}`, bugBody()), external: true },
    { Icon: MessageSquare, t: "Contacter l'équipe", s: "Une question, un partenariat, une réclamation", href: mail(`[Contact] DailyRapFrance${who}`), external: true },
    { Icon: Lightbulb, t: "Proposer un thème ou un artiste", s: "Il manque quelqu'un ? Dis-le-nous", href: mail(`[Idée] Thème ou artiste à ajouter${who}`, "Thème / artiste proposé :\n\nPourquoi :\n"), external: true },
    { Icon: Info, t: "À propos de DailyRapFrance", s: "Le média, le jeu, qui est derrière", href: "/a-propos" },
    { Icon: Shield, t: "Confidentialité et données", s: "Ce qu'on garde, ce qu'on ne garde pas", href: "/confidentialite" },
    { Icon: FileText, t: "Conditions d'utilisation", s: "Les règles du jeu, version juridique", href: "/conditions" },
  ];
  return (
    <div className="ticket divide-y divide-white/6">
      {rows.map((r) => (
        <a key={r.t} href={r.href} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.03] transition-colors">
          <span className="w-10 h-10 rounded-xl bg-white/6 grid place-items-center text-ink-muted shrink-0"><r.Icon size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{r.t}</span>
            <span className="block text-xs text-ink-faint">{r.s}</span>
          </span>
          <ChevronRight size={16} className="text-ink-faint shrink-0" />
        </a>
      ))}
      <p className="px-5 py-3 text-[11px] text-ink-faint">Réponse en général sous 48 h. Écris directement à <a href={`mailto:${CONTACT}`} className="text-glow font-semibold">{CONTACT}</a> si ton appli mail ne s&apos;ouvre pas.</p>
    </div>
  );
}
