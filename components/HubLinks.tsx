import { ChevronRight } from "lucide-react";
import type { NavLink } from "@/lib/sitemapNav";

/*
 * Grille de raccourcis — la même brique sur le hub /jouer (« Autour du jeu »), sur le
 * profil (« Mon espace ») et dans le tiroir mobile. Deux colonnes sur mobile, chaque
 * tuile = icône + titre + sous-titre, lisible en un coup d'œil.
 */
export default function HubLinks({ links, title, columns = 2, compact }: { links: NavLink[]; title?: string; columns?: 2 | 3; compact?: boolean }) {
  return (
    <section aria-label={title}>
      {title && <p className="stage-kicker mb-2.5">{title}</p>}
      <div className={`hub-links ${columns === 3 ? "hub-links-3" : ""}`} data-compact={compact ? "true" : undefined}>
        {links.map((l) => (
          <a key={l.href} href={l.href} className="hub-link">
            <span className="hub-link-icon"><l.Icon size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="hub-link-title">{l.label}{l.tag && <span className="choice-tag ml-1.5">{l.tag}</span>}</span>
              {l.sub && !compact && <span className="hub-link-sub">{l.sub}</span>}
            </span>
            <ChevronRight size={16} className="hub-link-go" />
          </a>
        ))}
      </div>
    </section>
  );
}
