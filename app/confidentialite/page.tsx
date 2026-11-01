export const metadata = {
  title: "Politique de confidentialité — DailyRapFrance",
  description: "Quelles données DailyRapFrance collecte, pourquoi, et comment les supprimer.",
  alternates: { canonical: "https://dailyrapfrance.best/confidentialite" },
};

/* Page demandée par Google (écran de consentement OAuth) et utile à tout le monde : courte, en
   français clair, sans jargon. */
export default function ConfidentialitePage() {
  return (
    <section className="max-w-2xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-32">
      <p className="stage-kicker mb-2">Confidentialité</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Tes données, en clair.</h1>
      <p className="text-ink-muted mb-8">Dernière mise à jour : novembre 2026. DailyRapFrance est un média et un jeu de blind test rap français, édité en France.</p>

      <div className="space-y-6 text-sm leading-relaxed text-ink-muted [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <div>
          <h2>Ce qu&apos;on collecte</h2>
          <ul>
            <li><strong className="text-ink">Sans compte</strong> : rien de nominatif. Les scores et réglages restent dans ton navigateur. Une mesure d&apos;audience (pages vues, pays, appareil) est faite à partir de l&apos;adresse IP, sans profil publicitaire.</li>
            <li><strong className="text-ink">Avec un compte</strong> (Google ou e-mail) : ton adresse e-mail, le nom et la photo fournis par Google si tu te connectes avec Google (tu peux les changer dès la première connexion), ton pseudo, tes scores, tes amis, tes blind tests créés, et ta présence dans les salons en ligne.</li>
            <li><strong className="text-ink">Notifications</strong> : si tu les actives, un identifiant technique de ton navigateur, uniquement pour t&apos;envoyer les alertes que tu as demandées (adversaire trouvé). Désactivable à tout moment dans Mon compte.</li>
          </ul>
        </div>
        <div>
          <h2>Pourquoi</h2>
          <p>Faire tourner le jeu (classements, salons, défi de la semaine, profil), améliorer le site, et t&apos;écrire au sujet de ton compte. Jamais de revente, jamais de publicité ciblée.</p>
        </div>
        <div>
          <h2>Avec qui</h2>
          <p>Nos prestataires techniques, qui n&apos;utilisent tes données que pour nous : Supabase (base de données et connexion), Vercel (hébergement), Google (connexion Google et mesure d&apos;audience), Deezer et YouTube (extraits et clips, sans transmission de ton compte), Resend (e-mails).</p>
        </div>
        <div>
          <h2>Combien de temps</h2>
          <p>Tant que ton compte existe. Les salons en ligne sont supprimés automatiquement après la partie. Les journaux de visites sont conservés 12 mois au plus.</p>
        </div>
        <div>
          <h2>Tes droits</h2>
          <p>Accès, rectification, suppression, opposition : tout se fait depuis Mon compte, ou en écrivant à <a href="mailto:contact@dailyrapfrance.best" className="text-glow font-semibold">contact@dailyrapfrance.best</a>. La suppression de ton compte efface ton profil, tes scores, tes amis et tes blind tests. Tu peux aussi saisir la CNIL.</p>
        </div>
        <div>
          <h2>Cookies</h2>
          <p>Uniquement ceux nécessaires à la connexion et au bon fonctionnement du jeu. Pas de cookie publicitaire.</p>
        </div>
      </div>
    </section>
  );
}
