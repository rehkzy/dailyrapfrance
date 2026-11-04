"use client";
import ResultTicket from "@/components/ResultTicket";
import { DEFAULT_CONFIG } from "@/lib/presets";
export default function P() {
  const rounds = [1,1,0,1,2,1,0,1,1,1].map((f) => ({ found: f === 2 ? 2 : f, total: 2, fast: f === 2 }));
  return <div className="max-w-xl mx-auto p-4"><ResultTicket points={2450} rounds={rounds} themeLabel="Top 50 du moment" config={{ ...DEFAULT_CONFIG, theme: "pop" }} daily={null} chips={[{ label: "Top 12% sur ce thème" }, { label: "Combo max : 4" }]} headline="Solo · Top 50 du moment" subline="7 extraits sur 10 reconnus en entier" onReplay={() => {}} onReplaySame={() => {}} leaderboardHref="/blindtest/classement" nextUp={{ href: "/jouer", title: "Le défi de la semaine : Aya Nakamura", sub: "Le même thème pour tout le monde, un classement à prendre.", icon: "flame" }} guestCta={<button className="w-full rounded-2xl p-4 flex items-center gap-3 text-left bg-white text-[#0a0505]"><span className="w-10 h-10 rounded-xl bg-[#f0001c] text-white grid place-items-center shrink-0">→</span><span className="flex-1"><span className="block text-sm font-bold">Sauvegarde ces 2450 pts</span><span className="block text-xs text-black/60">Compte gratuit en 10 s — classement, profil, potes à défier.</span></span></button>} /></div>;
}
