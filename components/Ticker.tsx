type TickerItem = {
  name: string;
  delta: number; // variation de hype, en points
};

// Les données réelles viendront de la table HypeScore (voir prisma/schema.prisma).
// Pour l'instant : données d'exemple pour construire l'UI.
const items: TickerItem[] = [
  { name: "Tiakola", delta: 6 },
  { name: "SDM", delta: -2 },
  { name: "Gazo", delta: 12 },
  { name: "Josman", delta: 3 },
  { name: "Ninho", delta: -1 },
  { name: "Luv Resval", delta: 8 },
  { name: "Fresh la Peufra", delta: 4 },
  { name: "Chily", delta: -3 },
];

function TickerRow() {
  return (
    <>
      {items.map((item) => (
        <span key={item.name} className="inline-flex items-center gap-2 px-6 font-mono text-sm">
          <span className="text-ink-muted">{item.name}</span>
          <span className={item.delta >= 0 ? "text-risePos" : "text-riseNeg"}>
            {item.delta >= 0 ? "▲" : "▼"} {Math.abs(item.delta)}
          </span>
        </span>
      ))}
    </>
  );
}

export default function Ticker() {
  return (
    <div className="glass overflow-hidden whitespace-nowrap py-2.5 rounded-none">
      <div className="ticker-track inline-block">
        <TickerRow />
        <TickerRow />
      </div>
    </div>
  );
}
