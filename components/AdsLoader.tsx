"use client";

import { useEffect } from "react";
import { useUser } from "@/lib/useUser";

/** Charge le script AdSense une fois, et seulement pour les visiteurs sans compte. */
export default function AdsLoader() {
  const { user, loading } = useUser();
  useEffect(() => {
    const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-9972214408882751";
    if (!client || loading || user) return;
    if (document.querySelector('script[data-drf-ads]')) return;
    const s = document.createElement("script");
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    s.async = true; s.crossOrigin = "anonymous"; s.dataset.drfAds = "1";
    document.head.appendChild(s);
  }, [user, loading]);
  return null;
}
