"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, ArrowRight, Plus } from "lucide-react";

// Champ de code de salon "zéro friction" : vide → créer un salon, rempli → rejoindre.
export default function JoinRoomInput() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function go() {
    router.push(code ? `/blindtest?room=${encodeURIComponent(code)}` : "/blindtest?mode=online");
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-2xl px-4 bg-white/[0.035] border border-white/10 focus-within:border-glow/60 transition-colors">
          <Hash size={14} className="text-ink-faint shrink-0" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder="CODE"
            className="font-mono w-full bg-transparent text-sm py-3.5 outline-none placeholder:text-ink-faint/60 tracking-[0.3em]"
            aria-label="Code du salon"
            autoComplete="off"
          />
        </div>
        <button
          onClick={go}
          className="press btn-primary w-12 rounded-2xl flex items-center justify-center text-white"
          aria-label={code ? "Rejoindre le salon" : "Créer un salon"}
        >
          {code ? <ArrowRight size={17} /> : <Plus size={17} />}
        </button>
      </div>
      <p className="font-mono text-[9px] text-ink-faint mt-2 uppercase tracking-widest">
        {code ? "→ Rejoindre le salon" : "Vide = créer un salon"}
      </p>
    </div>
  );
}
