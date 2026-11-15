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
 *   shift / shiftY (% de la largeur, + = vers la droite / le bas) et zoom : recadrage du sujet.
 *   album : id d'album Deezer → sa pochette comme photo (utile quand la photo d'artiste est faible).
 *   lettering2 : police du mot *accentué* (typo alternée, ex. BOOBA en bloc + Prime en gothique).
 *   size : facteur sur la taille du titre (0.8 = plus petit). cutout:false : photo entière, pas de détourage.
 *   align : "bottom" (défaut, titre en bas à gauche) ou "center" (titre centré).
 *   Ce qui fait cliquer (covers éditoriales Spotify, RapCaviar & co) : un visage connu, un
 *   titre de 1–2 mots lisible à 60 px, et les noms d'artistes en petit (on sait ce qu'on
 *   va entendre avant d'ouvrir).
 */
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
  const xl = a.picture_xl || a.picture_big;
  // L'API s'arrête à 1000 px ; le CDN sert la même image en 1800 px qualité 100.
  return xl.replace(/\/\d+x\d+-000000-80-0-0\.jpg$/, "/1800x1800-000000-100-0-0.jpg");
}
/* Détourage du sujet (python rembg) : l'artiste reste en couleurs, le décor passe en bichromie. */
async function cutout(buf) {
  const dir = path.join(process.env.TMPDIR || "/tmp", "drf-cutouts");
  await mkdir(dir, { recursive: true });
  const key = createHash("md5").update(buf).digest("hex");
  const src = path.join(dir, `${key}.jpg`), dst = path.join(dir, `${key}.png`);
  try { return await readFile(dst); } catch {}
  await writeFile(src, buf);
  execFileSync("python3", [path.join(__dirname, "cutout.py"), src, dst], { stdio: ["ignore", "ignore", "inherit"], timeout: 300000 });
  return readFile(dst);
}

async function albumCover(id) {
  const a = await (await fetch(`https://api.deezer.com/album/${id}`)).json();
  if (!a.cover_xl) throw new Error(`Album Deezer ${id} sans pochette`);
  return a.cover_xl.replace(/\/\d+x\d+-000000-80-0-0\.jpg$/, "/1800x1800-000000-100-0-0.jpg");
}

async function toDataUri(src, mime = "image/jpeg") {
  if (!src) return null;
  const buf = /^https?:/.test(src) ? await fetchBuffer(src) : await readFile(path.resolve(src));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

import { TYPE } from "./type-library.mjs";
const LETTERINGS = TYPE;

async function loadFonts(used) {
  const cacheDir = path.join(process.env.TMPDIR || "/tmp", "drf-fonts");
  await mkdir(cacheDir, { recursive: true });
  const fams = [{ fam: "Inter", src: "google", css: "family=Inter:wght@600;700", weights: [600, 700] }, ...used.map((k) => LETTERINGS[k]).filter(Boolean)];
  const faces = [];
  for (const f of fams) for (const w of f.weights) {
    const file = path.join(cacheDir, `${slug(f.fam)}-${w}${f.italic ? "i" : ""}.ttf`);
    try {
      await readFile(file);
    } catch {
      try {
        const url0 = f.src === "fontshare" ? `https://api.fontshare.com/v2/css?${f.css}` : `https://fonts.googleapis.com/css2?${f.css}&display=swap`;
        const css = await (await fetch(url0, { headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/60" } })).text();
        // un bloc @font-face par graisse ; on prend l'URL .ttf du bloc dont le poids correspond
        let url = null;
        for (const block of css.split("@font-face")) {
          const wm = block.match(/font-weight:\s*(\d+)/), um = block.match(/url\(['"]?([^'")]+\.ttf)['"]?\)/);
          if (wm && um && parseInt(wm[1], 10) === w) url = um[1].startsWith("//") ? `https:${um[1]}` : um[1];
        }
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
 *  · photo plein cadre, visage dans le tiers haut. `tone` : "brand" (défaut : bichromie noir →
 *    rouge → ivoire, contraste et netteté renforcés — la signature des covers DailyRap),
 *    "color", "bw" ou "red" ;
 *  · logo petit dans le coin haut-gauche (tuile DR ou wordmark — jamais les deux), et rien
 *    d'autre à côté : pas de kicker, pas de liste d'artistes (kicker/sub restent possibles
 *    dans le JSON mais la série DailyRap ne les utilise pas) ;
 *  · le titre en gros, en bas à gauche, dans un lettrage adapté au mood (`lettering`) ;
 *  · option `band` : bandeau de couleur derrière le titre (New Music Friday, All Out) ;
 *  · `accent` : couleur du mot *accentué* / du bandeau (défaut rouge marque).
 *  Sans photo : fond `bg` (red | black | ivory) avec halo.
 */
function html({ fonts, logos, entry, photo, subject }) {
  const L = LETTERINGS[entry.lettering] || LETTERINGS.grotesk;
  const L2 = entry.lettering2 ? LETTERINGS[entry.lettering2] : null;
  const accent = entry.accent || "#F0001C";
  const tone = entry.tone || (photo ? "brand" : "none");
  const bg = entry.bg || "black";
  const dark = bg !== "ivory";
  const ink = entry.ink || (dark ? "#F7EFE6" : "#0A0707");
  const raw = entry.title.replace(/\*/g, "");
  const lines = raw.split(/\\n|\n/);
  const longest = Math.max(...lines.map((l) => l.length));
  // Plus petit qu'avant : Spotify laisse respirer la photo, le titre prend ~1/4 de la hauteur.
  const fs = Math.round(Math.max(72, Math.min(190, (1050 / Math.max(longest, 4)) * L.scale)) * (entry.size || 1));
  const title = rich(entry.title);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;box-sizing:border-box}
html,body{width:${SIZE}px;height:${SIZE}px;overflow:hidden;background:#0A0707}
.c{position:relative;width:${SIZE}px;height:${SIZE}px;overflow:hidden;color:${ink};background:${bg === "red" ? "#F0001C" : bg === "ivory" ? "#F7EFE6" : "#0A0707"}}
.halo{position:absolute;width:1200px;height:1200px;border-radius:50%;filter:blur(100px);opacity:.6;background:${bg === "red" ? "#6b000e" : bg === "ivory" ? "#ffc1c7" : accent};right:-520px;bottom:-560px}
img.p,img.s{transform:translate(${entry.shift ?? 0}%,${entry.shiftY ?? 0}%) scale(${entry.zoom ?? 1});transform-origin:50% 30%}
img.p{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% ${entry.focus ?? 12}%}
.brand img.p{filter:url(#brand)}
.brand img.p.bg{filter:url(#brand) blur(2px) brightness(.9)}
img.s{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% ${entry.focus ?? 12}%;filter:url(#crisp)}
.color img.p,.bw img.p{filter:url(#crisp)} .bw img.p{filter:url(#crisp) grayscale(1) contrast(1.1)}
.hasphoto .grain{opacity:.3}
.brand .shade{background:linear-gradient(180deg,rgba(10,7,7,.1) 0%,rgba(10,7,7,0) 28%,rgba(10,7,7,0) 50%,rgba(10,7,7,.9) 82%)}
${entry.shadeStrong ? ".c .shade{background:linear-gradient(180deg,rgba(10,7,7,.1) 0%,rgba(10,7,7,0) 26%,rgba(10,7,7,.35) 42%,rgba(10,7,7,.98) 57%)}" : ""}
.vignette{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 30%,transparent 55%,rgba(10,7,7,.55) 100%)}
.bw img.p{filter:grayscale(1) contrast(1.12)}
.red img.p{filter:url(#crisp) grayscale(1) contrast(1.25) brightness(.9)}
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
.band .wrap{left:0;right:0;padding:34px 56px 40px;background:${entry.band === true ? accent : entry.band}}
.title{font-family:"${L.fam}",system-ui,sans-serif;font-weight:${L.weights[0]};${L.italic ? "font-style:italic;" : ""}font-size:${fs}px;line-height:${L.lh};letter-spacing:${L.ls};${L.up ? "text-transform:uppercase;" : ""}text-wrap:balance;${L.italic && entry.lettering === "condensed" ? "transform:skewX(-6deg);transform-origin:left bottom;" : ""}text-shadow:0 8px 40px rgba(0,0,0,.35)}
.light .title{text-shadow:none}
.title em{font-style:inherit;color:${entry.band ? ink : accent}}
${L2 ? `.title em{font-family:"${L2.fam}",system-ui,sans-serif;font-weight:${L2.weights[0]};${L2.italic ? "font-style:italic;" : "font-style:normal;"}${L2.up ? "text-transform:uppercase;" : "text-transform:none;"}letter-spacing:${L2.ls};font-size:${Math.round(100 * L2.scale / L.scale)}%}` : ""}
${L.outline ? `.title{color:transparent;-webkit-text-stroke:5px ${ink}} .title em{color:${accent};-webkit-text-stroke:0}` : ""}
.sub{margin-top:18px;font:600 27px/1.25 "Inter",sans-serif;opacity:.85}
</style></head><body><div class="c ${tone} ${photo ? "hasphoto" : ""} ${entry.band ? "band" : ""} ${dark && !photo ? "" : (bg === "ivory" && !photo ? "light" : "")}">
${photo ? `<img class="p ${subject ? "bg" : ""}" src="${photo}">${subject ? `<img class="s" src="${subject}">` : ""}${tone === "red" ? `<div class="tint"></div>` : ""}${tone === "brand" ? `<div class="vignette"></div>` : ""}<div class="shade"></div>` : `<div class="halo"></div>`}
<div class="grain"></div>
<svg width="0" height="0" style="position:absolute">
<filter id="crisp" color-interpolation-filters="sRGB">
  <!-- Netteté « traits marqués » : masque flou large (clarté) + accentuation fine, puis micro-contraste -->
  <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="soft"/>
  <feComposite in="SourceGraphic" in2="soft" operator="arithmetic" k1="0" k2="1.55" k3="-0.55" k4="0" result="clarity"/>
  <feConvolveMatrix in="clarity" order="3" kernelMatrix="0 -0.5 0 -0.5 3 -0.5 0 -0.5 0" divisor="1" preserveAlpha="true" result="sharp"/>
  <feComponentTransfer in="sharp"><feFuncR type="linear" slope="1.08" intercept="-0.04"/><feFuncG type="linear" slope="1.08" intercept="-0.04"/><feFuncB type="linear" slope="1.08" intercept="-0.04"/></feComponentTransfer>
</filter>
<filter id="brand" color-interpolation-filters="sRGB">
  <feColorMatrix type="saturate" values="0"/>
  <feComponentTransfer><feFuncR type="gamma" amplitude="1" exponent="0.92" offset="0"/><feFuncG type="gamma" amplitude="1" exponent="0.92" offset="0"/><feFuncB type="gamma" amplitude="1" exponent="0.92" offset="0"/></feComponentTransfer>
  <feComponentTransfer><feFuncR type="table" tableValues="0.04 0.72 0.96 1"/><feFuncG type="table" tableValues="0.03 0.02 0.10 0.95"/><feFuncB type="table" tableValues="0.03 0.07 0.16 0.90"/></feComponentTransfer>
  <feConvolveMatrix order="3" kernelMatrix="0 -0.35 0 -0.35 2.4 -0.35 0 -0.35 0" divisor="1" preserveAlpha="true"/>
</filter></svg>
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
    loadFonts([...new Set(entries.flatMap((e) => [e.lettering || "grotesk", e.lettering2].filter(Boolean)))]),
  ]);
  const logos = { wordmark: `data:image/svg+xml;base64,${Buffer.from(wordmark).toString("base64")}`, tile: `data:image/png;base64,${tile.toString("base64")}` };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: SCALE });
  for (const entry of entries) {
    let photo = null, subject = null;
    try {
      const src = entry.photo || (entry.album ? await albumCover(entry.album) : entry.artist ? await artistPhoto(entry.artist) : null);
      if (src) {
        const buf = /^https?:/.test(src) ? await fetchBuffer(src) : await readFile(path.resolve(src));
        photo = `data:image/jpeg;base64,${buf.toString("base64")}`;
        if ((entry.tone || "brand") === "brand" && entry.cutout !== false) {
          try { subject = `data:image/png;base64,${(await cutout(buf)).toString("base64")}`; } catch (e) { console.error(`! détourage ${entry.title} : ${e.message} (photo entière en bichromie)`); }
        }
      }
    } catch (e) { console.error(`! photo ${entry.title} : ${e.message}`); }
    // Via un fichier (pas setContent) : depuis about:blank, Chromium refuse les polices en file://.
    const tmpHtml = path.join(opt.out, `.${entry.file || slug(entry.title)}.html`);
    await writeFile(tmpHtml, html({ fonts, logos, entry, photo, subject }));
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
