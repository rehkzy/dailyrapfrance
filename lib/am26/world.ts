/*
 * ARTISTS MANAGER 2026 — v8 : le monde vivant.
 *
 * Les labels rivaux sont des AGENTS : chaque semaine ils peuvent signer un
 * talent sur le marché (y compris sous le nez du joueur), débaucher un candidat
 * staff, et sortir des projets. v8 : chaque artiste rival a ses propres streams
 * (classement par artiste), et les sorties rivales vivent dans un Top Projets
 * mondial. Les tendances de styles dérivent dans le temps. Tout ceci tourne que
 * le joueur agisse ou non — et produit des news.
 */

import type { GameState, RivalLabel, RivalStrategy, Trends, WorldRelease } from "./types";
import { RIVAL_ARTIST_NAMES, RIVAL_LABELS, RIVAL_TITLES, STYLES } from "./data";
import { nextId, pick, ri, rnd } from "./people";

// ---------- Initialisation ----------

export function makeRivals(): RivalLabel[] {
  return RIVAL_LABELS.map((r, i) => ({
    name: r.name,
    strategy: r.strategy,
    reputation: ri(20, 70),
    roster: [RIVAL_ARTIST_NAMES[i * 2], RIVAL_ARTIST_NAMES[i * 2 + 1]]
      .filter(Boolean)
      .map((name) => ({ name, weeklyStreams: ri(25000, 190000) })),
    lastRelease: null,
  }));
}

export function makeTrends(): Trends {
  const t: Trends = {};
  for (const s of STYLES) t[s] = Number(rnd(0.85, 1.15).toFixed(2));
  return t;
}

// Streams hebdo agrégés d'un label rival — sert aux classements et à la
// comparaison de réputation.
export function rivalLabelStreams(r: RivalLabel): number {
  return r.roster.reduce((sum, a) => sum + a.weeklyStreams, 0);
}

// ---------- Paramètres de comportement par stratégie ----------

const STRATEGY_PARAMS: Record<RivalStrategy, { signChance: number; releaseChance: number; drift: [number, number] }> = {
  agressif: { signChance: 0.16, releaseChance: 0.22, drift: [0.84, 1.22] },
  opportuniste: { signChance: 0.11, releaseChance: 0.16, drift: [0.86, 1.18] },
  prudent: { signChance: 0.05, releaseChance: 0.12, drift: [0.92, 1.1] },
};

function news(s: GameState, title: string, body: string) {
  s.messages.unshift({ id: nextId(), week: s.week, title, body });
}

// ---------- Tick hebdo du monde — appelé par advanceWeek sur le brouillon ----------

export function tickWorld(s: GameState) {
  // 1) Tendances : chaque style dérive. News quand un style bascule.
  for (const style of STYLES) {
    const before = s.trends[style] ?? 1;
    let after = before * rnd(0.965, 1.035);
    after = Math.max(0.6, Math.min(1.5, after));
    s.trends[style] = Number(after.toFixed(2));
    if (before < 1.25 && after >= 1.25) {
      news(s, `Le ${style} explose`, `Le ${style} est LA tendance du moment — les sorties dans ce style démarrent nettement plus fort.`);
    } else if (before > 0.75 && after <= 0.75) {
      news(s, `Le ${style} s'essouffle`, `Le public se lasse du ${style} — les sorties dans ce style démarrent moins bien en ce moment.`);
    }
  }

  // 2) Labels rivaux : chaque artiste vit + actions d'agents.
  let stealsThisWeek = 0;
  for (const r of s.rivals) {
    const params = STRATEGY_PARAMS[r.strategy];
    for (const a of r.roster) {
      a.weeklyStreams = Math.max(8000, Math.round(a.weeklyStreams * rnd(params.drift[0], params.drift[1])));
    }

    // Signer un talent sur le marché du joueur — max 1 vol par semaine toutes
    // équipes confondues, pour laisser une chance de réagir.
    if (stealsThisWeek === 0 && s.market.length > 1 && Math.random() < params.signChance) {
      // Les rivaux visent en priorité le plus gros potentiel affiché.
      const target = [...s.market].sort(
        (a, b) => (b.shownPotential[0] + b.shownPotential[1]) - (a.shownPotential[0] + a.shownPotential[1])
      )[0];
      s.market = s.market.filter((a) => a.id !== target.id);
      r.roster.push({ name: target.name, weeklyStreams: ri(8000, 30000) + target.hype * 800 });
      stealsThisWeek += 1;
      news(
        s,
        `${r.name} signe ${target.name}`,
        `Le talent que tu avais peut-être repéré vient de signer chez ${r.name}. Sur ce marché, hésiter, c'est laisser la place.`
      );
    }

    // Débaucher un candidat staff (plus rare).
    if (s.staffMarket.length > 2 && Math.random() < params.signChance * 0.35) {
      const idx = Math.floor(Math.random() * s.staffMarket.length);
      const person = s.staffMarket[idx];
      s.staffMarket.splice(idx, 1);
      s.negotiations = s.negotiations.filter((n) => {
        if (n.personId !== person.id) return true;
        if (n.status === "pending" || n.status === "countered") {
          news(
            s,
            `${person.firstName} ${person.lastName} n'est plus disponible`,
            `${r.name} l'a recruté(e) pendant que ta proposition était sur la table. La négociation est terminée.`
          );
        }
        return false;
      });
    }

    // Sortir un projet : l'artiste décolle + entrée au Top Projets + news.
    if (Math.random() < params.releaseChance && r.roster.length > 0) {
      const artist = pick(r.roster);
      const title = pick(RIVAL_TITLES);
      artist.weeklyStreams = Math.round(artist.weeklyStreams * rnd(1.35, 1.85));
      r.lastRelease = `${artist.name} — « ${title} »`;
      r.reputation = Math.min(100, r.reputation + ri(1, 3));
      const release: WorldRelease = {
        id: nextId(),
        labelName: r.name,
        artistName: artist.name,
        title,
        weeklyStreams: Math.round(artist.weeklyStreams * rnd(0.8, 1.2)),
        totalStreams: 0,
        weeksOut: 0,
      };
      s.worldReleases.push(release);
      news(s, `${r.name} sort « ${title} »`, `${artist.name} dévoile « ${title} » chez ${r.name}. La concurrence ne t'attend pas.`);
    }
  }

  // 3) Vie des sorties rivales (Top Projets) : cumul + déclin.
  for (const w of s.worldReleases) {
    w.weeksOut += 1;
    w.totalStreams += w.weeklyStreams;
    w.weeklyStreams = Math.round(w.weeklyStreams * rnd(0.76, 0.88));
  }
  s.worldReleases = s.worldReleases
    .filter((w) => w.weeklyStreams > 1500 || w.totalStreams > 50000)
    .sort((a, b) => b.totalStreams - a.totalStreams)
    .slice(0, 14);
}
