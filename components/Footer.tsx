import { InstagramIcon, TikTokIcon, XIcon } from "./SocialIcons";
import BrandMark from "@/components/BrandMark";

const columns = [
  {
    title: "Jouer",
    links: [
      { href: "/jouer?mode=solo", label: "Solo" },
      { href: "/jouer?mode=local", label: "Entre potes" },
      { href: "/jouer?mode=online", label: "Salon en ligne" },
      { href: "/jouer?mode=party", label: "Soirée TV" },
      { href: "/jouer?mode=clips", label: "Devine le clip" },
    ],
  },
  {
    title: "Communauté",
    links: [
      { href: "/blindtest/classement", label: "Classement" },
      { href: "/amis", label: "Amis" },
      { href: "/parametres", label: "Mon compte" },
    ],
  },
  {
    title: "DailyRapFrance",
    links: [
      { href: "/a-propos", label: "Notre histoire" },
      { href: "/blindtest", label: "Le blind test" },
      { href: "/blindtest/soiree", label: "Blind test en soirée" },
    ],
  },
];

const socials = [
  { label: "Instagram", href: "https://www.instagram.com/dailyrapfrance/", Icon: InstagramIcon },
  { label: "TikTok", href: "https://www.tiktok.com/@dailyrapfrance", Icon: TikTokIcon },
  { label: "X", href: "https://x.com/DailyRapFrance", Icon: XIcon },
];

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/8">
      <div className="glow-line" />
      <div className="max-w-6xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <img src="/logo.svg" alt="DailyRapFrance" className="h-8 w-auto mb-5" />
          <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
            Le média du rap français depuis 2020 — et le blind test qu&apos;on lance entre potes, en soirée, ou cinq minutes dans le métro.
          </p>
          <div className="flex items-center gap-2.5 mt-6">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="glass w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-gold hover:border-gold/40 transition-colors"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-semibold mb-3">{c.title}</p>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm text-ink-muted hover:text-ink transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-10 flex items-center justify-between gap-6 text-xs text-ink-faint">
        <span className="inline-flex items-center gap-2">
          <BrandMark size={12} className="text-gold" />
          DailyRapFrance — depuis 2020, Paris.
        </span>
        <span>Gratuit — compte en 10 secondes.</span>
      </div>
    </footer>
  );
}
