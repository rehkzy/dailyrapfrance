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
