"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Bannière d'annonce pilotée depuis /admin (site_settings.announcement) — affichée en
// haut de toutes les pages quand elle est activée. Lecture publique, écriture réservée
// au back-office.
export default function SiteAnnouncement() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "announcement")
      .maybeSingle()
      .then(({ data }) => {
        const v = data?.value as { enabled?: boolean; text?: string } | undefined;
        if (v?.enabled && v.text?.trim()) setText(v.text.trim());
      });
  }, []);

  if (!text) return null;

  return (
    <div className="relative z-40 bg-gold text-white text-center text-sm font-medium px-4 py-2.5">
      {text}
    </div>
  );
}
