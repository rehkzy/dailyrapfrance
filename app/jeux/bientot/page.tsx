import { Clock3, Bell } from "lucide-react";
import BorderMagicButton from "@/components/ui/BorderMagicButton";

export const metadata = {
  title: "Bientôt disponible — DailyRapFrance",
};

/*
 * /jeux/bientot — écran partagé "Bientôt disponible" pour tout jeu de l'arcade
 * pas encore jouable. Un seul fichier à maintenir plutôt qu'un état "coming
 * soon" dupliqué dans chaque page de jeu individuelle. Personnalisable via
 * ?titre=Nom+du+jeu — retombe sur un texte générique si absent.
 *
 * CTA vers les deux jeux réellement jouables aujourd'hui (Blind Test, Artists
 * Manager 2026) plutôt que de laisser le visiteur sur une impasse.
 */

export default async function BientotPage({
  searchParams,
}: {
  searchParams: Promise<{ titre?: string }>;
}) {
  const { titre } = await searchParams;
  const label = titre && titre.trim().length > 0 ? titre : "Ce jeu";

  return (
    <section className="max-w-md mx-auto px-6 pt-20 pb-32 text-center">
      <div className="w-16 h-16 rounded-2xl glass-strong flex items-center justify-center mx-auto mb-6">
        <Clock3 size={26} className="text-gold" />
      </div>
      <p className="font-mono text-xs text-gold tracking-[0.2em] uppercase mb-3">Bientôt disponible</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-4">{label} arrive bientôt</h1>
      <p className="text-ink-muted text-sm leading-relaxed mb-10">
        On y travaille — ce jeu n&apos;est pas encore jouable. En attendant, deux jeux de l&apos;arcade
        sont déjà là : le Blind Test et Artists Manager 2026.
      </p>

      <div className="flex flex-col gap-3">
        <BorderMagicButton href="/jouer?play=1" size="lg" fullWidth>
          Jouer au Blind Test
        </BorderMagicButton>
        <a
          href="/jeux/artists-manager"
          className="inline-flex items-center justify-center gap-2 glass rounded-2xl px-6 h-14 text-sm font-semibold hover:border-gold/40 transition-colors"
        >
          Découvrir Artists Manager 2026
        </a>
      </div>

      <a
        href="/jouer"
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-ink-faint hover:text-gold transition-colors mt-10"
      >
        <Bell size={13} /> Voir tous les jeux de l&apos;arcade
      </a>
    </section>
  );
}
