# Générateur de vidéos TikTok / Reels — « T'as trouvé ? »

Produit des vidéos verticales 1080×1920 (9:16, MP4 H.264 + AAC) à partir d'un thème du
blind test. Deux formats :

**Solo (`--tracks 1`, défaut, ~14 s)**
1. Devinette (8 s) — extrait Deezer, pochette très floutée, chrono rond rouge qui décompte,
   « Mets ta réponse en commentaire ↓ ».
2. Révélation (4 s) — pochette nette, artiste + titre (+ feats), l'audio continue.
3. Fin (3 s) — affiche bichromie rouge/noir « Joue au blind test → dailyrapfrance.best »,
   signature sonore à 0,3 s.

**Multi (`--tracks 5`, ~59 s)**
1. Intro (3 s) — tuile DR + wordmark, « Blind test rap FR », « 5 sons · 8 secondes chacun »,
   signature sonore (`public/audio/tag.mp3`) à 0,4 s, l'extrait du son 1 démarre ensuite.
2. Pour chaque son : devinette 8 s (compteur « Son k/5 » en haut) puis révélation 3 s, le
   son continue ; fondu rapide (0,3 s) entre les sons.
3. Fin (3 s) — « Ton score ? Joue au vrai blind test → dailyrapfrance.best »,
   « Mets ton score en commentaire ↓ », signature sonore à 0,3 s.

Audio par son : preview Deezer à partir de la seconde 5 (`--offset`), 8 + 3 s, fondus 0,4 s.
Chaque écran est une page HTML rendue dans Chromium (Playwright) avec la charte du site
(palette stricte rouge/noir/blanc : fond `#0A0707`, rouge `#F0001C`, glow `#FF3B4E`, rouge
profond `#8A0010`, blanc/ivoire `#F5E8E8` ; aucun jaune/or ; pochettes floutées et affiches en
bichromie rouge/noir, seule la pochette révélée est en couleur ; Bricolage Grotesque + Inter,
tuile « DR » `public/icon-512.png` et wordmark `public/logo.svg`), capturée puis assemblée
par ffmpeg (xfade vidéo + acrossfade audio). Rien d'autre du repo n'est touché ni importé.

## Prérequis

- Node 22+
- ffmpeg (avec libx264 + aac) dans le PATH, ou `--ffmpeg /chemin/ffmpeg` / `$FFMPEG`
- Playwright + Chromium : `npm i -D playwright && npx playwright install chromium`
  (une installation globale visible via `NODE_PATH` fonctionne aussi)
- Accès réseau à `dailyrapfrance.best`, `api.deezer.com`, `*.dzcdn.net` et Google Fonts
  (les polices sont téléchargées une fois dans `<out>/.cache/` ; sans réseau vers Google Fonts,
  fallback sans-serif système).

## Usage

```bash
# 3 vidéos solo à partir d'un thème du site (ids : pop, 2010s, 13, 93, artist-ninho…)
node scripts/tiktok/make.mjs --theme artist-ninho --count 3 --out ./out

# 2 vidéos de 5 sons sur le thème viral (sans morceau commun), nommées viral-1.mp4 et viral-2.mp4
node scripts/tiktok/make.mjs --theme viral --tracks 5 --count 2 --label "Viral TikTok" --name viral-1,viral-2 --out ./out
node scripts/tiktok/make.mjs --theme hits-2026 --tracks 5 --count 1 --label "Les stars de 2026" --name stars-2026
# Exclure des IDs déjà utilisés dans une vidéo précédente
node scripts/tiktok/make.mjs --theme viral --tracks 5 --count 1 --exclude 3569313901,1400988252

# IDs Deezer précis (ne passe pas par le site) ; avec --tracks 5 les 5 IDs font une vidéo
node scripts/tiktok/make.mjs --ids 4333609992,2935905291 --out ./out

# Recherche Deezer, premiers titres avec preview
node scripts/tiktok/make.mjs --search "jul" --count 2 --out ./out
```

Options : `--tracks N` (1), `--count N` vidéos (3), `--name a,b` (noms de fichiers, un par
vidéo), `--exclude ids` (IDs Deezer à écarter), `--out dir` (`./out`), `--label "Texte"`, `--offset S` (5), `--guess S` (8),
`--reveal S` (4 solo / 3 multi), `--intro S` (3), `--end S` (3), `--fps N` (cadence de
capture du chrono, 12 ; sortie 30 fps), `--no-tag` (sans signature sonore), `--keep-frames`,
`--ffmpeg bin`.

Sortie : `out/<nom>.mp4` + dossier `out/<nom>/` avec, par son (`01-artiste-titre/` en multi),
`cover.jpg`, `preview.mp3` et les frames clés `frame-intro.png` (1er son, multi),
`frame-guess.png`, `frame-reveal.png`, `frame-end.png` (dernier son). Compter ~25 s par son.

## Sources de titres

- `--theme` appelle `https://www.dailyrapfrance.best/api/blindtest/pool?theme=<id>&count=<n>`
  (`{tracks:[{id,title,artistName,previewUrl,coverUrl,feats}]}`). La pochette 250 px est
  remplacée par la 1000 px du CDN Deezer (repli 500/250 si absente). En multi, on demande
  un pool plus large et on évite deux fois le même artiste dans une vidéo (avertissement
  `! doublon d'artiste` si le pool ne le permet pas).
- Les URLs de preview renvoyées par le site peuvent venir d'un cache périmé (403) : le script
  redemande alors une URL fraîche à `api.deezer.com/track/<id>`.
- `--ids` / `--search` interrogent directement `api.deezer.com`. Si le site refuse
  (403/429, protection bot), utilise ces deux options : elles n'en dépendent pas.

## Limites connues

- L'extrait vient du champ `preview` Deezer (30 s, souvent le refrain) : `--offset` choisit
  le point de départ, mais on ne contrôle pas quel passage Deezer a retenu.
- Les URLs de preview sont signées et expirent : relancer le script plutôt que réutiliser
  un vieux `preview.mp3`.
- Durée multi réelle = 3 + 5×11 + 3 − 6×0,3 (fondus) ≈ 59,2 s.
- Révélation, intro et fin sont statiques (fondus uniquement) ; seul le chrono est animé.
- Les textes très longs (titre interminable, nombreux feats) peuvent se tasser ; la mise en
  page est pensée pour un nom d'artiste sur 1–2 lignes.
- La pochette en bichromie derrière l'intro/la fin peut contenir du texte ; un voile sombre
  en haut protège la lisibilité du logo, pas toujours parfaitement.
- Diffusion d'extraits Deezer : vérifier les conditions d'utilisation de l'API avant publication.
