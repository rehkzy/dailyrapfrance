import { InstagramIcon, TikTokIcon, XIcon } from "./SocialIcons";

const columns = [
  {
    title: "Média",
    links: [
      { href: "/mag", label: "Mag" },
      { href: "/artistes", label: "Artistes" },
      { href: "/sorties", label: "Sorties" },
      { href: "/a-propos", label: "À propos" },
    ],
  },
  {
    title: "Data",
    links: [
      { href: "/charts", label: "Charts" },
      { href: "/certifications", label: "Certifications" },
      { href: "/explorer/graphe", label: "Graphe relationnel" },
      { href: "/explorer/comparer", label: "Comparateur" },
    ],
  },
  {
    title: "Jeu",
    links: [{ href: "/blindtest", label: "Blind Test" }],
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
          <img src="/logo.svg" alt="DailyRapFrance" className="h-6 w-auto mb-4" />
          <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
            Le rap français raconté depuis 2020 — actus, artistes, sorties et culture,
            sans le flux interchangeable.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-faint mb-4">
              {col.title}
            </p>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
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

      <div className="max-w-6xl mx-auto px-6 pb-10 flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-6">
        <span className="text-xs text-ink-faint">DailyRapFrance — depuis 2020. Paris, France.</span>
        <div className="flex items-center gap-3">
          {socials.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="glass w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-gold hover:border-gold/40 transition-colors"
            >
              <Icon />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
