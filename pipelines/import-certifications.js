// Import des certifications officielles (SNEP / UPFI) — VOLONTAIREMENT MANUEL.
//
// Pourquoi ce n'est pas un pipeline automatique comme ingest-spotify.js / ingest-news.js :
// - snepmusique.com refuse explicitement l'accès automatisé (robots.txt bloque le
//   téléchargement programmatique de l'export CSV, testé le 26/07/2026).
// - Aucun des deux organismes (SNEP, UPFI) n'expose d'API publique — seulement des pages
//   avec filtres + un bouton "Télécharger en CSV" pensé pour un usage humain, occasionnel.
// - Respecter cette limite : télécharger le fichier vous-même (SNEP : bouton "Télécharger
//   en CSV" sur https://snepmusique.com/les-certifications/ ; UPFI : copier le tableau
//   depuis https://upfi.fr/certifications), puis lancer ce script dessus.
//
// Usage :
//   node pipelines/import-certifications.js chemin/vers/export.csv --source=SNEP
//   node pipelines/import-certifications.js chemin/vers/export.csv --source=UPFI
//
// Le script n'importe QUE les lignes dont l'artiste correspond déjà à un artiste suivi
// dans la base (nom ou alias) — il n'aspire pas tout le catalogue SNEP/UPFI, seulement
// la scène rap déjà référencée sur DailyRapFrance. Les lignes non matchées sont listées
// en fin d'exécution pour arbitrage manuel (ajouter l'artiste, ou ignorer).
//
// ⚠️ Les noms de colonnes ci-dessous sont déduits de l'interface publique de
// snepmusique.com/les-certifications (Titre, Artiste, Label(s), Catégorie, Certification,
// Date de sortie, Date de constat). Le fichier CSV réel n'a pas pu être inspecté ici
// (accès automatisé refusé) — si l'import ne trouve aucune colonne reconnue, ouvrez le
// CSV et ajustez COLUMN_HINTS ci-dessous pour qu'il corresponde aux vrais en-têtes.

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const COLUMN_HINTS = {
  title: ["titre", "title"],
  artist: ["artiste", "artist"],
  label: ["label", "distributeur"],
  category: ["categorie", "format"], // "Singles" / "Albums" / "Vidéos" / "DVD"
  level: ["certification", "niveau", "type"],
  certifiedAt: ["date de constat", "constat", "année", "annee", "year"],
  releaseDate: ["date de sortie", "sortie"],
};

// ── Utilitaires ──────────────────────────────────────────────────────────────

function normalize(str) {
  return (str ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function slugify(name) {
  return normalize(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Parser CSV minimal (pas de dépendance ajoutée) : gère guillemets, virgule ET
// point-virgule (les exports français utilisent souvent ; comme séparateur).
function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function findColumn(headerRow, hints) {
  const normalizedHeaders = headerRow.map(normalize);
  for (const hint of hints) {
    const idx = normalizedHeaders.findIndex((h) => h.includes(hint));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseFrenchDate(str) {
  if (!str) return null;
  const s = str.trim();
  // JJ/MM/AAAA
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  // AAAA seul (colonne "Année" côté UPFI)
  const y = s.match(/^(\d{4})$/);
  if (y) return new Date(Date.UTC(+y[1], 0, 1));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseLevel(raw) {
  const s = normalize(raw);
  let multiplier = 1;
  if (/\bdouble\b/.test(s)) multiplier = 2;
  else if (/\btriple\b/.test(s)) multiplier = 3;
  else if (/\bquadruple\b/.test(s)) multiplier = 4;
  else {
    const fois = s.match(/(\d+)\s*fois/);
    if (fois) multiplier = parseInt(fois[1], 10);
  }

  let level = null;
  if (s.includes("diamant")) level = "DIAMANT";
  else if (s.includes("platine")) level = "PLATINE";
  else if (s.includes("or")) level = "OR"; // dernier recours : "or" est un mot court, testé en dernier

  return level ? { level, multiplier } : null;
}

function parseCategory(raw) {
  const s = normalize(raw);
  if (s.includes("single")) return "SINGLE";
  if (s.includes("album")) return "ALBUM";
  return null; // vidéos / DVD : hors périmètre du modèle Release actuel
}

// Une ligne peut lister plusieurs artistes ("DJADJA & DINAZ", "GIMS, L2B", "PLK X GAZO").
// On ne retient que le premier nom qui correspond à un artiste déjà suivi.
function splitArtistNames(raw) {
  return (raw ?? "")
    .split(/,|&|\bfeat\.?\b|\bx\b|\bX\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Programme principal ──────────────────────────────────────────────────────

async function main() {
  const [, , filePath, ...rest] = process.argv;
  const sourceArg = rest.find((a) => a.startsWith("--source="));
  const source = sourceArg ? sourceArg.split("=")[1].toUpperCase() : "SNEP";

  if (!filePath) {
    console.error("Usage : node pipelines/import-certifications.js <fichier.csv> [--source=SNEP|UPFI]");
    process.exit(1);
  }
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Fichier introuvable : ${resolved}`);
    process.exit(1);
  }

  const text = fs.readFileSync(resolved, "utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    console.error("CSV vide ou illisible.");
    process.exit(1);
  }

  const header = rows[0];
  const col = {
    title: findColumn(header, COLUMN_HINTS.title),
    artist: findColumn(header, COLUMN_HINTS.artist),
    category: findColumn(header, COLUMN_HINTS.category),
    level: findColumn(header, COLUMN_HINTS.level),
    certifiedAt: findColumn(header, COLUMN_HINTS.certifiedAt),
    releaseDate: findColumn(header, COLUMN_HINTS.releaseDate),
  };

  const missing = Object.entries(col).filter(([, i]) => i === -1).map(([k]) => k);
  if (missing.length) {
    console.error(
      `⚠ Colonnes non reconnues : ${missing.join(", ")}.\n` +
      `  En-têtes trouvés dans le fichier : ${header.join(" | ")}\n` +
      `  → Ajustez COLUMN_HINTS en haut du script pour qu'il matche ces en-têtes, puis relancez.`
    );
    process.exit(1);
  }

  // Roster d'artistes déjà suivis — on n'importe que ce qui matche.
  const artists = await prisma.artist.findMany({ select: { id: true, name: true, slug: true, aliases: true } });
  const artistIndex = new Map();
  for (const a of artists) {
    artistIndex.set(normalize(a.name), a);
    for (const alias of a.aliases ?? []) artistIndex.set(normalize(alias), a);
  }

  let imported = 0;
  let skippedNoArtist = 0;
  let skippedBadRow = 0;
  const unmatched = new Set();

  for (const row of rows.slice(1)) {
    const title = row[col.title]?.trim();
    const artistRaw = row[col.artist]?.trim();
    const levelRaw = row[col.level]?.trim();
    const certifiedAtRaw = row[col.certifiedAt]?.trim();
    const releaseDateRaw = row[col.releaseDate]?.trim();
    const categoryRaw = row[col.category]?.trim();

    if (!title || !artistRaw || !levelRaw) {
      skippedBadRow++;
      continue;
    }

    const parsedLevel = parseLevel(levelRaw);
    const certifiedAt = parseFrenchDate(certifiedAtRaw);
    if (!parsedLevel || !certifiedAt) {
      skippedBadRow++;
      continue;
    }

    const releaseType = parseCategory(categoryRaw);
    if (!releaseType) continue; // vidéo/DVD — hors périmètre, on n'incrémente aucun compteur d'erreur

    let matchedArtist = null;
    for (const name of splitArtistNames(artistRaw)) {
      const hit = artistIndex.get(normalize(name));
      if (hit) {
        matchedArtist = hit;
        break;
      }
    }
    if (!matchedArtist) {
      skippedNoArtist++;
      unmatched.add(artistRaw);
      continue;
    }

    // Rattacher (ou créer) la sortie correspondante pour ce titre.
    let release = await prisma.release.findFirst({
      where: {
        title: { equals: title, mode: "insensitive" },
        artists: { some: { artistId: matchedArtist.id } },
      },
    });
    if (!release) {
      release = await prisma.release.create({
        data: {
          slug: slugify(`${matchedArtist.name}-${title}`),
          title,
          type: releaseType,
          status: "RELEASED",
          releaseDate: parseFrenchDate(releaseDateRaw),
          artists: { create: { artistId: matchedArtist.id, role: "MAIN" } },
        },
      });
    }

    await prisma.certification.upsert({
      where: {
        certification_natural_key: {
          artistId: matchedArtist.id,
          releaseId: release.id,
          level: parsedLevel.level,
          multiplier: parsedLevel.multiplier,
          certifiedAt,
        },
      },
      update: { source, sourceUrl: null },
      create: {
        artistId: matchedArtist.id,
        releaseId: release.id,
        level: parsedLevel.level,
        multiplier: parsedLevel.multiplier,
        certifiedAt,
        source,
      },
    });
    imported++;
  }

  console.log(`\nImport terminé — source : ${source}`);
  console.log(`  ✓ ${imported} certification(s) importée(s) ou mise(s) à jour`);
  console.log(`  ⚠ ${skippedNoArtist} ligne(s) ignorée(s) — artiste non suivi sur DailyRapFrance`);
  console.log(`  ✗ ${skippedBadRow} ligne(s) ignorée(s) — champs manquants ou illisibles`);
  if (unmatched.size) {
    console.log(`\nArtistes non reconnus (ajoutez-les à la base si pertinent) :`);
    console.log("  " + [...unmatched].sort().slice(0, 50).join(", "));
    if (unmatched.size > 50) console.log(`  … et ${unmatched.size - 50} autres.`);
  }
}

main()
  .catch((err) => {
    console.error("Échec de l'import :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
