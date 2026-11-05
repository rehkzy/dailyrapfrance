# Générateur de vidéos TikTok / Reels — « T'as trouvé ? »

Produit des vidéos verticales 1080×1920 (9:16, MP4 H.264 + AAC, ~14 s) à partir d'un thème
du blind test :

1. **Devinette (8 s)** — extrait Deezer, pochette très floutée, chrono rond rouge qui
   décompte de 8 à 0, sous-titre « Mets ta réponse en commentaire 👇 ».
2. **Révélation (4 s)** — pochette nette, artiste + titre (+ feats), l'audio continue.
3. **Fin (3 s)** — affiche en bichromie rouge/noir « Joue au blind test → dailyrapfrance.best ».

Chaque écran est une page HTML rendue dans Chromium (Playwright) avec la charte du site
(fond `#0A0707`, rouge `#F0001C`, glow `#FF3B4E`, or `#FFD166`, Bricolage Grotesque + Inter,
`public/logo.svg` et `public/mark-red.svg`), capturé en PNG/JPEG puis assemblé par ffmpeg.
Rien d'autre du repo n'est touché ni importé.

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
# 3 vidéos à partir d'un thème du site (ids : artist-ninho, 2010s, 93, 13, hits-2026…)
node scripts/tiktok/make.mjs --theme artist-ninho --count 3 --out ./out

# IDs Deezer précis (ne passe pas par le site)
node scripts/tiktok/make.mjs --ids 4333609992,2935905291 --out ./out

# Recherche Deezer, premiers titres avec preview
node scripts/tiktok/make.mjs --search "jul" --count 2 --out ./out

# Pastille de thème sur la devinette
node scripts/tiktok/make.mjs --theme 13 --count 3 --label "Spécial Marseille"
```

Options : `--count N` (3), `--out dir` (`./out`), `--label "Texte"`, `--offset S` (début
dans la preview, 5), `--guess S` (8), `--reveal S` (4), `--end S` (3), `--fps N` (cadence
de capture du chrono, 12 ; la vidéo sort en 30 fps), `--keep-frames`, `--ffmpeg bin`.

Sortie : `out/<artiste>-<titre>.mp4` + dossier `out/<artiste>-<titre>/` avec `cover.jpg`,
`preview.mp3` et les frames clés `frame-guess.png`, `frame-reveal.png`, `frame-end.png`
(utiles comme vignette). Compter ~25 s par vidéo.

## Sources de titres

- `--theme` appelle `https://www.dailyrapfrance.best/api/blindtest/pool?theme=<id>&count=<n>`
  (`{tracks:[{id,title,artistName,previewUrl,coverUrl,feats}]}`). La pochette 250 px est
  remplacée par la 1000 px du CDN Deezer (repli 500/250 si absente).
- `--ids` / `--search` interrogent directement `api.deezer.com` (`/track/<id>`, `/search`).
  Si le site refuse (403/429, protection bot), utilise ces deux options : elles n'en dépendent pas.

## Limites connues

- L'extrait vient du champ `preview` Deezer (30 s, souvent le refrain) : `--offset` choisit
  le point de départ, mais on ne contrôle pas quel passage Deezer a retenu.
- Les URLs de preview sont signées et expirent (~quelques heures) : relancer le script
  plutôt que réutiliser un vieux `preview.mp3`.
- La révélation et l'écran de fin sont statiques (fondus uniquement) ; seul le chrono est animé.
- Les textes très longs (titre interminable, nombreux feats) peuvent se tasser ; la mise en
  page est pensée pour un nom d'artiste sur 1–2 lignes.
- Pas de sous-titres/musique « tendance » TikTok : l'audio est l'extrait brut avec fondus.
- Diffusion d'extraits Deezer : vérifier les conditions d'utilisation de l'API avant publication.
