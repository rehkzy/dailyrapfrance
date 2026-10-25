import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Play, Users, Globe, Tv, Check } from "lucide-react";
import { ALL_LANDINGS, MODE_LANDINGS, THEME_LANDINGS, findLanding, SITE } from "@/lib/seo";
import { THEME_CATEGORIES } from "@/lib/themes";
import BrandMark from "@/components/BrandMark";
import { AppStoreCallout } from "@/components/AppComingSoon";

/*
 * /blindtest/[slug] — pages d'atterrissage statiques : une par façon de jouer (solo,
 * entre-amis, en-ligne, soiree) et une par thème (93, 2000s, ninho…). Générées au build,
 * canoniques, listées dans le sitemap, avec données structurées VideoGame + FAQPage +
 * BreadcrumbList. Chaque page lance le jeu en un tap avec le bon lien profond.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_LANDINGS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const l = findLanding(slug);
  if (!l) return {};
  const url = `${SITE}/blindtest/${l.slug}`;
  return {
    title: l.metaTitle,
    description: l.description,
    alternates: { canonical: url },
    openGraph: { title: l.metaTitle, description: l.description, url, type: "website", images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: l.metaTitle, description: l.description, images: ["/og.png"] },
  };
}

const MODE_LINKS = [
  { href: "/blindtest/solo", label: "Solo", Icon: Play },
  { href: "/blindtest/entre-amis", label: "Entre amis", Icon: Users },
  { href: "/blindtest/en-ligne", label: "En ligne", Icon: Globe },
  { href: "/blindtest/soiree", label: "En soirée", Icon: Tv },
];

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = findLanding(slug);
  if (!l) notFound();
  const url = `${SITE}/blindtest/${l.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoGame",
        "@id": `${url}#game`,
        name: l.title,
        url,
        description: l.description,
        genre: ["Quiz musical", "Jeu de soirée", "Blind test"],
        gamePlatform: "Navigateur web (mobile, tablette, ordinateur, TV)",
        applicationCategory: "GameApplication",
        operatingSystem: "iOS, Android, Windows, macOS",
        playMode: ["SinglePlayer", "MultiPlayer"],
        inLanguage: "fr-FR",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
        publisher: { "@type": "Organization", name: "DailyRapFrance", url: SITE },
        isPartOf: { "@id": `${SITE}/blindtest#game` },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: l.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "DailyRapFrance", item: SITE },
          { "@type": "ListItem", position: 2, name: "Blind test rap français", item: `${SITE}/blindtest` },
          { "@type": "ListItem", position: 3, name: l.title, item: url },
        ],
      },
    ],
  };

  const relatedThemes = l.kind === "theme" && l.theme
    ? THEME_LANDINGS.filter((t) => t.theme?.category === l.theme?.category && t.slug !== l.slug).slice(0, 8)
    : THEME_LANDINGS.slice(0, 8);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-3xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-16">
        <nav aria-label="Fil d'Ariane" className="text-xs text-ink-faint mb-5 flex items-center gap-1.5 flex-wrap">
          <a href="/" className="hover:text-ink">DailyRapFrance</a>
          <span aria-hidden="true">›</span>
          <a href="/blindtest" className="hover:text-ink">Blind test rap français</a>
          <span aria-hidden="true">›</span>
          <span className="text-ink-muted">{l.kind === "theme" ? l.theme?.label : MODE_LINKS.find((m) => m.href === `/blindtest/${l.slug}`)?.label ?? l.title}</span>
        </nav>

        <div className="flex items-center gap-2 text-xs font-semibold text-gold mb-3">
          <BrandMark size={12} /> Gratuit · Sans inscription · Dans le navigateur
        </div>
        <h1 className="poster-title text-3xl sm:text-5xl mb-5">{l.title}</h1>
        <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl">{l.intro}</p>

        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <a href={l.playHref} className="game-btn game-btn-primary h-14 px-7 text-base gap-2.5 w-full sm:w-auto">
            <Play size={18} fill="currentColor" /> {l.playLabel}
          </a>
          {l.kind === "theme" && l.theme && (
            <a
              href={`/jouer?mode=local&theme=${l.theme.id}`}
              className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full glass text-sm font-medium hover:border-gold/40 transition-colors"
            >
              <Users size={16} className="text-gold" /> Entre potes sur ce thème
            </a>
          )}
        </div>

        <ul className="mt-8 grid sm:grid-cols-3 gap-2.5 text-sm">
          {[
            "Extraits de 30 s fournis par Deezer, nouveaux à chaque partie",
            "Mode facile (3 propositions) ou difficile (écrire la réponse)",
            "Se joue en France, Belgique, Suisse, Québec — partout où il y a internet",
          ].map((b) => (
            <li key={b} className="card p-3.5 flex items-start gap-2.5 text-ink-muted">
              <Check size={15} className="text-gold shrink-0 mt-0.5" /> {b}
            </li>
          ))}
        </ul>

        <section className="mt-12" aria-labelledby="modes-h">
          <h2 id="modes-h" className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-3">
            {l.kind === "theme" ? "Ce thème se joue à toutes les sauces" : "Les autres façons de jouer"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {MODE_LINKS.filter((m) => m.href !== `/blindtest/${l.slug}`).map((m) => (
              <a key={m.href} href={l.kind === "theme" && l.theme ? `${MODE_LANDINGS.find((x) => `/blindtest/${x.slug}` === m.href)?.playHref}&theme=${l.theme.id}` : m.href} className="card p-4 flex items-center gap-3 text-sm font-medium">
                <m.Icon size={16} className="text-gold" /> {m.label}
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="faq-h">
          <h2 id="faq-h" className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-4">Questions fréquentes</h2>
          <div className="divide-y divide-white/8 border-y border-white/8">
            {l.faq.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-semibold">
                  {f.q}
                  <ArrowRight size={14} className="text-ink-faint shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-sm text-ink-muted leading-relaxed mt-2 max-w-2xl">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="themes-h">
          <h2 id="themes-h" className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-1">
            {l.kind === "theme" ? "Dans la même catégorie" : "Choisis ton thème"}
          </h2>
          <p className="text-sm text-ink-faint mb-4">
            {THEME_CATEGORIES.join(" · ")} — {THEME_LANDINGS.length} thèmes au total.
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedThemes.map((t) => (
              <a key={t.slug} href={`/blindtest/${t.slug}`} className="rounded-full glass px-3.5 py-2 text-sm hover:border-gold/40 transition-colors">
                {t.theme?.label}
              </a>
            ))}
            <a href="/blindtest" className="rounded-full px-3.5 py-2 text-sm text-gold hover:text-glow">
              Tous les thèmes →
            </a>
          </div>
        </section>

        <section className="mt-12">
          <AppStoreCallout compact />
        </section>
      </article>
    </>
  );
}
