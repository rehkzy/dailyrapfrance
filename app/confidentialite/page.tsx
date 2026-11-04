export const metadata = {
  title: "Politique de confidentialité — DailyRapFrance",
  description: "Quelles données DailyRapFrance collecte (y compris via la connexion Google), pourquoi, avec qui, combien de temps, et comment les consulter ou les supprimer.",
  alternates: { canonical: "https://dailyrapfrance.best/confidentialite" },
};

/* Page demandée par Google (écran de consentement OAuth) et utile à tout le monde : complète
   mais en français clair. Google vérifie qu'elle détaille précisément les données collectées,
   leur usage, leur partage, leur conservation, et les droits de l'utilisateur. */
const UPDATED = "4 novembre 2026";

export default function ConfidentialitePage() {
  return (
    <section className="max-w-2xl mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-32">
      <p className="stage-kicker mb-2">Confidentialité</p>
      <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">Politique de confidentialité de DailyRapFrance</h1>
      <p className="text-ink-muted mb-8">
        Dernière mise à jour : {UPDATED}. DailyRapFrance (dailyrapfrance.best) est un média et un jeu de blind test consacrés au rap
        français, édité en France par Florian B. (« nous »). Cette page décrit les données que nous traitons lorsque tu utilises le
        site ou l&apos;application web, pourquoi, avec qui, combien de temps, et comment exercer tes droits.
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-ink-muted [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_table]:w-full [&_th]:text-left [&_th]:text-ink [&_th]:font-semibold [&_th]:py-1.5 [&_td]:py-1.5 [&_td]:align-top [&_td]:border-t [&_td]:border-white/8">
        <div>
          <h2>1. Responsable du traitement</h2>
          <p>
            Florian B., éditeur de DailyRapFrance, France. Contact pour toute question relative à tes données :{" "}
            <a href="mailto:contact@dailyrapfrance.best" className="text-glow font-semibold">contact@dailyrapfrance.best</a>.
          </p>
        </div>

        <div>
          <h2>2. Les données que nous collectons</h2>
          <h3>Si tu joues sans compte</h3>
          <ul>
            <li>Aucune donnée nominative. Tes scores, réglages et parties restent dans ton navigateur (stockage local).</li>
            <li>Une mesure d&apos;audience : pages vues, pays et ville approximatifs (déduits de l&apos;adresse IP), type d&apos;appareil et navigateur, page d&apos;origine. L&apos;adresse IP est utilisée pour cette déduction et pour la sécurité (anti-abus), sans profil publicitaire.</li>
          </ul>
          <h3>Si tu crées un compte</h3>
          <ul>
            <li><strong className="text-ink">Identité</strong> : adresse e-mail, pseudo, nom d&apos;affichage, photo de profil (facultative), bannière et biographie si tu les renseignes.</li>
            <li><strong className="text-ink">Jeu</strong> : scores, thèmes joués, série de jours, classements, blind tests que tu crées (titres choisis, nom, visuel), amis, salons en ligne rejoints, messages envoyés dans le chat d&apos;un salon, parrainages (qui t&apos;a invité, qui tu as invité).</li>
            <li><strong className="text-ink">Technique</strong> : date de création et de dernière connexion, et, si tu actives les notifications, un identifiant de notification propre à ton navigateur (abonnement push).</li>
          </ul>
          <h3>Si tu te connectes avec Google</h3>
          <p>
            Lorsque tu choisis « Continuer avec Google », Google nous transmet, avec ton accord sur l&apos;écran de consentement Google, les
            informations de base de ton compte Google : <strong className="text-ink">ton adresse e-mail, ton nom et ta photo de profil</strong>
            (périmètres <code>email</code> et <code>profile</code>). Nous n&apos;accédons à rien d&apos;autre : ni à tes contacts, ni à ton agenda,
            ni à tes fichiers, ni à tes e-mails.
          </p>
          <ul>
            <li>L&apos;adresse e-mail sert à créer et identifier ton compte, à te reconnecter, et à t&apos;envoyer les e-mails liés au compte.</li>
            <li>Le nom et la photo servent de pseudo et d&apos;avatar par défaut ; tu peux les remplacer dès la première connexion et à tout moment dans Mon compte.</li>
            <li>Ces informations ne sont jamais vendues, jamais cédées à des tiers, jamais utilisées pour de la publicité, et ne servent à aucun autre usage que le fonctionnement de DailyRapFrance.</li>
            <li>L&apos;utilisation que DailyRapFrance fait des informations reçues des API Google respecte la{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-glow font-semibold">Google API Services User Data Policy</a>, y compris ses exigences d&apos;utilisation limitée (Limited Use).</li>
            <li>Tu peux retirer l&apos;accès de DailyRapFrance à ton compte Google à tout moment depuis{" "}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-glow font-semibold">myaccount.google.com/permissions</a>.</li>
          </ul>
        </div>

        <div>
          <h2>3. Pourquoi nous les utilisons</h2>
          <table>
            <thead><tr><th>Finalité</th><th>Données</th><th>Base légale</th></tr></thead>
            <tbody>
              <tr><td>Faire fonctionner le jeu : compte, scores, classements, défi de la semaine, salons en ligne, chat, amis, blind tests créés</td><td>Identité, jeu</td><td>Exécution du service que tu demandes</td></tr>
              <tr><td>Connexion et sécurité du compte</td><td>E-mail, données Google de base, technique</td><td>Exécution du service, intérêt légitime (sécurité)</td></tr>
              <tr><td>Notifications (adversaire trouvé, invitation)</td><td>Abonnement push</td><td>Ton consentement, retirable à tout moment</td></tr>
              <tr><td>Parrainage et tirage au sort</td><td>Parrainages, e-mail du gagnant</td><td>Exécution du service, règlement du jeu-concours</td></tr>
              <tr><td>Mesure d&apos;audience et amélioration du site</td><td>Pages vues, pays, appareil</td><td>Intérêt légitime</td></tr>
              <tr><td>E-mails liés au compte (bienvenue, sécurité)</td><td>E-mail</td><td>Exécution du service</td></tr>
            </tbody>
          </table>
          <p className="mt-3">Nous ne faisons ni revente de données, ni publicité ciblée, ni profilage. Nous ne prenons aucune décision automatisée ayant un effet juridique sur toi.</p>
        </div>

        <div>
          <h2>4. Avec qui nous les partageons</h2>
          <p>Uniquement des prestataires techniques, qui traitent les données pour notre compte et selon nos instructions :</p>
          <ul>
            <li><strong className="text-ink">Supabase</strong> (base de données, authentification, temps réel, stockage des avatars) — hébergement dans l&apos;Union européenne.</li>
            <li><strong className="text-ink">Vercel</strong> (hébergement du site, protection contre les abus).</li>
            <li><strong className="text-ink">Google</strong> (connexion avec Google ; mesure d&apos;audience via Google Analytics, anonymisée).</li>
            <li><strong className="text-ink">Deezer et YouTube</strong> (extraits audio et clips du blind test) : ton navigateur charge les extraits directement depuis leurs serveurs ; nous ne leur transmettons pas ton compte.</li>
            <li><strong className="text-ink">Resend</strong> (envoi des e-mails liés au compte).</li>
          </ul>
          <p className="mt-2">Certains de ces prestataires peuvent traiter des données hors de l&apos;Union européenne ; ils s&apos;appuient alors sur les clauses contractuelles types de la Commission européenne. Nous pouvons aussi communiquer des données si la loi nous y oblige.</p>
          <p className="mt-2">Ce qui est public sur le site : ton pseudo, ta photo, ta bannière, ta bio, tes scores dans les classements, tes blind tests rendus publics, et ton profil (/profil/ton-pseudo). Ton adresse e-mail n&apos;est jamais affichée.</p>
        </div>

        <div>
          <h2>5. Combien de temps</h2>
          <ul>
            <li>Les données de ton compte : tant que ton compte existe, puis suppression dans les 30 jours après sa suppression.</li>
            <li>Les salons en ligne et leurs messages de chat : supprimés automatiquement à la fin de la partie ou après inactivité.</li>
            <li>Les journaux de visites et de sécurité : 12 mois au plus.</li>
            <li>Les abonnements aux notifications : jusqu&apos;à désactivation, ou jusqu&apos;à ce que ton navigateur les révoque.</li>
          </ul>
        </div>

        <div>
          <h2>6. Tes droits</h2>
          <p>
            Conformément au RGPD, tu disposes d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de
            portabilité, et du droit de retirer ton consentement à tout moment.
          </p>
          <ul>
            <li><strong className="text-ink">Modifier</strong> ton pseudo, ta photo, ta bio : Mon compte → Modifier le profil.</li>
            <li><strong className="text-ink">Désactiver</strong> les notifications : Mon compte → Notifications.</li>
            <li><strong className="text-ink">Supprimer ton compte</strong> : Mon compte → Supprimer mon compte, ou par e-mail. La suppression efface ton profil, tes scores, tes amis, tes messages et tes blind tests ; si tu t&apos;étais connecté avec Google, les informations reçues de Google sont supprimées avec le compte.</li>
            <li><strong className="text-ink">Tout autre demande</strong> : <a href="mailto:contact@dailyrapfrance.best" className="text-glow font-semibold">contact@dailyrapfrance.best</a> — réponse sous un mois.</li>
          </ul>
          <p className="mt-2">Tu peux aussi introduire une réclamation auprès de la CNIL (cnil.fr).</p>
        </div>

        <div>
          <h2>7. Sécurité</h2>
          <p>Connexions chiffrées (HTTPS), accès à la base de données restreint par des règles par utilisateur, clés d&apos;administration jamais exposées côté navigateur, protection contre les abus et les robots. Aucun système n&apos;est infaillible : en cas d&apos;incident touchant tes données, nous t&apos;en informerons conformément à la loi.</p>
        </div>

        <div>
          <h2>8. Cookies et stockage local</h2>
          <p>Uniquement ce qui est nécessaire : le cookie de session de connexion, un cookie de parrainage (30 jours, pour attribuer ton inscription à la personne qui t&apos;a invité), et le stockage local du navigateur pour tes réglages et parties hors compte. Google Analytics est configuré sans cookie publicitaire. Aucun cookie tiers de publicité.</p>
        </div>

        <div>
          <h2>9. Mineurs</h2>
          <p>Le site s&apos;adresse à un public de 15 ans et plus. Un mineur de moins de 15 ans ne doit pas créer de compte sans l&apos;accord d&apos;un parent ; sur demande d&apos;un parent, nous supprimons le compte.</p>
        </div>

        <div>
          <h2>10. Modifications</h2>
          <p>Cette politique peut évoluer avec le site. La date en haut de page indique la dernière version ; en cas de changement important, nous te l&apos;indiquerons sur le site ou par e-mail.</p>
        </div>
      </div>
    </section>
  );
}
