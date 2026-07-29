import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { googleConfigured, fetchGA4Report, fetchSearchConsoleReport } from "@/lib/googleReporting";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/admin/analytics — trafic (Google Analytics 4) + visibilité (Search Console)
// en un seul appel, pour l'onglet "Audience" du back-office.
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  if (!googleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Non configuré : ajoute GOOGLE_SERVICE_ACCOUNT_JSON, GA4_PROPERTY_ID et SEARCH_CONSOLE_SITE_URL aux variables d'environnement.",
      },
      { status: 500 }
    );
  }

  try {
    const [ga4, search] = await Promise.all([fetchGA4Report(), fetchSearchConsoleReport()]);
    return NextResponse.json({ ga4, search });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur lors de l'appel aux API Google." },
      { status: 500 }
    );
  }
}
