import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ARTISTS } from "@/lib/artists";
import { resolveArtist } from "@/lib/deezerArtist";
import { SITE } from "@/lib/seo";
import { jsonLd as toJsonLd } from "@/lib/jsonld";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Les meilleurs sons des rappeurs français — top 10 par artiste | DailyRapFrance",
  description: "Pour chaque rappeur, ses 10 sons les plus écoutés, sa discographie et son blind test : Ninho, Booba, PNL, SCH, JUL, Nekfeu, Werenoi, Gazo, Damso et 35 autres.",
  alternates: { canonical: `${SITE}/artistes` },
  openGraph: { title: "Les meilleurs sons des rappeurs français, artiste par artiste", description: "Top 10, discographie et blind test pour 45 rappeurs.", url: `${SITE}/artistes`, type: "website", images: [{ url: "/og.png", width: 1200, height: 630 }] },
};

export default async function ArtistsIndex() {
  const sorted = [...ARTISTS].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const photos = await Promise.all(sorted.map((a) => resolveArtist(a.name)));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Les meilleurs sons des rappeurs français",
    url: `${SITE}/artistes`,
    isPartOf: { "@id": `${SITE}/#website` },
    hasPart: sorted.map((a) => ({ "@type": "WebPage", name: `Les meilleurs sons de ${a.name}`, url: `${SITE}/artistes/${a.slug}` })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <section className="max-w-3xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-20">
        <p className="stage-kicker mb-2">Artistes</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.02] mb-3">Les meilleurs sons, rappeur par rappeur.</h1>
        <p className="text-ink-muted mb-8">Pour chaque artiste : les 10 titres les plus écoutés (mis à jour chaque jour), la discographie, et son blind test pour vérifier que tu les connais vraiment.</p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sorted.map((a, i) => (
            <li key={a.slug}>
              <a href={`/artistes/${a.slug}`} className="card card-lift flex items-center gap-3 p-3">
                {photos[i]?.picture_medium ? <img src={photos[i]!.picture_medium} alt="" width={44} height={44} loading="lazy" className="w-11 h-11 rounded-full object-cover border border-white/10" /> : <span className="w-11 h-11 rounded-full bg-gold/20" aria-hidden="true" />}
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{a.name}</span><span className="block text-[11px] text-ink-faint">Top 10 · blind test</span></span>
                <ArrowRight size={14} className="text-ink-faint shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
