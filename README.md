# DailyRapFrance

Site du média DailyRapFrance — **À propos**, **Blind Test** (solo ou multijoueur local),
avec comptes joueurs (Google / Apple) et classement persistant.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** pour le style, **Lenis** pour le scroll fluide
- **Supabase** — Auth (Google/Apple) + Postgres, uniquement pour les comptes et les scores
  du blind test. Rien d'autre sur le site n'a besoin de base de données : le blind test lui
  même continue d'interroger Deezer en direct, sans catalogue à maintenir.

## Pages

- `/` — accueil minimal : emblème de la marque + liens
- `/a-propos` — mission du média et histoire du fondateur (Florian B.), lien vers
  [florian-b.fr](https://florian-b.fr)
- `/blindtest` — le jeu. Extraits audio 30s via l'API publique Deezer (aucune clé requise)
- `/blindtest/classement` — classement des meilleurs scores solo

## Blind Test — comment ça marche

`app/api/blindtest/pool/route.ts` interroge Deezer **en direct**, à chaque partie :
playlists éditoriales par décennie pour les thèmes généraux, recherche d'artiste pour les
thèmes ciblés (cloud rap, départements). Le lot final est enrichi via `/track/{id}` pour
récupérer les featurings. Mis en cache 30 minutes côté Next.js.

**Barème** : titre = 1 pt, artiste = 1 pt, trouver un featuring = +2 pts. Chaque joueur a un
**joker** par partie pour écouter un autre passage de l'extrait s'il bloque.

Thèmes par département/scène — curation manuelle vérifiée nom par nom le 26/07/2026
(Wikipédia + bios officielles), volontairement courte, à étendre dans
`app/api/blindtest/pool/route.ts` :

```ts
const DEPT_ARTISTS = {
  "93": ["kaaris", "mac tyer", "vald", "kalash criminel", "maes", "diddi trix"],
  "91": ["pnl", "niska", "koba lad", "ol kainry"],
  "92": ["booba", "ali", "sdm", "benash"],
  "77": ["djadja & dinaz", "rk", "timal", "houdi"],
  "78": ["la fouine"],
  "13": ["jul", "sch", "soprano", "alonzo", "naps", "soso maness", "akhenaton", "shurik'n"],
  "59": ["gradur"],
};
```

## Comptes et scores — mise en place Supabase

### 1. Créer/réutiliser un projet Supabase

Si vous n'en avez pas déjà un : [supabase.com](https://supabase.com) → New Project.

### 2. Exécuter le schéma

Supabase → **SQL Editor** → collez et lancez tout le contenu de `supabase/schema.sql`
(profils, table des scores, règles de sécurité RLS, création automatique du profil à
l'inscription).

### 3. Récupérer les clés

Supabase → Project Settings → **API** → copiez `Project URL` et la clé `anon public`.

### 4. Variables d'environnement

En local (`.env.local`, voir `.env.example`) et sur Vercel (Project Settings → Environment
Variables) :

```
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="votre_clé_anon"
```

### 5. Activer la connexion Google (gratuit, ~5 minutes)

1. [Google Cloud Console](https://console.cloud.google.com) → créez un projet (ou réutilisez
   un existant) → **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → type "Web application"
2. Dans **Authorized redirect URIs**, ajoutez l'URL de callback donnée par Supabase (visible
   dans Supabase → Authentication → Providers → Google)
3. Copiez le `Client ID` et le `Client Secret` généré par Google
4. Supabase → Authentication → Providers → **Google** → activez, collez Client ID/Secret →
   Save

### 6. Activer la connexion Apple (payant — nécessite un compte Apple Developer, 99$/an)

Contrairement à Google, "Sign in with Apple" demande :
1. Un compte [Apple Developer Program](https://developer.apple.com/programs/) actif
2. Un **Services ID** avec "Sign in with Apple" activé
3. Une **clé privée** générée dans Certificates, Identifiers & Profiles, téléchargée une
   seule fois
4. Ces éléments (Client ID, Team ID, Key ID, clé privée) se renseignent dans Supabase →
   Authentication → Providers → **Apple**

Si vous n'avez pas de compte Apple Developer, laissez ce provider désactivé — le bouton
"Continuer avec Apple" ne fonctionnera simplement pas tant qu'il n'est pas configuré côté
Supabase, sans casser le reste du site.

### 7. Callback

Le code gère déjà la redirection : `app/auth/callback/route.ts` échange le code OAuth contre
une session. Rien à modifier de ce côté.

## Développement local

```bash
npm install
npm run dev
```

Sans les variables Supabase, le site fonctionne quand même : le blind test reste jouable,
seule la connexion et la sauvegarde de score sont indisponibles (échec silencieux, pas
d'erreur bloquante).

## Déploiement

[Vercel](https://vercel.com), branché sur ce repo GitHub. Pensez à renseigner les deux
variables `NEXT_PUBLIC_SUPABASE_*` dans les Environment Variables du projet Vercel — sans
elles, la connexion et le classement ne fonctionneront pas en production.

## Prochaines étapes possibles

Non construites dans cette passe, mais la base (comptes + Postgres) le permet :
- Daily Challenge (même playlist pour tout le monde, un jour donné)
- Ranked / Elo
- Multijoueur en ligne (duels, rooms) — nécessiterait un service temps réel en plus
  (Supabase Realtime ou équivalent), pas juste des routes API classiques

## Charte graphique

- `#F0001C` (Rouge Daily) — accent principal, CTA, glow
- `#780101` (Rouge Article) — halos, profondeur
- Noir chaud `#0A0707`, jamais un gris neutre générique
- Typo display : Bricolage Grotesque · Corps : Inter · Data/mono : IBM Plex Mono
