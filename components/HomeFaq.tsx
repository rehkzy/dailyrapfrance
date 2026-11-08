import { ArrowRight } from "lucide-react";
import { jsonLd as toJsonLd } from "@/lib/jsonld";

/* FAQ visible + données structurées FAQPage : les questions que les gens tapent dans Google. */
export const HOME_FAQ: { q: string; a: string }[] = [
  { q: "Le blind test rap français est-il gratuit ?", a: "Oui. Une partie découverte se lance sans compte (cinq manches en QCM, avec un peu de pub). Le compte, gratuit lui aussi, enlève la pub et ouvre les parties longues, le mode difficile, le classement, les amis, les salons en ligne et la soirée sur la TV." },
  { q: "Peut-on jouer sans inscription ?", a: "Oui, en mode découverte : choisis un thème, lance, cinq extraits à reconnaître. Pour garder ton score et jouer avec tes potes, un compte se crée en dix secondes avec Google ou un e-mail." },
  { q: "Comment jouer au blind test avec ses amis à distance ?", a: "Crée un salon privé, choisis le thème et les réglages, puis invite tes amis dans la messagerie du jeu ou par lien. Chacun joue sur son téléphone, en même temps, avec chat, réactions, spectateurs et classement en direct." },
  { q: "Comment organiser un blind test en soirée sur la TV ?", a: "Ouvre le mode soirée sur une TV ou un ordinateur : un code et un QR code s'affichent. Les invités scannent, choisissent un pseudo, et répondent depuis leur téléphone. La TV diffuse l'extrait et le classement, le dernier tire un gage. Aucune application." },
  { q: "Quels thèmes de blind test rap sont disponibles ?", a: "Plus de quatre-vingts : un thème par artiste (Ninho, Jul, Kaaris, PNL, Damso, SCH…), par époque (90s, 2000s, 2010s, récent), par région (93, 91, 92, Marseille, Lyon, Belgique…), par style (drill, trap, mélodique, boom bap…), les classiques, les sorties de la semaine, le Top 50, et deux modes à part : Gimmicks et Mèmes." },
  { q: "Peut-on créer son propre blind test ?", a: "Oui : le constructeur te laisse chercher des titres sur Deezer, les ordonner, régler la durée des extraits, puis jouer dessus en solo, entre potes, en ligne ou en soirée, et partager le lien." },
  { q: "D'où viennent les extraits et les morceaux ?", a: "Les extraits de trente secondes sont fournis par Deezer. Les sélections sont renouvelées à chaque partie, et les thèmes d'actualité suivent les sorties et les écoutes de la semaine." },
  { q: "Qui est derrière DailyRapFrance ?", a: "Un média rap français indépendant créé en 2020, suivi par près de 170 000 personnes sur TikTok, Instagram et YouTube, qui a construit son propre blind test. L'actu, les sorties et les tendances sont intégrées au jeu." },
];

export default function HomeFaq() {
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", "@id": "https://dailyrapfrance.best/#faq", mainEntity: HOME_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-4 pb-14" aria-labelledby="faq-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <p className="stage-kicker mb-1">Questions fréquentes</p>
      <h2 id="faq-title" className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-5">Tout ce qu&apos;on nous demande</h2>
      <div className="divide-y divide-white/8 border-y border-white/8">
        {HOME_FAQ.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-semibold min-h-[32px]">
              {f.q}
              <ArrowRight size={14} className="text-ink-faint shrink-0 transition-transform group-open:rotate-90" />
            </summary>
            <p className="text-sm text-ink-muted leading-relaxed mt-2 max-w-2xl">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
