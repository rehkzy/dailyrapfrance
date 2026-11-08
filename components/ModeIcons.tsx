/* Pictos de modes, dessinés pour DailyRap (traits 2 px, angles francs, rouge de la marque en accent). */
type P = { size?: number; className?: string };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

/** Épées croisées DailyRap : deux lames anguleuses, gardes en V, éclair rouge au croisement. */
export function SwordsIcon({ size = 26, className }: P) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M6 26 L22 6 L27 5 L26 10 L10 26" />
      <path d="M26 26 L10 6 L5 5 L6 10 L22 26" />
      <path d="M8 22 L12 26" /><path d="M24 22 L20 26" />
      <path d="M16 11 L14.5 16 L17.5 16 L16 21" stroke="var(--red)" strokeWidth="2.4" />
    </svg>
  );
}
/** Un seul téléphone qui tourne : le téléphone, et trois joueurs autour. */
export function SamePhoneIcon({ size = 26, className }: P) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <rect x="11" y="4" width="10" height="18" rx="2.5" />
      <path d="M15 19 h2" />
      <circle cx="7" cy="27" r="2.2" fill="var(--red)" stroke="none" /><circle cx="16" cy="28" r="2.2" fill="var(--red)" stroke="none" /><circle cx="25" cy="27" r="2.2" fill="var(--red)" stroke="none" />
      <path d="M9 24 L12 22" opacity=".5" /><path d="M23 24 L20 22" opacity=".5" />
    </svg>
  );
}
/** Entre amis, à distance : deux personnes reliées par une onde. */
export function FriendsIcon({ size = 26, className }: P) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <circle cx="9" cy="11" r="3.5" /><circle cx="23" cy="11" r="3.5" />
      <path d="M3 25 c0-4 3-6.5 6-6.5 s6 2.5 6 6.5" /><path d="M17 25 c0-4 3-6.5 6-6.5 s6 2.5 6 6.5" />
      <path d="M13 6 q3-3 6 0" stroke="var(--red)" /><path d="M14.5 8.5 q1.5-1.5 3 0" stroke="var(--red)" />
    </svg>
  );
}
/** Soirée : la TV qui diffuse, les téléphones qui répondent. */
export function PartyIcon({ size = 26, className }: P) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <rect x="4" y="6" width="24" height="15" rx="2.5" />
      <path d="M12 3 L16 6 L20 3" />
      <rect x="7" y="25" width="4" height="5" rx="1" fill="var(--red)" stroke="none" /><rect x="14" y="25" width="4" height="5" rx="1" fill="var(--red)" stroke="none" /><rect x="21" y="25" width="4" height="5" rx="1" fill="var(--red)" stroke="none" />
      <path d="M13 13.5 L18.5 13.5" stroke="var(--red)" strokeWidth="2.6" />
    </svg>
  );
}
/** Seul : le casque. */
export function SoloIcon({ size = 26, className }: P) {
  return (
    <svg {...base(size)} className={className} aria-hidden="true">
      <path d="M6 20 v-4 a10 10 0 0 1 20 0 v4" />
      <rect x="5" y="18" width="6" height="9" rx="2" fill="currentColor" stroke="none" /><rect x="21" y="18" width="6" height="9" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
