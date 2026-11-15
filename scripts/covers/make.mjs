#!/usr/bin/env node
/*
 * Couvertures de playlists (Spotify / Deezer) à la charte DailyRapFrance.
 *
 *   node scripts/covers/make.mjs --list scripts/covers/playlists.json --out ./out/covers
 *   node scripts/covers/make.mjs --title "mood triste" --kicker "Rap français 2026" --out ./out
 *
 * Contraintes Spotify (« Modifier les informations » → image) : JPEG, 256 Ko max, carré,
 * ≥ 300 px. On sort du 1000 × 1000 et on baisse la qualité jusqu'à passer sous 250 Ko.
 *
 * Ce qui fait une bonne cover dans la grille Spotify (elle fait 150 px dans la bibliothèque) :
 * un seul mot fort en très gros, un contraste franc rouge / noir / ivoire, la tuile DR
 * toujours au même endroit (en haut à gauche : signature de la marque, reconnaissable en
 * un coup d'œil dans « Mixée par DailyRapFrance »), et pas de petit texte qu'on ne lira pas.
 *
 * Chaque entrée de la liste : { title, kicker?, sub?, style?, artist?, photo?, year?, file? }
 *   style : "red" (fond rouge, texte ivoire) · "noir" (fond noir, titre rouge) · "ivory"
 *           (fond ivoire, texte noir, pour les playlists calmes) · "photo" (portrait bichrome
 *           rouge) · "photo-noir" (portrait noir & blanc sombre, accent rouge) — `photo` = URL
 *           ou chemin, ou `artist` = nom Deezer : photo récupérée.
 *   logo : "tile" (défaut, la tuile DR) ou "word" (le logo typographique) — jamais les deux.
 *   align : "bottom" (défaut, titre en bas à gauche) ou "center" (titre centré).
 *   Ce qui fait cliquer (covers éditoriales Spotify, RapCaviar & co) : un visage connu, un
 *   titre de 1–2 mots lisible à 60 px, et les noms d'artistes en petit (on sait ce qu'on
 *   va entendre avant d'ouvrir).
 */
import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { console.error("Playwright introuvable : npm i -D playwright && npx playwright install chromium"); process.exit(1); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SIZE = 1000; // composition en 1000, rendue à 2× (2000 × 2000) : net sur l'app desktop et la TV
const SCALE = 2;
const MAX_BYTES = 3800 * 1024; // Spotify accepte 4 Mo via l'app (256 Ko seulement via l'API)

const { values: opt } = parseArgs({
  options: {
    list: { type: "string" },
    title: { type: "string" },
    kicker: { type: "string" },
    sub: { type: "string" },
    style: { type: "string" },
    lettering: { type: "string" },
    tone: { type: "string" },
    artist: { type: "string" },
    photo: { type: "string" },
    out: { type: "string", default: path.join(REPO_ROOT, "out", "covers") },
    help: { type: "boolean", short: "h" },
  },
});
if (opt.help || (!opt.list && !opt.title)) {
  console.log(`Usage : --list playlists.json | --title "mot" [--kicker ".."] [--sub ".."] [--style red|noir|ivory|photo] [--artist "Nom"|--photo url] [--out dir]`);
  process.exit(opt.help ? 0 : 1);
}

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "cover";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// *mot* → accent (rouge sur noir/ivoire, ivoire sur rouge) ; \n → retour à la ligne
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/\\n|\n/g, "<br>");

async function fetchBuffer(url) {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 DailyRapFrance covers" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}
async function artistPhoto(name) {
  const j = await (await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=8`)).json();
  const exact = (j.data ?? []).filter((a) => a.name.toLowerCase() === name.toLowerCase());
  const a = (exact.length ? exact : j.data ?? []).sort((x, y) => (y.nb_fan ?? 0) - (x.nb_fan ?? 0))[0];
  if (!a) throw new Error(`Artiste Deezer introuvable : ${name}`);
  return a.picture_xl || a.picture_big;
}
async function toDataUri(src, mime = "image/jpeg") {
  if (!src) return null;
  const buf = /^https?:/.test(src) ? await fetchBuffer(src) : await readFile(path.resolve(src));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/*
 * Lettrages — un par ambiance, comme les couvertures éditoriales Spotify (Fresh Rap en
 * condensé italique, Westside en gothique, Peaceful Piano en script, Rap Diggers en pixel,
 * New Music Friday en bloc sur bandeau…). Toutes des Google Fonts, téléchargées une fois.
 */
const LETTERINGS = {
  block:     { fam: "Archivo Black",    css: "family=Archivo+Black",                 weights: [400], up: true,  ls: "-.02em", lh: .88, scale: .82 },
  condensed: { fam: "Anton",            css: "family=Anton",                         weights: [400], up: true,  ls: ".01em",  lh: .9,  scale: 1.25, italic: true },
  impact:    { fam: "Bebas Neue",       css: "family=Bebas+Neue",                    weights: [400], up: true,  ls: ".02em",  lh: .86, scale: 1.1 },
  script:    { fam: "Pacifico",         css: "family=Pacifico",                      weights: [400], up: false, ls: "0",      lh: 1.15, scale: .78 },
  hand:      { fam: "Caveat",           css: "family=Caveat:wght@700",               weights: [700], up: false, ls: "0",      lh: .95, scale: 1.15 },
  serif:     { fam: "Playfair Display", css: "family=Playfair+Display:ital,wght@1,800", weights: [800], up: false, ls: "-.03em", lh: .95, scale: .95, italic: true },
  gothic:    { fam: "Pirata One",       css: "family=Pirata+One",                    weights: [400], up: false, ls: "0",      lh: .9,  scale: 1.1 },
  pixel:     { fam: "Press Start 2P",   css: "family=Press+Start+2P",                weights: [400], up: true,  ls: "0",      lh: 1.2, scale: .5 },
  stencil:   { fam: "Black Ops One",    css: "family=Black+Ops+One",                 weights: [400], up: true,  ls: "0",      lh: .95, scale: .9 },
  shade:     { fam: "Bungee Shade",     css: "family=Bungee+Shade",                  weights: [400], up: true,  ls: "0",      lh: 1,   scale: .7 },
  outline:   { fam: "Bungee",           css: "family=Bungee",                        weights: [400], up: true,  ls: "0",      lh: .95, scale: .85, outline: true },
  mono:      { fam: "Rubik Mono One",   css: "family=Rubik+Mono+One",                weights: [400], up: true,  ls: "-.02em", lh: .95, scale: .7 },
  grotesk:   { fam: "Bricolage Grotesque", css: "family=Bricolage+Grotesque:wght@800", weights: [800], up: false, ls: "-.045em", lh: .9, scale: 1 },
};

async function loadFonts() {
  const cacheDir = path.join(process.env.TMPDIR || "/tmp", "drf-fonts");
  await mkdir(cacheDir, { recursive: true });
  const fams = [{ fam: "Inter", css: "family=Inter:wght@600;700", weights: [600, 700] }, ...Object.values(LETTERINGS)];
  const faces = [];
  for (const f of fams) for (const w of f.weights) {
    const file = path.join(cacheDir, `${slug(f.fam)}-${w}${f.italic ? "i" : ""}.ttf`);
    try {
      await readFile(file);
    } catch {
      try {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?${f.css}&display=swap`, { headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/60" } })).text();
        const re = /font-weight:\s*(\d+);[^}]*?src:\s*url\(([^)]+\.ttf)\)/g;
        let m, url = null;
        while ((m = re.exec(css))) if (parseInt(m[1], 10) === w) url = m[2];
        if (!url) throw new Error("pas de TTF");
        await writeFile(file, await fetchBuffer(url));
      } catch (e) { console.error(`! police ${f.fam} ${w} : ${e.message} (fallback système)`); continue; }
    }
    faces.push(`@font-face{font-family:"${f.fam}";font-weight:${w};${f.italic ? "font-style:italic;" : ""}src:url("${pathToFileURL(file).href}") format("truetype")}`);
  }
  return faces.join("\n");
}

/*
 * Composition (ce que font les covers Spotify qui marchent) :
 *  · photo plein cadre, couleur ou N&B (`tone`: "color" | "bw" | "red"), visage dans le tiers haut ;
 *  · logo petit dans le coin haut-gauche (tuile DR ou wordmark — jamais les deux), et rien
 *    d'autre à côté : pas de kicker, pas de liste d'artistes (kicker/sub restent possibles
 *    dans le JSON mais la série DailyRap ne les utilise pas) ;
 *  · le titre en gros, en bas à gauche, dans un lettrage adapté au mood (`lettering`) ;
 *  · option `band` : bandeau de couleur derrière le titre (New Music Friday, All Out) ;
 *  · `accent` : couleur du mot *accentué* / du bandeau (défaut rouge marque).
 *  Sans photo : fond `bg` (red | black | ivory) avec halo.
 */
function html({ fonts, logos, entry, photo }) {
  const L = LETTERINGS[entry.lettering] || LETTERINGS.grotesk;
  const accent = entry.accent || "#F0001C";
  const tone = entry.tone || (photo ? "color" : "none");
  const bg = entry.bg || "black";
  const dark = bg !== "ivory";
  const ink = entry.ink || (dark ? "#F7EFE6" : "#0A0707");
  const raw = entry.title.replace(/\*/g, "");
  const lines = raw.split(/\\n|\n/);
  const longest = Math.max(...lines.map((l) => l.length));
  const fs = Math.round(Math.max(90, Math.min(260, (1500 / Math.max(longest, 4)) * L.scale)));
  const title = rich(entry.title);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;box-sizing:border-box}
html,body{width:${SIZE}px;height:${SIZE}px;overflow:hidden;background:#0A0707}
.c{position:relative;width:${SIZE}px;height:${SIZE}px;overflow:hidden;color:${ink};background:${bg === "red" ? "#F0001C" : bg === "ivory" ? "#F7EFE6" : "#0A0707"}}
.halo{position:absolute;width:1200px;height:1200px;border-radius:50%;filter:blur(100px);opacity:.6;background:${bg === "red" ? "#6b000e" : bg === "ivory" ? "#ffc1c7" : accent};right:-520px;bottom:-560px}
img.p{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% ${entry.focus ?? 12}%}
.bw img.p{filter:grayscale(1) contrast(1.12)}
.red img.p{filter:grayscale(1) contrast(1.25) brightness(.9)}
.red .tint{position:absolute;inset:0;background:${accent};mix-blend-mode:multiply;opacity:.9}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,7,7,.18) 0%,rgba(10,7,7,0) 30%,rgba(10,7,7,0) 45%,rgba(10,7,7,.88) 78%)}
.grain{position:absolute;inset:0;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .26 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");opacity:.16;mix-blend-mode:overlay}
.tile{position:absolute;top:56px;left:56px;width:104px;height:104px;border-radius:24px;box-shadow:0 12px 36px rgba(0,0,0,.35)}
.word{position:absolute;top:70px;left:56px;height:56px;filter:drop-shadow(0 6px 18px rgba(0,0,0,.35))}
.light .word{filter:invert(1)}
.kicker{position:absolute;top:60px;left:184px;right:56px;font:700 28px/1.15 "Inter",sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.92;text-shadow:0 2px 14px rgba(0,0,0,.4)}
.word ~ .kicker{left:56px;top:150px}
.kicker small{display:block;margin-top:8px;font:600 25px/1.25 "Inter",sans-serif;letter-spacing:0;text-transform:none;opacity:.78}
.light .kicker{text-shadow:none}
.wrap{position:absolute;left:56px;right:56px;bottom:${entry.band ? 0 : 64}px}
.band .wrap{left:0;right:0;padding:40px 56px 48px;background:${entry.band === true ? accent : entry.band}}
.title{font-family:"${L.fam}",system-ui,sans-serif;font-weight:${L.weights[0]};${L.italic ? "font-style:italic;" : ""}font-size:${fs}px;line-height:${L.lh};letter-spacing:${L.ls};${L.up ? "text-transform:uppercase;" : ""}text-wrap:balance;${L.italic && entry.lettering === "condensed" ? "transform:skewX(-6deg);transform-origin:left bottom;" : ""}text-shadow:0 8px 40px rgba(0,0,0,.35)}
.light .title{text-shadow:none}
.title em{font-style:inherit;color:${entry.band ? ink : accent}}
${L.outline ? `.title{color:transparent;-webkit-text-stroke:5px ${ink}} .title em{color:${accent};-webkit-text-stroke:0}` : ""}
.sub{margin-top:18px;font:600 27px/1.25 "Inter",sans-serif;opacity:.85}
</style></head><body><div class="c ${tone} ${entry.band ? "band" : ""} ${dark && !photo ? "" : (bg === "ivory" && !photo ? "light" : "")}">
${photo ? `<img class="p" src="${photo}">${tone === "red" ? `<div class="tint"></div>` : ""}<div class="shade"></div>` : `<div class="halo"></div>`}
<div class="grain"></div>
${entry.logo === "word" ? `<img class="word" src="${logos.wordmark}">` : `<img class="tile" src="${logos.tile}">`}
${entry.kicker ? `<div class="kicker">${rich(entry.kicker)}${entry.sub && entry.subTop ? `<small>${esc(entry.sub)}</small>` : ""}</div>` : ""}
<div class="wrap"><h1 class="title">${title}</h1>${entry.sub && !entry.subTop ? `<p class="sub">${esc(entry.sub)}</p>` : ""}</div>
</div></body></html>`;
}

async function main() {
  const entries = opt.list ? JSON.parse(await readFile(opt.list, "utf8")) : [{ title: opt.title, kicker: opt.kicker, sub: opt.sub, bg: opt.style, lettering: opt.lettering, tone: opt.tone, artist: opt.artist, photo: opt.photo }];
  await mkdir(opt.out, { recursive: true });
  const [wordmark, tile, fonts] = await Promise.all([
    readFile(path.join(REPO_ROOT, "public", "logo.svg"), "utf8"),
    readFile(path.join(REPO_ROOT, "public", "icon-512.png")),
    loadFonts(),
  ]);
  const logos = { wordmark: `data:image/svg+xml;base64,${Buffer.from(wordmark).toString("base64")}`, tile: `data:image/png;base64,${tile.toString("base64")}` };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: SCALE });
  for (const entry of entries) {
    let photo = null;
    try {
      if (entry.photo) photo = await toDataUri(entry.photo);
      else if (entry.artist) photo = await toDataUri(await artistPhoto(entry.artist));
    } catch (e) { console.error(`! photo ${entry.title} : ${e.message}`); }
    // Via un fichier (pas setContent) : depuis about:blank, Chromium refuse les polices en file://.
    const tmpHtml = path.join(opt.out, `.${entry.file || slug(entry.title)}.html`);
    await writeFile(tmpHtml, html({ fonts, logos, entry, photo }));
    await page.goto(pathToFileURL(tmpHtml).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(opt.out, `${entry.file || slug(entry.title)}.jpg`);
    let q = 94, buf;
    do { buf = await page.screenshot({ type: "jpeg", quality: q }); q -= 4; } while (buf.length > MAX_BYTES && q > 60);
    await writeFile(file, buf);
    await rm(tmpHtml, { force: true });
    console.log(`✓ ${file} (${Math.round(buf.length / 1024)} Ko)`);
  }
  await browser.close();
}
main().catch((e) => { console.error("erreur :", e.message); process.exit(1); });
