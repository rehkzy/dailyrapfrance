import type { Metadata } from "next";
import { Gift, Users, Ticket, Share2 } from "lucide-react";
import ReferralCard from "@/components/ReferralCard";
import BackToGame from "@/components/BackToGame";
import GameTabBar from "@/components/GameTabBar";
import { REFERRAL_CONTEST } from "@/lib/referral";

export const metadata: Metadata = {
  title: `Parrainage — gagne ${REFERRAL_CONTEST.title} | DailyRapFrance`,
  description: `Invite tes amis sur le blind test rap français avec ton lien : chaque ami inscrit = une chance de gagner ${REFERRAL_CONTEST.short}.`,
  alternates: { canonical: "https://dailyrapfrance.best/parrainage" },
};

const STEPS = [
  { Icon: Share2, t: "Envoie ton lien", s: "Dans le groupe, en story, en DM : ton lien est unique." },
  { Icon: Users, t: "Ton ami crée son compte", s: "Gratuit, en 10 secondes, avec Google ou un e-mail. Il joue tout de suite." },
  { Icon: Ticket, t: "Une chance de plus", s: "Chaque inscription compte. Pas de limite." },
  { Icon: Gift, t: "Tirage au sort", s: `${REFERRAL_CONTEST.title}, le ${REFERRAL_CONTEST.date}. Gagnant annoncé sur Instagram.` },
];

export default function ParrainagePage() {
  return (
    <>
      <section className="max-w-2xl mx-auto px-6 pt-16 pb-32">
        <BackToGame fallback="/profil" />
        <p className="stage-kicker mb-2 inline-flex items-center gap-1.5"><Gift size={13} /> Parrainage</p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-2">Invite tes potes, gagne le Stade de France.</h1>
        <p className="text-ink-muted mb-6">{REFERRAL_CONTEST.rule}</p>
        <ReferralCard />
        <h2 className="font-display text-xl font-bold mt-10 mb-3">Comment ça marche</h2>
        <ol className="space-y-2.5">
          {STEPS.map((st, i) => (
            <li key={st.t} className="ticket p-4 flex items-start gap-3">
              <span className="font-display text-xl font-extrabold text-gold w-6 shrink-0">{i + 1}</span>
              <span className="flex-1"><span className="block text-sm font-semibold">{st.t}</span><span className="block text-xs text-ink-faint mt-0.5">{st.s}</span></span>
              <st.Icon size={16} className="text-ink-faint shrink-0" />
            </li>
          ))}
        </ol>
        <p className="text-xs text-ink-faint mt-8">Jeu gratuit sans obligation d&apos;achat. Une seule participation par personne inscrite ; les comptes créés par la même personne ou automatiquement sont retirés avant le tirage. Le gagnant est contacté par e-mail et annoncé sur @dailyrapfrance. Les places ne sont ni échangeables ni remboursables.</p>
      </section>
      <GameTabBar />
    </>
  );
}
