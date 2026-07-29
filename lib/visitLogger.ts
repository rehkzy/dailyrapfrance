import "server-only";
import { geolocation, ipAddress } from "@vercel/functions";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export async function logVisit(req: NextRequest): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;

    const { pathname } = req.nextUrl;
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/admin") ||
      /\.(png|jpg|jpeg|svg|ico|webp|css|js|map|txt|xml)$/.test(pathname)
    ) {
      return;
    }

    const geo = geolocation(req);
    const ip = ipAddress(req);

    const db = createClient(url, key, { auth: { persistSession: false } });
    await db.from("visit_logs").insert({
      ip: ip ?? null,
      country: geo.country ?? null,
      city: geo.city ?? null,
      region: geo.region ?? null,
      path: pathname,
      referer: req.headers.get("referer"),
      user_agent: req.headers.get("user-agent"),
    });
  } catch {
    // Le log de visite ne doit jamais faire planter une page.
  }
}
