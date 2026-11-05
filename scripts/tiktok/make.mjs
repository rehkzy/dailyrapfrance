#!/usr/bin/env node
/*
 * Générateur de vidéos verticales (TikTok / Reels / Shorts) pour le blind test Daily Rap.
 *
 * Concept « T'as trouvé ? » : extrait Deezer de ~8 s avec pochette floutée + chrono rouge
 * qui décompte, puis révélation (pochette nette, artiste + titre), puis écran de fin
 * « Joue au blind test → dailyrapfrance.best ».
 *
 * Deux formats :
 *   --tracks 1 (défaut) : un son par vidéo (~14 s)          devine → révèle → fin
 *   --tracks 5          : plusieurs sons par vidéo (~61 s)  intro → (devine → révèle) ×5 → fin
 *
 * Pipeline : HTML rendu dans Chromium (Playwright) → captures 1080×1920 → assemblage ffmpeg
 * (xfade entre les écrans, acrossfade entre les extraits).
 * Aucune dépendance au reste du repo : seuls public/logo.svg et public/icon-512.png sont lus.
 *
 *   node scripts/tiktok/make.mjs --theme artist-ninho --count 3 --out ./out
 *   node scripts/tiktok/make.mjs --theme pop --tracks 5 --label "Top 50" --name top50 --out ./out
 *   node scripts/tiktok/make.mjs --ids 4333609992,2935905291 --out ./out
 *
 * Voir README.md pour les options.
 */

import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// require() plutôt qu'import : Playwright peut être installé globalement (NODE_PATH),
// ce que la résolution ESM ignore.
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("[tiktok] Playwright introuvable : npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const SITE = "https://www.dailyrapfrance.best";
const DEEZER = "https://api.deezer.com";
const UA = "dailyrap-tiktok-maker/1.0 (+https://dailyrapfrance.best)";

const W = 1080;
const H = 1920;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
const { values: opt } = parseArgs({
  options: {
    theme: { type: "string" },
    ids: { type: "string" },
    search: { type: "string" },
    count: { type: "string", default: "3" },
    tracks: { type: "string", default: "1" },
    name: { type: "string" },
    out: { type: "string", default: "./out" },
    label: { type: "string" },
    offset: { type: "string", default: "5" },
    guess: { type: "string", default: "8" },
    reveal: { type: "string" },
    intro: { type: "string", default: "3" },
    end: { type: "string", default: "3" },
    fps: { type: "string", default: "12" },
    "keep-frames": { type: "boolean", default: false },
    ffmpeg: { type: "string", default: process.env.FFMPEG || "ffmpeg" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (opt.help || (!opt.theme && !opt.ids && !opt.search)) {
  console.log(`Usage :
  node scripts/tiktok/make.mjs --theme <id> [--count 3] [--out ./out]
  node scripts/tiktok/make.mjs --theme <id> --tracks 5 --label "Top 50" --name top50
  node scripts/tiktok/make.mjs --ids 123,456 [--out ./out]
  node scripts/tiktok/make.mjs --search "ninho" [--count 1]

Options :
  --theme <id>       thème du blind test (ex. pop, 2010s, 13, artist-ninho) via l'API du site
  --ids a,b,c        IDs de titres Deezer (détail via api.deezer.com, sans passer par le site)
  --search "texte"   recherche Deezer, prend les premiers titres avec preview
  --tracks N         sons par vidéo (défaut 1 ; >1 ajoute une intro et un compteur « Son k/N »)
  --count N          nombre de vidéos (défaut 3)
  --name <base>      nom de fichier de sortie sans extension (une seule vidéo)
  --out <dir>        dossier de sortie (défaut ./out)
  --label "Texte"    pastille de thème (ex. "Spécial Marseille")
  --offset S         seconde de départ dans la preview Deezer (défaut 5)
  --guess S          durée de la devinette (défaut 8)
  --reveal S         durée de la révélation (défaut 4 en solo, 3 en multi)
  --intro S          durée de l'intro en multi (défaut 3)
  --end S            durée de l'écran de fin (défaut 3)
  --fps N            cadence de capture du chrono (défaut 12 ; la vidéo sort en 30 fps)
  --keep-frames      conserver toutes les captures intermédiaires
  --ffmpeg <bin>     binaire ffmpeg (défaut : ffmpeg dans le PATH, ou $FFMPEG)`);
  process.exit(opt.help ? 0 : 1);
}

const COUNT = Math.max(1, parseInt(opt.count, 10) || 3);
const TRACKS = Math.max(1, parseInt(opt.tracks, 10) || 1);
const MULTI = TRACKS > 1;
const OUT = path.resolve(opt.out);
const OFFSET = parseFloat(opt.offset);
const GUESS = parseFloat(opt.guess);
const REVEAL = opt.reveal != null ? parseFloat(opt.reveal) : MULTI ? 3 : 4;
const INTRO = MULTI ? parseFloat(opt.intro) : 0;
const END = parseFloat(opt.end);
const FPS = Math.max(2, parseInt(opt.fps, 10) || 12);
const FFMPEG = opt.ffmpeg;

const XF_SCREEN = 0.35; // fondu devine → révèle
const XF_TRACK = 0.3; // fondu entre deux sons / intro / fin
const AUDIO_FADE = 0.4;

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
const log = (...a) => console.log("[tiktok]", ...a);

function slug(s) {
  return (
    String(s)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "track"
  );
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const f3 = (n) => n.toFixed(3);

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res.json();
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} a échoué (${code})\n${err.slice(-2000)}`))));
  });
}

// Pochette HD : l'API du site renvoie du 250 px, le CDN Deezer sert les mêmes hashes en 1000 px.
function hdCover(url) {
  return url ? url.replace(/\/\d+x\d+-/, "/1000x1000-") : url;
}

// Répartit une liste de titres en `videos` groupes de `per` titres, en évitant autant que
// possible deux fois le même artiste dans une vidéo (on complète avec des doublons si le
// pool ne suffit pas).
function groupTracks(tracks, videos, per) {
  const pool = [...tracks];
  const groups = [];
  for (let v = 0; v < videos && pool.length; v++) {
    const group = [];
    const artists = new Set();
    for (let i = 0; i < pool.length && group.length < per; i++) {
      const key = pool[i].artistName.toLowerCase();
      if (artists.has(key)) continue;
      artists.add(key);
      group.push(pool.splice(i, 1)[0]);
      i--;
    }
    while (group.length < per && pool.length) group.push(pool.shift());
    groups.push(group);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Sources de titres
// ---------------------------------------------------------------------------
function fromDeezerTrack(t) {
  const main = t.artist?.name ?? "";
  const feats = (t.contributors ?? [])
    .map((c) => c.name)
    .filter((n) => n && n.toLowerCase() !== main.toLowerCase());
  return {
    id: String(t.id),
    title: t.title_short || t.title,
    artistName: main,
    feats,
    previewUrl: t.preview,
    coverUrl: t.album?.cover_xl || t.album?.cover_big || t.album?.cover_medium,
  };
}

async function tracksFromTheme(theme, count) {
  const url = `${SITE}/api/blindtest/pool?theme=${encodeURIComponent(theme)}&count=${count}`;
  let json;
  try {
    json = await fetchJson(url);
  } catch (e) {
    throw new Error(
      `Impossible d'interroger ${url} (${e.message}). Si le site refuse (403/429, protection bot), ` +
        `utilise --ids avec des IDs Deezer, ou --search.`
    );
  }
  const tracks = (json.tracks ?? []).filter((t) => t.previewUrl && !t.unplayable);
  if (!tracks.length) throw new Error(`Aucun titre jouable pour le thème « ${theme} ».`);
  return tracks.map((t) => ({
    id: String(t.id),
    title: t.title,
    artistName: t.artistName,
    feats: t.feats ?? [],
    previewUrl: t.previewUrl,
    coverUrl: hdCover(t.coverUrl),
  }));
}

async function tracksFromIds(ids) {
  const out = [];
  for (const id of ids) {
    const t = await fetchJson(`${DEEZER}/track/${id}`);
    if (t.error) {
      log(`! Deezer ${id} : ${t.error.message}`);
      continue;
    }
    if (!t.preview) {
      log(`! Deezer ${id} : pas de preview, ignoré`);
      continue;
    }
    out.push(fromDeezerTrack(t));
  }
  return out;
}

async function tracksFromSearch(q, count) {
  const json = await fetchJson(`${DEEZER}/search?q=${encodeURIComponent(q)}&limit=${Math.min(100, count * 3)}`);
  const withPreview = (json.data ?? []).filter((t) => t.preview).slice(0, count);
  if (!withPreview.length) throw new Error(`Aucun résultat avec preview pour « ${q} ».`);
  // Le résultat de recherche n'a pas les contributeurs : on récupère le détail (feats, cover_xl).
  return tracksFromIds(withPreview.map((t) => t.id));
}

// ---------------------------------------------------------------------------
// Assets : logos du repo, polices Google (cache local), pochette + preview par titre
// ---------------------------------------------------------------------------
async function loadLogos() {
  // Logo officiel = tuile « DR » rouge (icon-512.png) ; logo typo = wordmark blanc (logo.svg).
  const [wordmark, tile] = await Promise.all([
    readFile(path.join(REPO_ROOT, "public", "logo.svg"), "utf8"),
    readFile(path.join(REPO_ROOT, "public", "icon-512.png")),
  ]);
  return {
    wordmark: `data:image/svg+xml;base64,${Buffer.from(wordmark).toString("base64")}`,
    tile: `data:image/png;base64,${tile.toString("base64")}`,
  };
}

// Télécharge les TTF via le CSS Google Fonts (UA "ancien" pour obtenir du TTF universel).
// En cas d'échec réseau, on retombe sur les polices système (sans-serif bold).
async function loadFonts(cacheDir) {
  const families = [
    { name: "Bricolage Grotesque", css: "family=Bricolage+Grotesque:wght@700;800", weights: [700, 800] },
    { name: "Inter", css: "family=Inter:wght@500;700", weights: [500, 700] },
  ];
  const faces = [];
  for (const fam of families) {
    for (const weight of fam.weights) {
      const file = path.join(cacheDir, `${slug(fam.name)}-${weight}.ttf`);
      if (!(await exists(file))) {
        try {
          const css = await (
            await fetch(`https://fonts.googleapis.com/css2?${fam.css}&display=swap`, {
              headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/60" },
            })
          ).text();
          const re = /font-weight:\s*(\d+);[^}]*?src:\s*url\(([^)]+\.ttf)\)/g;
          let m;
          let url = null;
          while ((m = re.exec(css))) if (parseInt(m[1], 10) === weight) url = m[2];
          if (!url) throw new Error("URL TTF introuvable dans le CSS Google Fonts");
          await writeFile(file, await fetchBuffer(url));
        } catch (e) {
          log(`! police ${fam.name} ${weight} indisponible (${e.message}) — fallback système`);
          continue;
        }
      }
      faces.push(`@font-face{font-family:"${fam.name}";font-weight:${weight};src:url("${pathToFileURL(file).href}") format("truetype");}`);
    }
  }
  return faces.join("\n");
}

async function downloadTrackAssets(track, dir) {
  const cover = path.join(dir, "cover.jpg");
  const audio = path.join(dir, "preview.mp3");
  try {
    await writeFile(cover, await fetchBuffer(track.coverUrl));
  } catch (e) {
    // Le 1000 px n'existe pas pour toutes les pochettes : on retente en 500 puis en 250.
    let ok = false;
    for (const size of ["500x500", "250x250"]) {
      try {
        await writeFile(cover, await fetchBuffer(track.coverUrl.replace(/\/\d+x\d+-/, `/${size}-`)));
        ok = true;
        break;
      } catch {}
    }
    if (!ok) throw new Error(`Pochette introuvable : ${e.message}`);
  }
  try {
    await writeFile(audio, await fetchBuffer(track.previewUrl));
  } catch (e) {
    // Les URLs de preview sont signées et expirent ; celles renvoyées par le site peuvent
    // venir d'un cache périmé (403). On redemande une URL fraîche à Deezer.
    log(`  ! preview expirée (${e.message.split(" sur ")[0]}), nouvelle URL via api.deezer.com`);
    const fresh = await fetchJson(`${DEEZER}/track/${track.id}`);
    if (!fresh.preview) throw new Error(`Pas de preview Deezer pour ${track.id}`);
    await writeFile(audio, await fetchBuffer(fresh.preview));
  }
  return { cover, audio };
}

// ---------------------------------------------------------------------------
// Rendu HTML — une seule page par titre, écrans pilotés par data-screen :
// intro (multi), guess, reveal, end
// ---------------------------------------------------------------------------
function buildHtml({ track, coverUri, logos, fontFaces, label, index, total }) {
  const feats = track.feats?.length ? `feat. ${track.feats.join(", ")}` : "";
  const multi = total > 1;
  const chips = multi
    ? `<span class="chip">Son ${index + 1}/${total}</span>${label ? `<span class="chip gold">${esc(label)}</span>` : ""}`
    : `<span class="chip">Blind test</span>${label ? `<span class="chip gold">${esc(label)}</span>` : ""}`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<style>
${fontFaces}
:root{--bg:#0A0707;--red:#F0001C;--glow:#FF3B4E;--gold:#FFD166;--display:"Bricolage Grotesque",system-ui,"Segoe UI",Arial,sans-serif;--body:"Inter",system-ui,"Segoe UI",Arial,sans-serif;}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bg);color:#fff;font-family:var(--body);-webkit-font-smoothing:antialiased}
.screen{position:absolute;inset:0;display:none}
body[data-screen="intro"] .intro,body[data-screen="guess"] .guess,body[data-screen="reveal"] .reveal,body[data-screen="end"] .end{display:block}

/* fond : pochette très floutée, assombrie vers le noir de marque */
.bg{position:absolute;inset:-120px;background:url("${coverUri}") center/cover no-repeat;filter:blur(70px) saturate(1.3) brightness(.55);transform:scale(1.15)}
.bg-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,7,7,.55) 0%,rgba(10,7,7,.25) 35%,rgba(10,7,7,.3) 60%,rgba(10,7,7,.97) 100%)}
.grain{position:absolute;inset:0;opacity:.07;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='.9' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")}

.brand{position:absolute;top:110px;left:0;right:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px}
.brand img.tile{height:150px;border-radius:34px;box-shadow:0 20px 60px rgba(0,0,0,.55)}
.brand img.word{height:46px}
.chip{display:inline-block;font:700 28px/1 var(--body);letter-spacing:.14em;text-transform:uppercase;background:var(--red);color:#fff;padding:16px 26px;border-radius:999px;box-shadow:0 0 40px rgba(255,59,78,.55)}
.chip.gold{background:var(--gold);color:#1a0b0b;box-shadow:none}
.site{position:absolute;bottom:90px;left:0;right:0;text-align:center;font:700 32px var(--body);letter-spacing:.06em;color:rgba(255,255,255,.75)}
.site b{color:var(--gold)}

/* --- affiche bichromie rouge/noir (intro + fin) --- */
.poster{background:linear-gradient(160deg,#3a0a0f 0%,#8a0010 60%,#f0001c 130%)}
.poster .photo{position:absolute;inset:0;background:url("${coverUri}") center/cover no-repeat;filter:grayscale(1) contrast(1.15);mix-blend-mode:luminosity;opacity:.9}
.poster .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,7,7,.9) 0%,rgba(10,7,7,.35) 14%,rgba(240,0,28,.12) 26%,rgba(10,7,7,.1) 40%,rgba(10,7,7,.96) 100%)}
.poster .brand{top:140px}
.poster .brand img.word{height:56px}
.poster .big{position:absolute;left:70px;right:70px;text-align:center;font:800 150px/.9 var(--display);letter-spacing:-.05em;text-shadow:0 10px 50px rgba(0,0,0,.7)}
.poster .big span{color:var(--gold)}
.poster .arrow{position:absolute;left:0;right:0;text-align:center;font:800 70px var(--display);color:#fff}
.poster .pill{position:absolute;left:50%;transform:translateX(-50%);font:800 56px var(--display);letter-spacing:-.02em;background:#fff;color:#0A0707;padding:28px 60px;border-radius:999px;box-shadow:0 0 60px rgba(255,59,78,.7),0 20px 60px rgba(0,0,0,.6);white-space:nowrap}
.poster .sub{position:absolute;left:60px;right:60px;text-align:center;font:500 38px/1.3 var(--body);color:rgba(255,255,255,.8)}

/* --- INTRO --- */
.intro .brand{top:470px}
.intro .brand img.tile{height:220px;border-radius:50px}
.intro .brand img.word{height:80px}
.intro .big{top:860px}
.intro .chips{position:absolute;top:1290px;left:0;right:0;display:flex;justify-content:center;gap:16px}
.intro .sub{top:1420px;font-weight:700;color:#fff}
.intro .sub2{top:1510px;color:rgba(255,255,255,.7)}

/* --- DEVINE --- */
.guess .headline{position:absolute;top:236px;left:0;right:0;text-align:center;font:800 150px/.92 var(--display);letter-spacing:-.045em;text-shadow:0 10px 50px rgba(0,0,0,.6)}
.guess .headline span{color:var(--red);text-shadow:0 0 40px var(--glow)}
.guess .chips{position:absolute;top:560px;left:0;right:0;display:flex;justify-content:center;gap:16px}
.cover-box{position:absolute;left:150px;top:660px;width:780px;height:780px;border-radius:44px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 0 3px rgba(255,255,255,.08)}
.cover-box img{position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover}
.guess .cover-box img{filter:blur(46px) saturate(1.25) contrast(1.1)}
.guess .cover-box::after{content:"";position:absolute;inset:0;background:rgba(10,7,7,.35)}
.timer{position:absolute;left:50%;top:840px;width:420px;height:420px;margin-left:-210px}
.timer svg{position:absolute;inset:0;overflow:visible;transform:rotate(-90deg)}
.timer svg.glow{filter:drop-shadow(0 0 24px rgba(240,0,28,.8)) drop-shadow(0 0 70px rgba(240,0,28,.45))}
.timer .track{fill:none;stroke:rgba(255,255,255,.14);stroke-width:22}
.timer .arc{fill:none;stroke:var(--red);stroke-width:22;stroke-linecap:round}
.timer .num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:800 220px/1 var(--display);letter-spacing:-.05em;text-shadow:0 0 40px rgba(0,0,0,.8)}
.timer .disc{position:absolute;inset:34px;border-radius:50%;background:rgba(10,7,7,.74)}
.guess .cta{position:absolute;top:1530px;left:60px;right:60px;text-align:center;font:700 50px/1.2 var(--body);letter-spacing:-.01em;color:#fff}
.guess .cta small{display:block;margin-top:14px;font:500 36px var(--body);color:rgba(255,255,255,.7)}

/* --- RÉVÉLATION --- */
.reveal .cover-box{top:430px;box-shadow:0 0 0 4px rgba(255,255,255,.1),0 40px 140px rgba(240,0,28,.45),0 60px 160px rgba(0,0,0,.8)}
.reveal .kicker{position:absolute;top:300px;left:0;right:0;text-align:center;font:800 44px var(--display);letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.reveal .info{position:absolute;top:1290px;left:70px;right:70px;text-align:center;display:flex;flex-direction:column;gap:28px;align-items:center}
.reveal .artist{font:800 118px/.95 var(--display);letter-spacing:-.045em;text-shadow:0 10px 50px rgba(0,0,0,.7);overflow-wrap:anywhere}
.reveal .title{font:700 62px/1.15 var(--body);color:var(--gold);letter-spacing:-.02em}
.reveal .feats{font:500 36px var(--body);color:rgba(255,255,255,.7)}

/* --- FIN --- */
.end .big{top:${multi ? 900 : 1010}px}
.end .arrow{top:${multi ? 1340 : 1450}px}
.end .pill{top:${multi ? 1450 : 1560}px}
.end .sub{top:${multi ? 1620 : 1720}px}
.end .sub2{top:1720px;font-weight:700;color:#fff}
</style></head>
<body data-screen="guess">

<section class="screen intro poster">
  <div class="photo"></div><div class="shade"></div><div class="grain"></div>
  <div class="brand"><img class="tile" src="${logos.tile}"><img class="word" src="${logos.wordmark}"></div>
  <h1 class="big">BLIND<br>TEST<br><span>RAP FR</span></h1>
  <div class="chips">${label ? `<span class="chip gold">${esc(label)}</span>` : `<span class="chip">Daily Rap</span>`}</div>
  <p class="sub">${total} sons · ${GUESS} secondes chacun</p>
  <p class="sub sub2">Trouve l'artiste + le titre</p>
  <p class="site"><b>dailyrapfrance</b>.best</p>
</section>

<section class="screen guess">
  <div class="bg"></div><div class="bg-shade"></div><div class="grain"></div>
  <div class="brand"><img class="word" src="${logos.wordmark}"></div>
  <h1 class="headline">T'AS<br>TROUVÉ<span>?</span></h1>
  <div class="chips">${chips}</div>
  <div class="cover-box"><img src="${coverUri}"></div>
  <div class="timer">
    <div class="disc"></div>
    <svg viewBox="0 0 420 420"><circle class="track" cx="210" cy="210" r="188"/></svg>
    <svg class="glow" viewBox="0 0 420 420"><circle class="arc" id="arc" cx="210" cy="210" r="188"/></svg>
    <div class="num" id="num">${GUESS}</div>
  </div>
  <p class="cta">Mets ta réponse en commentaire 👇<small>Artiste + titre</small></p>
  <p class="site"><b>dailyrapfrance</b>.best</p>
</section>

<section class="screen reveal">
  <div class="bg"></div><div class="bg-shade"></div><div class="grain"></div>
  <div class="brand"><img class="word" src="${logos.wordmark}"></div>
  <p class="kicker">${multi ? `Son ${index + 1}/${total} · c'était…` : "C'était…"}</p>
  <div class="cover-box"><img src="${coverUri}"></div>
  <div class="info"><h2 class="artist">${esc(track.artistName)}</h2><p class="title">${esc(track.title)}</p>${feats ? `<p class="feats">${esc(feats)}</p>` : ""}</div>
  <p class="site"><b>dailyrapfrance</b>.best</p>
</section>

<section class="screen end poster">
  <div class="photo"></div><div class="shade"></div><div class="grain"></div>
  <div class="brand"><img class="tile" src="${logos.tile}"><img class="word" src="${logos.wordmark}"></div>
  ${
    multi
      ? `<h2 class="big">TON<br>SCORE<span>?</span></h2>
  <p class="arrow">↓</p>
  <p class="pill">dailyrapfrance.best</p>
  <p class="sub">Joue au vrai blind test</p>
  <p class="sub sub2">Mets ton score en commentaire 👇</p>`
      : `<h2 class="big">JOUE AU<br>BLIND<br>TEST<span>.</span></h2>
  <p class="arrow">↓</p>
  <p class="pill">dailyrapfrance.best</p>
  <p class="sub">Gratuit · 100 % rap FR · des dizaines de thèmes</p>`
  }
</section>

<script>
  const C = 2 * Math.PI * 188;
  const arc = document.getElementById("arc");
  arc.style.strokeDasharray = C;
  // p = fraction restante (1 → plein, 0 → vide)
  window.setTimer = (remaining, total) => {
    const p = Math.max(0, Math.min(1, remaining / total));
    arc.style.strokeDashoffset = C * (1 - p);
    document.getElementById("num").textContent = Math.ceil(remaining - 1e-6);
  };
  window.setScreen = (s) => { document.body.dataset.screen = s; };
  window.setTimer(${GUESS}, ${GUESS});
</script>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Capture Playwright
// ---------------------------------------------------------------------------
async function renderTrack(browser, html, workDir, { intro = false, end = false } = {}) {
  const htmlPath = path.join(workDir, "page.html");
  await writeFile(htmlPath, html);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);

  const shot = async (screen, file, type = "png") => {
    await page.evaluate((s) => window.setScreen(s), screen);
    await page.waitForTimeout(40);
    await page.screenshot({ path: file, type });
  };

  const out = {};
  if (intro) await shot("intro", (out.intro = path.join(workDir, "frame-intro.png")));

  // Devinette : une capture par 1/FPS s, chrono qui décompte de GUESS à 0.
  const framesDir = path.join(workDir, "frames");
  await mkdir(framesDir, { recursive: true });
  await page.evaluate((s) => window.setScreen(s), "guess");
  const n = Math.round(GUESS * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(([r, t]) => window.setTimer(r, t), [GUESS - i / FPS, GUESS]);
    await page.screenshot({ path: path.join(framesDir, `guess_${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 93 });
  }
  out.framesDir = framesDir;
  await page.evaluate(([r, t]) => window.setTimer(r, t), [GUESS, GUESS]);
  await page.screenshot({ path: path.join(workDir, "frame-guess.png"), type: "png" });
  await shot("reveal", (out.reveal = path.join(workDir, "frame-reveal.png")));
  if (end) await shot("end", (out.end = path.join(workDir, "frame-end.png")));
  await page.close();
  await rm(htmlPath, { force: true });
  return out;
}

// ---------------------------------------------------------------------------
// Assemblage ffmpeg — segments [intro?] + (devine+révèle) × N + fin, enchaînés par xfade
// (vidéo) et acrossfade (audio). Chaque segment a une durée vidéo = durée audio.
// ---------------------------------------------------------------------------
async function assemble({ intro, parts, end, output }) {
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  const filters = [];
  const segs = []; // { v, a, len }
  let inputIdx = 0;
  const addInput = (...a) => {
    args.push(...a);
    return inputIdx++;
  };
  const trackLen = GUESS + REVEAL; // le fondu devine→révèle mord sur la révélation, pas sur le total

  if (intro) {
    const i = addInput("-loop", "1", "-t", String(INTRO + 1), "-i", intro);
    filters.push(`[${i}:v]fps=30,format=yuv420p,setsar=1,trim=duration=${f3(INTRO)}[vi]`);
    filters.push(`aevalsrc=0:s=44100:c=stereo:d=${f3(INTRO)}[ai]`);
    segs.push({ v: "[vi]", a: "[ai]", len: INTRO });
  }

  parts.forEach((p, k) => {
    const g = addInput("-framerate", String(FPS), "-i", path.join(p.framesDir, "guess_%04d.jpg"));
    const r = addInput("-loop", "1", "-t", String(REVEAL + XF_SCREEN + 1), "-i", p.reveal);
    const a = addInput("-ss", String(OFFSET), "-t", String(GUESS + REVEAL), "-i", p.audio);
    filters.push(`[${g}:v]fps=30,format=yuv420p,setsar=1[g${k}]`);
    filters.push(`[${r}:v]fps=30,format=yuv420p,setsar=1[r${k}]`);
    filters.push(`[g${k}][r${k}]xfade=transition=fade:duration=${XF_SCREEN}:offset=${f3(GUESS - XF_SCREEN)},trim=duration=${f3(trackLen)}[vt${k}]`);
    filters.push(
      `[${a}:a]aformat=sample_rates=44100:channel_layouts=stereo,apad=whole_dur=${f3(trackLen)},atrim=duration=${f3(trackLen)},` +
        `afade=t=in:st=0:d=${AUDIO_FADE},afade=t=out:st=${f3(trackLen - AUDIO_FADE)}:d=${AUDIO_FADE}[at${k}]`
    );
    segs.push({ v: `[vt${k}]`, a: `[at${k}]`, len: trackLen });
  });

  {
    const i = addInput("-loop", "1", "-t", String(END + 1), "-i", end);
    filters.push(`[${i}:v]fps=30,format=yuv420p,setsar=1,trim=duration=${f3(END)}[ve]`);
    filters.push(`aevalsrc=0:s=44100:c=stereo:d=${f3(END)}[ae]`);
    segs.push({ v: "[ve]", a: "[ae]", len: END });
  }

  // Enchaînement
  let v = segs[0].v;
  let a = segs[0].a;
  let total = segs[0].len;
  for (let k = 1; k < segs.length; k++) {
    const nv = `[vx${k}]`;
    const na = `[ax${k}]`;
    filters.push(`${v}${segs[k].v}xfade=transition=fade:duration=${XF_TRACK}:offset=${f3(total - XF_TRACK)}${nv}`);
    filters.push(`${a}${segs[k].a}acrossfade=d=${XF_TRACK}:c1=tri:c2=tri${na}`);
    v = nv;
    a = na;
    total += segs[k].len - XF_TRACK;
  }
  filters.push(`${v}fade=t=in:st=0:d=0.3,fade=t=out:st=${f3(total - 0.6)}:d=0.6[v]`);
  filters.push(`${a}atrim=duration=${f3(total)}[a]`);

  await run(FFMPEG, [
    ...args,
    "-filter_complex", filters.join(";"),
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p", "-r", "30",
    "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
    "-movflags", "+faststart", "-t", f3(total),
    output,
  ]);
  return total;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await mkdir(OUT, { recursive: true });
  const cacheDir = path.join(OUT, ".cache");
  await mkdir(cacheDir, { recursive: true });

  const need = COUNT * TRACKS;
  let tracks;
  if (opt.ids) tracks = await tracksFromIds(opt.ids.split(",").map((s) => s.trim()).filter(Boolean));
  else if (opt.theme) tracks = await tracksFromTheme(opt.theme, MULTI ? Math.min(100, need * 6) : need);
  else tracks = await tracksFromSearch(opt.search, MULTI ? need * 2 : need);
  if (!tracks.length) throw new Error("Aucun titre à traiter.");

  const groups = MULTI ? groupTracks(tracks, COUNT, TRACKS) : tracks.slice(0, COUNT).map((t) => [t]);
  if (opt.name && groups.length > 1) throw new Error("--name ne s'utilise qu'avec une seule vidéo (--count 1).");
  for (const g of groups) {
    if (MULTI && g.length < TRACKS) log(`! seulement ${g.length}/${TRACKS} sons disponibles pour une vidéo`);
    const artists = g.map((t) => t.artistName.toLowerCase());
    if (new Set(artists).size < artists.length) log("! doublon d'artiste dans une vidéo (pool trop petit)");
  }

  const [logos, fontFaces] = await Promise.all([loadLogos(), loadFonts(cacheDir)]);
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const group of groups) {
      const base = opt.name
        ? slug(opt.name)
        : MULTI
          ? `${slug(opt.label || opt.theme || opt.search || "blindtest")}-${group.length}-sons-${group[0].id}`
          : `${slug(group[0].artistName)}-${slug(group[0].title)}`;
      const workDir = path.join(OUT, base);
      await mkdir(workDir, { recursive: true });
      log(`→ ${base} : ${group.map((t) => `${t.artistName} – ${t.title}`).join(" | ")}`);

      const parts = [];
      let intro = null;
      let end = null;
      for (let i = 0; i < group.length; i++) {
        const track = group[i];
        const dir = MULTI ? path.join(workDir, `${String(i + 1).padStart(2, "0")}-${slug(track.artistName)}-${slug(track.title)}`) : workDir;
        await mkdir(dir, { recursive: true });
        const { cover, audio } = await downloadTrackAssets(track, dir);
        const coverUri = `data:image/jpeg;base64,${(await readFile(cover)).toString("base64")}`;
        const html = buildHtml({ track, coverUri, logos, fontFaces, label: opt.label, index: i, total: group.length });
        // L'intro porte la pochette du 1er son, la fin celle du dernier (en bichromie).
        const frames = await renderTrack(browser, html, dir, { intro: MULTI && i === 0, end: i === group.length - 1 });
        if (frames.intro) intro = frames.intro;
        if (frames.end) end = frames.end;
        parts.push({ framesDir: frames.framesDir, reveal: frames.reveal, audio });
      }

      const output = path.join(OUT, `${base}.mp4`);
      const dur = await assemble({ intro, parts, end, output });
      if (!opt["keep-frames"]) for (const p of parts) await rm(p.framesDir, { recursive: true, force: true });
      log(`  ✓ ${output} (${dur.toFixed(1)} s)`);
      results.push(output);
    }
  } finally {
    await browser.close();
  }

  console.log("\nVidéos générées :");
  for (const r of results) console.log(`  ${r}`);
  console.log(`Frames clés (PNG) dans ${OUT}/<nom>/ (frame-intro, frame-guess, frame-reveal, frame-end).`);
}

main().catch((e) => {
  console.error("[tiktok] erreur :", e.message);
  process.exit(1);
});
