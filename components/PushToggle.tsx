"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { enablePush, disablePush, pushEnabled, pushSupport } from "@/lib/pushClient";

/* Mon compte → Notifications : être prévenu quand un adversaire est trouvé en matchmaking. */
export default function PushToggle() {
  const [on, setOn] = useState(false);
  const [sup, setSup] = useState<ReturnType<typeof pushSupport>>("unsupported");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOn(pushEnabled()); setSup(pushSupport()); }, []);
  return (
    <div className="ticket p-5">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold grid place-items-center shrink-0">{on ? <Bell size={20} /> : <BellOff size={20} />}</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold leading-tight">Notifications</p>
          <p className="text-sm text-ink-muted mt-1">
            {sup === "ios-needs-install"
              ? "Sur iPhone, ajoute d'abord le site à ton écran d'accueil (Partager → Sur l'écran d'accueil), puis reviens ici."
              : sup === "denied"
                ? "Bloquées dans les réglages du navigateur — réactive-les là-bas pour ce site."
                : sup === "unsupported"
                  ? "Ton navigateur ne gère pas les notifications."
                  : on
                    ? "On te prévient quand un adversaire est trouvé en matchmaking, même téléphone verrouillé."
                    : "Sois prévenu quand un adversaire est trouvé en matchmaking, même téléphone verrouillé."}
          </p>
        </div>
        {sup === "ok" && (
          <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={async () => { setBusy(true); if (on) { await disablePush(); setOn(false); } else setOn(await enablePush()); setBusy(false); }} className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${on ? "bg-gold" : "bg-white/10"}`}>
            <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: on ? "translateX(20px)" : "translateX(0)" }} />
          </button>
        )}
      </div>
    </div>
  );
}
