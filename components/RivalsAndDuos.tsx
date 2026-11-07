import { Swords, Users2 } from "lucide-react";
import type { Rival, Duo } from "@/lib/rankings";

/* Blocs « Tes rivaux » et « Duos » — sur le classement et le profil. Serveur, sans état. */
export function RivalsBlock({ rivals, title = "Tes rivaux" }: { rivals: Rival[]; title?: string }) {
  return (
    <section className="ticket mb-6" aria-label={title}>
      <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
        <p className="font-display text-base font-bold inline-flex items-center gap-1.5"><Swords size={15} className="text-gold" /> {title}</p>
        <span className="text-[11px] text-ink-faint">face-à-face en ligne</span>
      </div>
      {rivals.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink-muted">Joue en ligne contre quelqu&apos;un : il apparaît ici avec votre face-à-face.</p>
      ) : (
        <ol className="divide-y divide-white/6">
          {rivals.slice(0, 8).map((r, i) => {
            const lead = r.wins > r.losses ? "ahead" : r.wins < r.losses ? "behind" : "even";
            return (
              <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className="score-num text-lg w-6 shrink-0 text-ink-faint">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold truncate">{r.name}</span>
                  <span className="block text-[11px] text-ink-faint">{r.games} {r.games > 1 ? "parties" : "partie"}</span>
                </span>
                <span className={`font-display text-sm font-extrabold tabular-nums ${lead === "ahead" ? "text-gold" : lead === "behind" ? "text-riseNeg" : "text-ink-muted"}`}>
                  {r.wins} – {r.losses}{r.draws ? <span className="text-ink-faint font-normal text-xs"> · {r.draws} nul{r.draws > 1 ? "s" : ""}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function DuosBlock({ duos, title = "Meilleurs duos", me }: { duos: Duo[]; title?: string; me?: string | null }) {
  return (
    <section className="ticket mb-6" aria-label={title}>
      <div className="px-5 pt-4 pb-2 flex items-baseline justify-between">
        <p className="font-display text-base font-bold inline-flex items-center gap-1.5"><Users2 size={15} className="text-gold" /> {title}</p>
        <span className="text-[11px] text-ink-faint">2 contre 2</span>
      </div>
      {duos.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink-muted">Aucun duo pour l&apos;instant : lance un 2 contre 2 en matchmaking.</p>
      ) : (
        <ol className="divide-y divide-white/6">
          {duos.slice(0, 10).map((d, i) => {
            const mine = !!me && d.ids.includes(me);
            return (
              <li key={d.ids.join("|")} className={`flex items-center gap-3 px-5 py-2.5 ${mine ? "bg-gold/8" : ""}`}>
                <span className={`score-num text-lg w-6 shrink-0 ${i === 0 ? "text-gold" : "text-ink-faint"}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold truncate">{d.names[0]} <span className="text-ink-faint font-normal">+</span> {d.names[1]}</span>
                  <span className="block text-[11px] text-ink-faint">{d.games} {d.games > 1 ? "parties" : "partie"} · {Math.round(d.ratio * 100)} % de victoires</span>
                </span>
                <span className="font-display text-sm font-extrabold tabular-nums">{d.wins} <span className="text-ink-faint font-normal text-xs">v.</span></span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
