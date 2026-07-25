# DailyRapFrance — Architecture gratuite (adaptée à l'offre OVH Starter)

## Pourquoi cette adaptation

L'offre OVH Starter (1 Go disque, 1 base MySQL, PHP 7.3, pas de Node.js) ne peut pas porter
le produit tel que décrit dans `00_MASTER_PROMPT.md` (25 000+ pages, données horaires,
graphe relationnel, IA). On garde toute l'ambition de la spec en répartissant les briques
sur des services gratuits complémentaires :

| Rôle | Service | Gratuit ? |
|---|---|---|
| Domaine + DNS | OVH (existant) | ✅ déjà payé |
| Frontend Next.js (SSR, pages programmatiques) | Vercel (plan Hobby) | ✅ |
| Base de données (le graphe) | Supabase Postgres | ✅ (500 Mo pour démarrer) |
| Automatisations / pipelines | GitHub Actions (cron) | ✅ (2000 min/mois) |
| Recherche | Postgres `pg_trgm` (au lieu de Meilisearch) | ✅ |
| Emails | Resend | ✅ (100/jour gratuit) |

Sur OVH : ne rien déployer de l'app. Juste pointer le DNS du domaine `dailyrapfrance.best`
vers Vercel (CNAME) une fois le site en ligne.

## État actuel

- [x] Schéma de base de données (`prisma/schema.prisma`) — entités noyau : Artist, Release,
      Track, Credit, Label, Certification, ChartEntry, SocialStat, HypeScore.
- [x] Premier workflow d'automatisation (`.github/workflows/ingest-spotify.yml`) — squelette
      de cron gratuit, à connecter à un vrai script d'ingestion.
- [x] Scaffold Next.js 15 + App Router + Tailwind, design system sombre (P5 : sobre, dense,
      cinétique) : page d'accueil avec hero, ticker temps réel, Top Hype — données d'exemple
      pour l'instant (pas encore branché sur une vraie base).
- [ ] Compte Supabase à créer (gratuit) → récupérer `DATABASE_URL`.
- [ ] Compte Vercel à créer (gratuit) → connecter le repo GitHub.
- [ ] Script `pipelines/ingest-spotify.js` (appel Spotify Web API réel).
- [ ] DNS OVH → Vercel.

## Lancer le site en local (dès maintenant, sans base de données)

```bash
npm install
npm run dev
```
Ouvrez http://localhost:3000 — le site s'affiche avec des données d'exemple, avant même
d'avoir connecté Supabase.

## Prochaines étapes possibles

1. Créer le compte Supabase, remplir `.env.local` (voir `.env.example`), puis
   `npx prisma db push` pour créer les tables.
2. Remplacer les données d'exemple de `lib/mock-data.ts` par de vraies requêtes Prisma.
3. Écrire le premier vrai pipeline d'ingestion (Spotify Web API — nécessite un compte
   développeur Spotify, gratuit).
4. Construire le vrai graphe relationnel WebGL et le calendrier des sorties.
5. Connecter le repo à Vercel, puis brancher le DNS OVH dessus.

---

## Guide de déploiement (à faire une seule fois)

### 1. Mettre le code sur GitHub
- Créer un compte gratuit sur github.com si vous n'en avez pas.
- Créer un nouveau repo (ex. `dailyrapfrance`), vide, privé ou public.
- Dans le dossier `drf/` dézippé, ouvrir un terminal et lancer :
  ```bash
  git init
  git add .
  git commit -m "Premier squelette du site"
  git branch -M main
  git remote add origin https://github.com/VOTRE_USER/dailyrapfrance.git
  git push -u origin main
  ```

### 2. Créer la base de données (Supabase)
- Compte gratuit sur supabase.com → New Project.
- Une fois créé : Project Settings → Database → copier la "Connection string".
- La garder de côté, elle sert à l'étape 4.

### 3. Déployer le site (Vercel)
- Compte gratuit sur vercel.com, connecté avec GitHub.
- "Add New Project" → sélectionner le repo `dailyrapfrance`.
- Vercel détecte Next.js automatiquement, cliquer "Deploy".
- Le site est en ligne sur une URL du type `dailyrapfrance.vercel.app`.

### 4. Ajouter la variable d'environnement
- Dans Vercel : Project → Settings → Environment Variables.
- Ajouter `DATABASE_URL` avec la connection string Supabase de l'étape 2.
- Redéployer (Vercel le fait automatiquement au push suivant, ou bouton "Redeploy").

### 5. Brancher le domaine OVH
- Dans Vercel : Project → Settings → Domains → ajouter `dailyrapfrance.best`.
- Vercel indique un enregistrement DNS à créer (type A ou CNAME).
- Dans l'espace client OVH : Noms de domaine → dailyrapfrance.best → Zone DNS →
  ajouter l'enregistrement indiqué par Vercel.
- Propagation : quelques minutes à quelques heures.

À partir de là, chaque modification poussée sur GitHub redéploie automatiquement le site
sur Vercel — aucune manipulation manuelle supplémentaire.

---

## Dépannage — « le site ne se déploie pas »

Cause la plus fréquente à ce stade du projet : la variable `DATABASE_URL` n'est pas encore
renseignée dans Vercel (étape 4 ci-dessus). Les pages (`/`, `/mag`, `/artistes`, `/sorties`,
`/charts`…) interrogent la base au moment du build (`next build`) pour générer les pages
statiquement ; si Prisma ne trouve pas `DATABASE_URL`, ou si les tables n'existent pas encore
(`prisma db push` jamais lancé), la requête plantait tout le build → déploiement en échec.

Ce dépôt corrige ce point dans `lib/queries.ts` : chaque fonction de requête est protégée
par un `try/catch` et renvoie une liste vide (`[]`) ou `null` si la base est absente,
injoignable, ou pas encore migrée — exactement le même état que « base vide », déjà géré
par les pages. **Le site doit donc maintenant se déployer même sans Supabase configuré**,
avec les messages « pas encore de données » affichés à la place des fiches.

Pour vérifier ou déboguer un échec de build sur Vercel :
1. Project → Deployments → cliquer le déploiement en échec → onglet "Build Logs".
2. Chercher la première ligne en rouge (souvent `Error: ...` juste avant l'arrêt du build).
3. Si l'erreur mentionne `DATABASE_URL` ou `PrismaClientInitializationError`, vérifier
   Project → Settings → Environment Variables, et relancer un déploiement.
4. Si l'erreur ne vient pas de la base (ex. une faute de syntaxe TypeScript), le message
   indique le fichier et la ligne fautifs.

## Certifications (SNEP / UPFI)

- **Il n'existe pas d'API publique officielle** pour les certifications françaises. Le SNEP
  (majors) et l'UPFI (indépendants, où se trouve une grosse partie du rap FR) ne publient
  que des pages web avec filtres — pas de endpoint JSON.
- Le SNEP propose un bouton **"Télécharger en CSV"** sur
  [snepmusique.com/les-certifications](https://snepmusique.com/les-certifications/), mais
  **son `robots.txt` interdit l'accès automatisé** à ce fichier (vérifié le 26/07/2026) — un
  pipeline cron comme `ingest-spotify.js` violerait cette règle. C'est pour ça que l'import
  des certifications est **volontairement manuel**, contrairement aux autres pipelines.
- Marche à suivre :
  1. Téléchargez vous-même le CSV depuis snepmusique.com (bouton dédié) et/ou copiez le
     tableau depuis [upfi.fr/certifications](https://upfi.fr/certifications).
  2. Déposez le fichier dans `data/certifications/` — préfixe `snep-` ou `upfi-` selon la
     source (ex. `data/certifications/snep-2026-07.csv`).
  3. `git push` : `.github/workflows/import-certifications.yml` lance automatiquement
     `pipelines/import-certifications.js` sur le fichier ajouté. Vous pouvez aussi le lancer
     en local : `node pipelines/import-certifications.js data/certifications/snep-2026-07.csv --source=SNEP`.
- Le script n'importe que les artistes déjà suivis sur le site (nom ou alias) — il liste en
  fin d'exécution les noms non reconnus, à arbitrer manuellement (ajouter l'artiste ou
  ignorer).
- Les noms de colonnes attendus (`Titre`, `Artiste`, `Catégorie`, `Certification`, `Date de
  constat`, `Date de sortie`) sont déduits de l'interface publique du SNEP — le fichier CSV
  réel n'a pas pu être inspecté pendant le développement (accès bloqué, justement). Si
  l'import ne reconnaît aucune colonne au premier essai, ouvrez le CSV et ajustez
  `COLUMN_HINTS` en tête du script.

## Blind Test — jeu solo / multijoueur local

- Page `/blindtest`, composant `components/BlindTest.tsx`. Extraits audio 30s via l'API
  publique Deezer (champ `preview` des titres — c'est exactement l'usage pour lequel Deezer
  fournit ces extraits, aucune clé requise).
- **Pool de données dédié** (`BlindTestTrack`, séparé du catalogue éditorial) : contrairement
  au reste du site, ce pool garde volontairement les vieux titres (thème "à l'ancienne"). Le
  filtre de fraîcheur des autres pipelines ne s'applique pas ici.
- `pipelines/ingest-blindtest-pool.js` peuple ce pool depuis 4 playlists Deezer par décennie
  (Rapstars 90s / 2000 / 2010 / 2020) — voir `.github/workflows/ingest-blindtest.yml` (mensuel
  + déclenchable à la main). Léger : pas d'appel par titre, tout est déjà dans la réponse de la
  playlist.
- **Thèmes** : à l'ancienne, 2010s, récent, pop (proxy : `rank` Deezer le plus haut — pas de
  curation subjective), cloud rap, rappeurs du 93, rappeurs du 91. Les deux derniers et "cloud"
  reposent sur de petites listes d'artistes curées à la main dans le pipeline (Deezer ne fournit
  ni sous-genre ni ville de naissance) — volontairement courtes et à étendre vous-même, pas une
  base de données géographique faisant autorité.
- `app/api/blindtest/pool/route.ts` sert un lot mélangé de titres par thème.
- Solo : on tape directement sa réponse. Multijoueur local (2 à 8 joueurs, même écran) : chacun
  a un bouton "buzz", le premier à buzzer répond, les points dépendent du temps restant.

## Toutes les stats Deezer, scopées rap France (ingestion profonde)

- `pipelines/ingest-deezer-rap-fr.js`, lancé une fois par mois par
  `.github/workflows/ingest-deezer-deep.yml`, parcourt la playlist Deezer **Rapstars 2020**
  (id `9563400362`, tenue par l'éditrice Rap & R&B France de Deezer) et capture, par titre,
  tout ce que l'API publique expose : popularité (`rank`), ISRC, BPM, loudness (`gain`),
  *explicit lyrics*, durée — et par album : fans, *explicit*, label.
- **Filtre de fraîcheur** : la playlist flagship "Rapstars" (toutes époques confondues) a été
  écartée volontairement — elle mélangeait des classiques 90s/2000s avec l'actualité (retour
  utilisateur : trop de titres 2017/2020 remontaient). "Rapstars 2020" reste scopée à la
  décennie en cours, et le script ignore en plus tout titre dont l'album a plus de
  `MAX_AGE_YEARS` (3 par défaut, ajustable en tête du script).
- **Le vrai graphe relationnel** : chaque titre à plusieurs artistes crédités devient des
  lignes `Credit` (PERFORMER / FEATURED). La page `/explorer/graphe` et la section
  "A featuré avec" des fiches artiste utilisent maintenant cette donnée réelle — plus le mock.
  Deezer ne fournit que la liste des artistes crédités, pas les rôles producteur/auteur ; ces
  rôles resteront à sourcer ailleurs (Genius, Discogs...) pour une V2.
- Les artistes rencontrés sur Rapstars mais pas encore suivis sont créés automatiquement en
  `SKELETON` — légitime ici car la source est déjà éditorialement scopée rap FR (contrairement
  à une recherche générique).
- C'est un pipeline lourd (un appel par titre + par album) : plafonné à 400 titres par run et
  espacé de ~130ms entre appels, donc lancé mensuellement plutôt qu'à chaque semaine comme
  `ingest-chart.js`.

## Charts (chart Rap France, playlist Deezer Rapstars)

- Contrairement aux certifications, celui-ci **est automatisé** : l'API Deezer est publique,
  gratuite, sans clé, et explicitement pensée pour un usage programmatique. Rien à
  télécharger à la main ici.
- Source : la playlist éditoriale **Rapstars 2020** (`api.deezer.com/playlist/9563400362/tracks`),
  pas `/chart/116` (Rap/Hip Hop). Deezer documente que ses endpoints de genre/chart sont
  géolocalisés par IP — un run GitHub Actions ne part pas d'une IP française, donc `/chart/116`
  n'est pas fiablement scopé "France". Une playlist a un ID fixe, indépendant de la
  géolocalisation : c'est le choix le plus proche d'un "rap France officiel" accessible sans
  clé et sans scraping.
- `pipelines/ingest-chart.js`, lancé chaque lundi par
  `.github/workflows/ingest-chart.yml`, récupère cette playlist, ne garde que les artistes déjà
  suivis sur le site, et enregistre leur meilleur rang de la semaine (`ChartEntry`,
  `chartType: DRF_STREAMING`).
- **Ce n'est pas le Top SNEP officiel.** Le Top SNEP (snepmusique.com/les-tops) affiche
  explicitement *"tous les droits de reproduction et de communication au public sont
  réservés à la SCPP"* — et contrairement à la page certifications, il n'a ni CSV ni PDF
  d'export exploitable. Le type `ChartType.SNEP_RAP` existe dans le schéma mais n'est
  alimenté par aucun pipeline, volontairement — voir le commentaire dans
  `prisma/schema.prisma`.
- La page `/charts` affiche ce chart comme classement principal, avec le classement par fans
  Deezer en repli si le chart n'a pas encore tourné.

## Flux d'actus RSS

- Schéma : modèle `NewsItem` dans `prisma/schema.prisma` (titre, lien, source — jamais le
  contenu de l'article, conforme P6 du master prompt : on ne republie pas, on renvoie vers
  l'original).
- Sources actuelles (`pipelines/ingest-news.js`) : Booska-P, Raplume, Rap Elite — flux
  `/feed/` publics. Pour en ajouter, compléter le tableau `FEEDS` de ce fichier.
- Ingestion : `.github/workflows/ingest-news.yml`, cron toutes les 30 min (gratuit, GitHub
  Actions), utilise le secret de repo `DATABASE_URL` (Settings → Secrets and variables →
  Actions — à renseigner séparément de la variable d'environnement Vercel).
- Affichage : liste complète sur `/mag`, extrait sur l'accueil (section "Dernières infos"),
  et un bandeau défilant en direct juste sous le hero de l'accueil
  (`components/NewsTicker.tsx`), dans l'esprit des bandeaux cinétiques de lenis.dev.
