import { InstagramIcon, TikTokIcon, XIcon } from "./SocialIcons";

const links = [
  { href: "/a-propos", label: "À propos" },
  { href: "/blindtest", label: "Blind Test" },
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
      <div className="max-w-6xl mx-auto px-6 py-14 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-10">
        <div>
          <img src="/logo.svg" alt="DailyRapFrance" className="h-8 w-auto mb-5" />
          <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
            Le rap français raconté depuis 2020, sans le flux interchangeable.
          </p>
        </div>

        <ul className="flex gap-8">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm text-ink-muted hover:text-ink transition-colors">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
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
