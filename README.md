# DailyRapFrance

Site du média DailyRapFrance — deux pages : **À propos** (l'histoire du média et de son
fondateur) et **Blind Test** (jeu solo ou multijoueur local sur le rap français).

Volontairement minimal : pas de base de données, pas de pipeline d'ingestion, pas de
variable d'environnement à configurer. Tout tourne à partir du code et de l'API publique
Deezer, appelée en direct.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** pour le style
- **Lenis** pour le scroll fluide
- Aucune base de données — voir plus bas

## Pages

- `/` — accueil minimal : emblème de la marque + liens vers les deux pages ci-dessous
- `/a-propos` — mission du média et histoire du fondateur (Florian B.), avec un lien vers
  son portfolio [florian-b.fr](https://florian-b.fr)
- `/blindtest` — le jeu. Extraits audio 30s via l'API publique Deezer (aucune clé requise).
  Solo ou multijoueur local (2 à 8 joueurs, même écran, mécanique de "buzz").

## Blind Test — comment ça marche

`app/api/blindtest/pool/route.ts` interroge Deezer **en direct**, à chaque partie :
playlists éditoriales par décennie (90s / 2000 / 2010 / 2020) pour les thèmes généraux,
recherche d'artiste pour les thèmes ciblés (cloud rap, rappeurs du 93, rappeurs du 91).
Résultat mis en cache 30 minutes côté Next.js pour rester rapide.

Ces trois derniers thèmes reposent sur de petites listes d'artistes curées à la main dans
la route (Deezer ne fournit ni sous-genre ni ville de naissance) — vérifiées nom par nom,
volontairement courtes, à étendre vous-même si besoin :

```ts
const CLOUD_ARTISTS = ["suikoden", "josman", "fixpen sill", "le wombat", "lomepal"];
const DEPT_93_ARTISTS = ["kaaris", "mac tyer", "vald", "kalash criminel", "maes", "diddi trix"];
const DEPT_91_ARTISTS = ["pnl", "niska", "koba lad", "ol kainry"];
```

## Développement local

```bash
npm install
npm run dev
```

Aucun fichier `.env` n'est nécessaire — l'API Deezer utilisée est publique et sans clé.

## Déploiement

Le site est fait pour être déployé sur [Vercel](https://vercel.com), branché directement
sur ce repo GitHub. Aucune variable d'environnement à configurer, aucun secret GitHub
Actions, aucune base de données à provisionner.

## Charte graphique

- `#F0001C` (Rouge Daily) — accent principal, CTA, glow
- `#780101` (Rouge Article) — halos, profondeur
- Noir chaud `#0A0707`, jamais un gris neutre générique
- Typo display : Bricolage Grotesque · Corps : Inter · Data/mono : IBM Plex Mono
