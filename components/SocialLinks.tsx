"use client";

import { InstagramIcon, TikTokIcon, XIcon } from "@/components/SocialIcons";
import { trackEvent } from "@/lib/track";

// Extrait de app/page.tsx (Server Component) — un onClick ne peut pas être passé
// directement à un élément rendu dans un Server Component ("Event handlers cannot be
// passed to Client Component props"), d'où ce petit composant client dédié. Le reste de
// la page d'accueil reste server-rendered comme avant.
const socials = [
  { label: "Instagram", href: "https://www.instagram.com/dailyrapfrance/", Icon: InstagramIcon },
  { label: "TikTok", href: "https://www.tiktok.com/@dailyrapfrance", Icon: TikTokIcon },
  { label: "X", href: "https://x.com/DailyRapFrance", Icon: XIcon },
];

export default function SocialLinks() {
  return (
    <>
      {socials.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("social_click", { network: s.label })}
          className="glass rounded-full pl-4 pr-6 py-3 text-sm font-medium hover:bg-white/10 hover:border-gold/40 transition-colors flex items-center gap-2"
        >
          <s.Icon />
          {s.label}
        </a>
      ))}
    </>
  );
}
