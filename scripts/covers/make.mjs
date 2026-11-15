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
 *           rouge — `photo` = URL ou chemin, ou `artist` = nom Deezer : photo récupérée)
 */
import { parseArgs } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { console.error("Playwright introuvable : npm i -D playwright && npx playwright install chromium"); process.exit(1); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SIZE = 1000;
const MAX_BYTES = 250 * 1024;

const { values: opt } = parseArgs({
  options: {
    list: { type: "string" },
    title: { type: "string" },
    kicker: { type: "string" },
    sub: { type: "string" },
    style: { type: "string" },
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

async function loadFonts() {
  // Même cache que le générateur TikTok (Bricolage Grotesque + Inter), sinon Google Fonts.
  const cacheDir = path.join(process.env.TMPDIR || "/tmp", "drf-fonts");
  await mkdir(cacheDir, { recursive: true });
  const fams = [
    { name: "Bricolage Grotesque", css: "family=Bricolage+Grotesque:wght@700;800", weights: [700, 800] },
    { name: "Inter", css: "family=Inter:wght@500;700", weights: [500, 700] },
  ];
  const faces = [];
  for (const fam of fams) for (const w of fam.weights) {
    const file = path.join(cacheDir, `${slug(fam.name)}-${w}.ttf`);
    try {
      await readFile(file);
    } catch {
      try {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?${fam.css}&display=swap`, { headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/60" } })).text();
        const re = /font-weight:\s*(\d+);[^}]*?src:\s*url\(([^)]+\.ttf)\)/g;
        let m, url = null;
        while ((m = re.exec(css))) if (parseInt(m[1], 10) === w) url = m[2];
        if (!url) throw new Error("pas de TTF");
        await writeFile(file, await fetchBuffer(url));
      } catch (e) { console.error(`! police ${fam.name} ${w} : ${e.message} (fallback système)`); continue; }
    }
    faces.push(`@font-face{font-family:"${fam.name}";font-weight:${w};src:url("${pathToFileURL(file).href}") format("truetype")}`);
  }
  return faces.join("\n");
}

function html({ fonts, logos, entry, photo }) {
  const style = entry.style || (photo ? "photo" : "red");
  const title = rich(entry.title);
  const words = entry.title.replace(/\*/g, "").split(/\s+/);
  const longest = Math.max(...words.map((w) => w.length));
  // Taille du titre : un mot court = énorme, une phrase = plus petit, toujours sur ≤ 3 lignes.
  const fs = Math.max(96, Math.min(230, Math.floor(1700 / Math.max(longest, 6))));
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
${fonts}
*{margin:0;box-sizing:border-box}
:root{--red:#F0001C;--black:#0A0707;--ivory:#F7EFE6;--display:"Bricolage Grotesque",system-ui,sans-serif;--body:"Inter",system-ui,sans-serif}
html,body{width:${SIZE}px;height:${SIZE}px;overflow:hidden;background:var(--black)}
.c{position:relative;width:${SIZE}px;height:${SIZE}px;overflow:hidden;font-family:var(--display);color:var(--ivory);background:var(--red)}
.c.noir{background:var(--black)} .c.ivory{background:var(--ivory);color:var(--black)} .c.photo{background:var(--black)}
/* matière : grain + halo, pour ne pas avoir un aplat plat dans la grille */
.grain{position:absolute;inset:0;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .26 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");opacity:.5;mix-blend-mode:overlay;pointer-events:none}
.halo{position:absolute;width:1100px;height:1100px;border-radius:50%;filter:blur(90px);opacity:.55}
.red .halo{background:#7a0010;right:-420px;bottom:-520px}
.noir .halo{background:var(--red);left:-520px;top:-520px;opacity:.5}
.ivory .halo{background:#ffb3bb;right:-500px;top:-500px;opacity:.6}
.photo img.p{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 18%;filter:grayscale(1) contrast(1.25) brightness(.85)}
.photo .tint{position:absolute;inset:0;background:var(--red);mix-blend-mode:multiply;opacity:.92}
.photo .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,7,7,.1) 0%,rgba(10,7,7,.05) 40%,rgba(10,7,7,.92) 82%)}
.tile{position:absolute;top:56px;left:56px;width:118px;height:118px;border-radius:28px;box-shadow:0 14px 40px rgba(0,0,0,.35)}
.ivory .tile{box-shadow:0 14px 40px rgba(0,0,0,.18)}
.kicker{position:absolute;top:70px;left:200px;right:56px;font:800 30px/1.1 var(--display);letter-spacing:.14em;text-transform:uppercase;opacity:.9}
.kicker small{display:block;margin-top:10px;font:500 24px var(--body);letter-spacing:0;text-transform:none;opacity:.75}
.title{position:absolute;left:56px;right:56px;bottom:150px;font:800 ${fs}px/0.92 var(--display);letter-spacing:-.045em;text-wrap:balance;overflow-wrap:anywhere}
.title em{font-style:normal;color:var(--ivory)}
.red .title em{color:var(--black)} .noir .title em,.photo .title em{color:var(--red)} .ivory .title em{color:var(--red)}
.red .title{text-shadow:0 10px 40px rgba(0,0,0,.18)}
.sub{position:absolute;left:56px;right:56px;bottom:96px;font:700 30px var(--body);opacity:.85}
.foot{position:absolute;left:56px;right:56px;bottom:50px;display:flex;align-items:center;justify-content:space-between}
.foot img{height:26px;opacity:.95}
.ivory .foot img{filter:invert(1)}
.foot b{font:800 24px var(--display);letter-spacing:.16em;text-transform:uppercase;opacity:.85;padding:10px 18px;border:3px solid currentColor;border-radius:999px}
</style></head><body><div class="c ${style}">
${style === "photo" && photo ? `<img class="p" src="${photo}"><div class="tint"></div>` : `<div class="halo"></div>`}
${style === "photo" ? `<div class="shade"></div>` : ""}
<div class="grain"></div>
<img class="tile" src="${logos.tile}">
${entry.kicker ? `<div class="kicker">${rich(entry.kicker)}${entry.sub ? `<small>${esc(entry.sub)}</small>` : ""}</div>` : ""}
<h1 class="title">${title}</h1>
<div class="foot"><img src="${logos.wordmark}"><b>${esc(entry.year || String(new Date().getFullYear()))}</b></div>
</div></body></html>`;
}

async function main() {
  const entries = opt.list ? JSON.parse(await readFile(opt.list, "utf8")) : [{ title: opt.title, kicker: opt.kicker, sub: opt.sub, style: opt.style, artist: opt.artist, photo: opt.photo }];
  await mkdir(opt.out, { recursive: true });
  const [wordmark, tile, fonts] = await Promise.all([
    readFile(path.join(REPO_ROOT, "public", "logo.svg"), "utf8"),
    readFile(path.join(REPO_ROOT, "public", "icon-512.png")),
    loadFonts(),
  ]);
  const logos = { wordmark: `data:image/svg+xml;base64,${Buffer.from(wordmark).toString("base64")}`, tile: `data:image/png;base64,${tile.toString("base64")}` };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
  for (const entry of entries) {
    let photo = null;
    try {
      if (entry.photo) photo = await toDataUri(entry.photo);
      else if (entry.artist) photo = await toDataUri(await artistPhoto(entry.artist));
    } catch (e) { console.error(`! photo ${entry.title} : ${e.message}`); }
    await page.setContent(html({ fonts, logos, entry, photo }), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(opt.out, `${entry.file || slug(entry.title)}.jpg`);
    let q = 92, buf;
    do { buf = await page.screenshot({ type: "jpeg", quality: q }); q -= 6; } while (buf.length > MAX_BYTES && q > 40);
    await writeFile(file, buf);
    console.log(`✓ ${file} (${Math.round(buf.length / 1024)} Ko)`);
  }
  await browser.close();
}
main().catch((e) => { console.error("erreur :", e.message); process.exit(1); });
