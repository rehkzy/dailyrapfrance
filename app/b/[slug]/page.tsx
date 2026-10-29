import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { Play, Users, Sparkles, Music2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { encodeCustomSet, customPlayHref } from "@/lib/customBlindtest";
import VerifiedBadge from "@/components/VerifiedBadge";
import { jsonLd as toJsonLd } from "@/lib/jsonld";

const SITE = "https://dailyrapfrance.best";

/*
 * /b/<slug> — la page d'un blind test créé par un joueur : une vraie page (titre, couverture,
 * auteur, nombre de titres, bouton Jouer), indexable et partageable. Avec ?go=1 (boutons
 * « Jouer » du site), on saute la page et on lance directement /jouer?custom=….
 * Le jeu reste 100 % porté par l'URL : `b` ne sert qu'au compteur et au classement.
 */
type Row = { title: string; description: string | null; cover: string | null; track_ids: number[]; settings: { s?: number; a?: "qcm" | "text" } | null; plays: number; is_public: boolean; created_at: string; profiles: { username: string | null; display_name: string | null; verified?: boolean } | { username: string | null; display_name: string | null; verified?: boolean }[] | null };

async function load(slug: string): Promise<Row | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("custom_blindtests").select("title, description, cover, track_ids, settings, plays, is_public, created_at, profiles(username, display_name, verified)").eq("slug", slug).maybeSingle();
  return (data as Row | null) ?? null;
}
function playHref(slug: string, d: Row, mode?: string, autostart = false) {
  const settings = d.settings ?? {};
  const code = encodeCustomSet({ v: 1, t: d.title, i: d.track_ids.map(Number), d: d.description ?? undefined, s: settings.s, a: settings.a });
  return customPlayHref(code, { b: slug, ...(mode ? { mode } : {}), ...(autostart ? { autostart: "1" } : {}) });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Blind test introuvable — DailyRapFrance" };
  const title = `${d.title} — Blind test | DailyRapFrance`;
  const description = d.description || `Un blind test de ${d.track_ids.length} titres, fait maison sur DailyRapFrance. Tu joues ?`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/b/${slug}` },
    robots: d.is_public ? undefined : { index: false, follow: false },
    openGraph: { title: `${d.title} — Blind test`, description, url: `${SITE}/b/${slug}`, type: "website", images: [d.cover ? { url: d.cover } : { url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: `${d.title} — Blind test`, description, images: [d.cover ?? "/og.png"] },
  };
}

export default async function ShortLinkPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mode?: string; go?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const d = await load(slug);
  if (!d) notFound();
  if (sp.go === "1" || sp.mode) redirect(playHref(slug, d, sp.mode ?? "solo", sp.go === "1" && !sp.mode));

  const p = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
  const author = p?.display_name ?? p?.username ?? "un joueur";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: `${d.title} — Blind test`,
    url: `${SITE}/b/${slug}`,
    description: d.description || `Blind test de ${d.track_ids.length} titres créé par ${author} sur DailyRapFrance.`,
    genre: ["Quiz musical", "Blind test"],
    isAccessibleForFree: true,
    author: { "@type": "Person", name: author, ...(p?.username ? { url: `${SITE}/profil/${p.username}` } : {}) },
    publisher: { "@type": "Organization", name: "DailyRapFrance", url: SITE },
    ...(d.cover ? { image: d.cover } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <section className="max-w-2xl mx-auto px-5 sm:px-6 pt-8 sm:pt-14 pb-32">
        <p className="stage-kicker mb-3 inline-flex items-center gap-1.5"><Sparkles size={13} /> Blind test créé par un joueur</p>
        <div className="ticket overflow-hidden mb-5">
          <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-gradient-to-br from-[#3a0a0f] via-[#8a0010] to-[#f0001c]">
            {d.cover && <img src={d.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <span className="absolute right-3 bottom-3 rounded-full bg-black/60 backdrop-blur text-xs font-bold text-white px-2.5 py-1 inline-flex items-center gap-1"><Music2 size={12} /> {d.track_ids.length} titres</span>
          </div>
          <div className="p-5 sm:p-6">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">{d.title}</h1>
            <p className="text-sm text-ink-faint mt-1.5 flex items-center gap-1 flex-wrap">
              par {p?.username ? <a href={`/profil/${p.username}`} className="font-semibold text-ink hover:text-glow inline-flex items-center gap-1">{author}{p.verified && <VerifiedBadge size={13} />}</a> : <span className="font-semibold text-ink">{author}</span>}
              <span>· {d.plays} partie{d.plays > 1 ? "s" : ""}{d.settings?.s ? ` · extraits de ${d.settings.s} s` : ""}{d.settings?.a === "text" ? " · réponse à écrire" : d.settings?.a === "qcm" ? " · QCM" : ""}</span>
            </p>
            {d.description && <p className="text-ink-muted mt-3">{d.description}</p>}
            <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
              <a href={playHref(slug, d, "solo", true)} className="sticker h-14 text-base"><Play size={18} fill="currentColor" /> Jouer en solo</a>
              <a href={playHref(slug, d, "local")} className="sticker sticker-ghost h-14 text-base"><Users size={18} /> Entre potes, même téléphone</a>
            </div>
            <p className="text-[11px] text-ink-faint mt-3">Sans compte, dans le navigateur. Extraits officiels de 30 secondes.</p>
          </div>
        </div>
        <p className="text-sm text-ink-muted">Envie du tien ? <a href="/creer" className="text-glow font-semibold">Crée ton blind test</a> avec tes morceaux ou ta playlist Spotify, et partage le lien.</p>
      </section>
    </>
  );
}
