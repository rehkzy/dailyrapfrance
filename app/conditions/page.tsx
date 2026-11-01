export const metadata = {
  title: "Conditions d'utilisation — DailyRapFrance",
  description: "Les règles du jeu pour utiliser DailyRapFrance : comptes, blind tests créés, comportement, contenus.",
  alternates: { canonical: "https://dailyrapfrance.best/conditions" },
};

export default function ConditionsPage() {
  return (
    <section className="max-w-2xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-32">
      <p className="stage-kicker mb-2">Conditions d&apos;utilisation</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Les règles du jeu.</h1>
      <p className="text-ink-muted mb-8">Dernière mise à jour : novembre 2026. En utilisant DailyRapFrance, tu acceptes ces règles — elles tiennent en quelques lignes.</p>

      <div className="space-y-6 text-sm leading-relaxed text-ink-muted [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <div>
          <h2>Le service</h2>
          <p>DailyRapFrance propose gratuitement des blind tests (solo, entre amis, en ligne, en soirée), un créateur de blind tests, des classements, et une rubrique d&apos;actualité. Les extraits musicaux (30 s) et les clips proviennent de Deezer et de YouTube et restent la propriété de leurs ayants droit.</p>
        </div>
        <div>
          <h2>Ton compte</h2>
          <ul>
            <li>Un compte par personne, 13 ans minimum (ou avec l&apos;accord d&apos;un parent).</li>
            <li>Choisis un pseudo et une photo qui ne trompent personne et ne blessent personne.</li>
            <li>Tu es responsable de ce qui se passe avec ton compte ; préviens-nous s&apos;il est compromis.</li>
          </ul>
        </div>
        <div>
          <h2>Ce que tu publies</h2>
          <p>Les blind tests que tu crées et rends publics, leurs titres, descriptions et couvertures, sont visibles de tous. Tu dois avoir le droit d&apos;utiliser l&apos;image choisie. Nous pouvons retirer ou rendre privé un contenu contraire à ces règles, à la loi, ou simplement hors sujet.</p>
        </div>
        <div>
          <h2>Fair-play</h2>
          <p>Pas de triche (scripts, scores manipulés, comptes multiples en matchmaking), pas de harcèlement, pas de spam. En cas d&apos;abus, le compte peut être suspendu ou supprimé.</p>
        </div>
        <div>
          <h2>Concours et parrainage</h2>
          <p>Les opérations ponctuelles (places de concert, lots) ont leurs propres conditions, indiquées sur la page de l&apos;opération. Les gains ne sont ni échangeables ni remboursables.</p>
        </div>
        <div>
          <h2>Disponibilité et responsabilité</h2>
          <p>Le service est fourni tel quel, sans garantie de disponibilité permanente ; il peut évoluer ou s&apos;interrompre. Nous ne sommes pas responsables des contenus des sites tiers vers lesquels nous renvoyons.</p>
        </div>
        <div>
          <h2>Contact</h2>
          <p><a href="mailto:contact@dailyrapfrance.best" className="text-glow font-semibold">contact@dailyrapfrance.best</a> — droit français, tribunaux français compétents.</p>
        </div>
      </div>
    </section>
  );
}
