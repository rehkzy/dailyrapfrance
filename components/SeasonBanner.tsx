import { Sparkles, PartyPopper, Gift } from "lucide-react";

/*
 * Bandeau saisonnier, piloté par la date (heure de Paris), zéro intervention :
 *  · 20 nov → 24 déc : Noël en famille + Rétro 2026
 *  · 25 déc → 1er jan : Nouvel An
 *  · 2 jan → 10 jan : Rétro 2026 (dernier tour) puis plus rien
 */
function parisMonthDay(): [number, number] {
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "numeric", day: "numeric" }).formatToParts(new Date());
  return [Number(p.find((x) => x.type === "month")?.value), Number(p.find((x) => x.type === "day")?.value)];
}

export function seasonSlot(): "noel" | "nouvel-an" | "retro" | null {
  const [m, d] = parisMonthDay();
  if ((m === 11 && d >= 20) || (m === 12 && d <= 24)) return "noel";
  if ((m === 12 && d >= 25) || (m === 1 && d <= 1)) return "nouvel-an";
  if (m === 1 && d <= 10) return "retro";
  return null;
}

export default function SeasonBanner({ compact = false }: { compact?: boolean }) {
  const slot = seasonSlot();
  if (!slot) return null;
  const c = slot === "noel"
    ? { Icon: Gift, kicker: "Spécial fêtes", title: "Le blind test de Noël en famille", sub: "Par génération : 90s, 2000s, 2010s, 2026. La TV diffuse, les téléphones répondent.", href: "/blindtest/noel", cta: "Préparer", alt: { href: "/blindtest/retro-2026", label: "Rétro 2026" } }
    : slot === "nouvel-an"
      ? { Icon: PartyPopper, kicker: "Réveillon", title: "Le jeu de ton Nouvel An", sub: "Rétro 2026 pour chauffer, Mix toutes époques après minuit, gages pour le dernier.", href: "/blindtest/nouvel-an", cta: "Lancer la soirée", alt: { href: "/blindtest/retro-2026", label: "Rétro 2026" } }
      : { Icon: Sparkles, kicker: "Dernier tour", title: "Rétro 2026 : les sons de l'année", sub: "Avant de tourner la page, ton score sur les morceaux qui ont fait 2026.", href: "/blindtest/retro-2026", cta: "Jouer", alt: null };
  return (
    <a href={c.href} className={`season-banner ${compact ? "compact" : ""}`}>
      <span className="season-ic"><c.Icon size={compact ? 18 : 22} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] uppercase tracking-wider font-bold text-gold">{c.kicker}</span>
        <span className="block font-display font-bold leading-tight" style={{ fontSize: compact ? 15 : 18 }}>{c.title}</span>
        {!compact && <span className="block text-xs text-ink-muted mt-0.5">{c.sub}</span>}
      </span>
      <span className="sticker sticker-sm shrink-0">{c.cta}</span>
    </a>
  );
}
