"use client";

import { useEffect, useState } from "react";
import { Play, Link2, Trash2, PartyPopper, Users, User, Tv, Check } from "lucide-react";
import { listPresets, deletePreset, touchPreset, configToSearch, configToUrl, describeConfig, type Preset } from "@/lib/presets";
import { THEME_OPTIONS } from "@/lib/themes";
import { shareOrCopy } from "@/lib/share";

const MODE_ICON = { solo: User, local: Users, online: Users, party: Tv } as const;

/*
 * "Tes soirées" — les configurations sauvegardées sur cet appareil. Un tap relance exactement
 * la même partie (pseudos compris) ; le lien copié envoie la config complète aux potes.
 * Ne s'affiche pas tant qu'il n'y a rien à montrer (pas de section vide qui fait "démo").
 */
export default function SavedPresets({
  title = "Tes soirées",
  onPlay,
  showEmpty = false,
}: {
  title?: string;
  onPlay?: (preset: Preset) => void;
  showEmpty?: boolean;
}) {
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setPresets(listPresets());
    refresh();
    window.addEventListener("drf-presets-change", refresh);
    return () => window.removeEventListener("drf-presets-change", refresh);
  }, []);

  if (!presets) return null;
  if (presets.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="card p-5 text-center">
        <PartyPopper size={22} className="text-gold mx-auto mb-2" />
        <p className="text-sm font-semibold">Aucune soirée enregistrée</p>
        <p className="text-xs text-ink-faint mt-1">
          À la fin d&apos;une partie, touche « Enregistrer cette config » : elle se relancera d&apos;ici en un tap.
        </p>
      </div>
    );
  }

  function themeLabel(id: string) {
    return THEME_OPTIONS.find((t) => t.id === id)?.label ?? id;
  }

  async function copyLink(p: Preset) {
    const url = configToUrl(p);
    const res = await shareOrCopy({ title: p.name, text: `${p.name} — blind test rap FR, prêt à lancer : ${url}` });
    if (res !== "none") {
      setCopied(p.id);
      setTimeout(() => setCopied(null), 1800);
    }
  }

  return (
    <section aria-labelledby="presets-title">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="presets-title" className="font-display text-lg sm:text-xl font-semibold">
          {title}
        </h2>
        <span className="text-xs text-ink-faint">{presets.length} enregistrée{presets.length > 1 ? "s" : ""}</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {presets.map((p) => {
          const Icon = MODE_ICON[p.mode];
          const href = `/jouer?${configToSearch(p, { preset: p.id, autostart: p.mode === "solo" ? "1" : "" })}`;
          return (
            <div key={p.id} className="card p-3.5 flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl grid place-items-center bg-gradient-to-br from-glow to-gold text-white shrink-0">
                <Icon size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-xs text-ink-faint truncate">{describeConfig(p, themeLabel(p.theme))}</p>
                {p.mode === "local" && p.players.length > 0 && (
                  <p className="text-[11px] text-ink-faint truncate mt-0.5">{p.players.join(", ")}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => copyLink(p)}
                  aria-label="Copier le lien de cette soirée"
                  title="Copier le lien"
                  className="w-9 h-9 rounded-full grid place-items-center text-ink-faint hover:text-gold hover:bg-white/5 transition-colors"
                >
                  {copied === p.id ? <Check size={15} className="text-gold" /> : <Link2 size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Supprimer « ${p.name} » ?`)) deletePreset(p.id);
                  }}
                  aria-label="Supprimer"
                  title="Supprimer"
                  className="w-9 h-9 rounded-full grid place-items-center text-ink-faint hover:text-riseNeg hover:bg-white/5 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
                {onPlay ? (
                  <button
                    type="button"
                    onClick={() => {
                      touchPreset(p.id);
                      onPlay(p);
                    }}
                    className="h-10 px-4 rounded-full bg-gold hover:bg-glow text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Play size={14} fill="currentColor" /> Relancer
                  </button>
                ) : (
                  <a
                    href={href}
                    onClick={() => touchPreset(p.id)}
                    className="h-10 px-4 rounded-full bg-gold hover:bg-glow text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Play size={14} fill="currentColor" /> Relancer
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
