/*
 * ARTISTS MANAGER 2026 — v6 : le monde vivant.
 *
 * Les labels rivaux sont des AGENTS : chaque semaine ils peuvent signer un
 * talent sur le marché (y compris sous le nez du joueur), débaucher un candidat
 * staff, et sortir des projets. Les tendances de styles dérivent dans le temps.
 * Tout ceci tourne que le joueur agisse ou non — et produit des news.
 */

import type { GameState, RivalLabel, RivalStrategy, Trends } from "./types";
import { RIVAL_ARTIST_NAMES, RIVAL_LABELS, RIVAL_TITLES, STYLES } from "./data";
import { nextId, pick, ri, rnd } from "./people";

// ---------- Initialisation ----------

export function makeRivals(): RivalLabel[] {
  return RIVAL_LABELS.map((r, i) => ({
    name: r.name,
    strategy: r.strategy,
    streams: ri(60000, 380000),
    reputation: ri(20, 70),
    rosterNames: [RIVAL_ARTIST_NAMES[i * 2], RIVAL_ARTIST_NAMES[i * 2 + 1]].filter(Boolean),
    lastRelease: null,
  }));
}

export function makeTrends(): Trends {
  const t: Trends = {};
  for (const s of STYLES) t[s] = Number(rnd(0.85, 1.15).toFixed(2));
  return t;
}

// ---------- Paramètres de comportement par stratégie ----------

const STRATEGY_PARAMS: Record<RivalStrategy, { signChance: number; releaseChance: number; drift: [number, number] }> = {
  agressif: { signChance: 0.16, releaseChance: 0.22, drift: [0.82, 1.24] },
  opportuniste: { signChance: 0.11, releaseChance: 0.16, drift: [0.85, 1.2] },
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

  // 2) Labels rivaux : streams qui vivent + actions d'agents.
  let stealsThisWeek = 0;
  for (const r of s.rivals) {
    const params = STRATEGY_PARAMS[r.strategy];
    r.streams = Math.max(20000, Math.round(r.streams * rnd(params.drift[0], params.drift[1])));

    // Signer un talent sur le marché du joueur — max 1 vol par semaine toutes
    // équipes confondues, pour laisser une chance de réagir.
    if (stealsThisWeek === 0 && s.market.length > 1 && Math.random() < params.signChance) {
      // Les rivaux visent en priorité le plus gros potentiel affiché.
      const target = [...s.market].sort(
        (a, b) => (b.shownPotential[0] + b.shownPotential[1]) - (a.shownPotential[0] + a.shownPotential[1])
      )[0];
      s.market = s.market.filter((a) => a.id !== target.id);
      r.rosterNames.push(target.name);
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

    // Sortir un projet : bump de streams + news.
    if (Math.random() < params.releaseChance && r.rosterNames.length > 0) {
      const title = pick(RIVAL_TITLES);
      const artist = pick(r.rosterNames);
      r.lastRelease = `${artist} — « ${title} »`;
      r.streams = Math.round(r.streams * rnd(1.25, 1.6));
      r.reputation = Math.min(100, r.reputation + ri(1, 3));
      news(s, `${r.name} sort « ${title} »`, `${artist} dévoile « ${title} » chez ${r.name}. La concurrence ne t'attend pas.`);
    }
  }
}
