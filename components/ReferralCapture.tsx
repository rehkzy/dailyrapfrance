"use client";

import { useEffect } from "react";
import { useUser } from "@/lib/useUser";
import { captureReferralFromUrl, pendingReferral, clearPendingReferral } from "@/lib/referral";

/*
 * Parrainage — côté client, invisible :
 *  1. à l'arrivée sur le site, on mémorise ?ref=CODE (lien d'un ami) ;
 *  2. dès que la personne est connectée (compte créé dans la foulée), on rattache le compte
 *     au parrain. Le serveur refuse les comptes de plus de 48 h et l'auto-parrainage.
 */
export default function ReferralCapture() {
  const { user } = useUser();
  useEffect(() => captureReferralFromUrl(), []);
  useEffect(() => {
    if (!user) return;
    const code = pendingReferral();
    if (!code) return;
    fetch("/api/referral/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok || ["self", "too_old", "unknown_code", "invalid"].includes(d.reason)) clearPendingReferral();
      })
      .catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
