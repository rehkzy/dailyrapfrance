"use client";

import { useEffect } from "react";

/* Signale la visite d'un profil (voir /api/profile/view). Une fois par page, en silence. */
export default function ProfileViewPing({ profileId }: { profileId: string }) {
  useEffect(() => {
    const t = setTimeout(() => {
      void fetch("/api/profile/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }), keepalive: true }).catch(() => {});
    }, 1500); // on ne compte pas un passage de 0,5 s
    return () => clearTimeout(t);
  }, [profileId]);
  return null;
}
