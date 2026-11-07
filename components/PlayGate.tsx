"use client";

import { Play, Trophy, Users, Flame } from "lucide-react";
import SignInCta from "@/components/SignInCta";
import BrandMark from "@/components/BrandMark";

/*
 * Porte d'entrée du jeu : il faut un compte pour jouer. Un seul écran, qui vend la
 * connexion plutôt que de l'imposer — score sauvegardé, classement, amis, série.
 * Google en un tap, e-mail en secours. La page courante est conservée au retour.
 */
export default function PlayGate({ title = "Connecte-toi pour jouer.", sub }: { title?: string; sub?: string }) {
  return (
    <div className="max-w-md mx-auto px-5 pt-10 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-12 h-12 rounded-2xl grid place-items-center text-white" style={{ background: "linear-gradient(145deg,#ff3b4e,#f0001c 55%,#8a0010)", boxShadow: "0 10px 30px rgba(240,0,28,.45)" }}><BrandMark size={24} /></span>
        <p className="stage-kicker">Blind test rap FR</p>
      </div>
      <h1 className="stage-title mb-3">{title}</h1>
      <p className="text-ink-muted mb-6">{sub ?? "Gratuit, 10 secondes avec Google. Après, tout est à toi."}</p>

      <ul className="space-y-2.5 mb-7">
        {[
          { Icon: Trophy, t: "Tes scores sauvegardés", s: "et ta place au classement" },
          { Icon: Users, t: "Tes potes", s: "défis, salons en ligne, classement entre amis" },
          { Icon: Flame, t: "Ta série", s: "un jour de plus à chaque partie" },
          { Icon: Play, t: "Le défi de la semaine", s: "même thème pour tout le monde" },
        ].map((r) => (
          <li key={r.t} className="ticket px-4 py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0"><r.Icon size={17} /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold">{r.t}</span><span className="block text-xs text-ink-faint">{r.s}</span></span>
          </li>
        ))}
      </ul>

      <SignInCta label="Continuer avec Google" />
      <p className="text-[11px] text-ink-faint text-center mt-5">Aucune pub, aucune carte bancaire. <a href="/confidentialite" className="underline">Ce qu&apos;on garde</a>.</p>
    </div>
  );
}
