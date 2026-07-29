import "server-only";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { google } from "googleapis";

/*
 * Connecteurs Google Analytics 4 + Search Console — lecture seule, pour l'onglet
 * "Audience" du back-office.
 *
 * Variables d'environnement requises :
 *   GOOGLE_SERVICE_ACCOUNT_JSON — contenu du fichier JSON de la clé de compte de
 *                                  service Google Cloud (sur une seule ligne).
 *   GA4_PROPERTY_ID             — ID numérique de la propriété GA4 (ex. "123456789").
 *   SEARCH_CONSOLE_SITE_URL     — URL exacte enregistrée dans Search Console
 *                                  (ex. "https://dailyrapfrance.best/" ou
 *                                  "sc-domain:dailyrapfrance.best").
 *
 * Le compte de service (son adresse `client_email`, visible dans le JSON) doit être
 * ajouté manuellement :
 *   - dans GA4 : Admin > Gestion des accès à la propriété > rôle "Lecteur"
 *   - dans Search Console : Paramètres > Utilisateurs et autorisations
 */

type ServiceAccountCreds = { client_email: string; private_key: string };

function credentials(): ServiceAccountCreds | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccountCreds;
  } catch {
    return null;
  }
}

export function googleConfigured(): boolean {
  return Boolean(credentials() && process.env.GA4_PROPERTY_ID && process.env.SEARCH_CONSOLE_SITE_URL);
}

function isoDate(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

export type GA4Report = {
  activeUsers28d: number;
  sessions28d: number;
  pageViews28d: number;
  days: { day: string; users: number }[];
  topPages: { path: string; views: number }[];
};

export async function fetchGA4Report(): Promise<GA4Report | null> {
  const creds = credentials();
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!creds || !propertyId) return null;

  const client = new BetaAnalyticsDataClient({ credentials: creds });
  const property = `properties/${propertyId}`;

  const [[overview], [byDay], [topPages]] = await Promise.all([
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "13daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 8,
    }),
  ]);

  const row = overview.rows?.[0];
  return {
    activeUsers28d: Number(row?.metricValues?.[0]?.value ?? 0),
    sessions28d: Number(row?.metricValues?.[1]?.value ?? 0),
    pageViews28d: Number(row?.metricValues?.[2]?.value ?? 0),
    days: (byDay.rows ?? []).map((r) => ({
      day: r.dimensionValues?.[0]?.value ?? "",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),
    topPages: (topPages.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? "",
      views: Number(r.metricValues?.[0]?.value ?? 0),
    })),
  };
}

export type SearchConsoleReport = {
  clicks28d: number;
  impressions28d: number;
  ctr28d: number;
  avgPosition28d: number;
  topQueries: { query: string; clicks: number; impressions: number }[];
};

export async function fetchSearchConsoleReport(): Promise<SearchConsoleReport | null> {
  const creds = credentials();
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
  if (!creds || !siteUrl) return null;

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const searchconsole = google.searchconsole({ version: "v1", auth });

  const [overview, topQueries] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(28), endDate: isoDate(0), dimensions: [] },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(28), endDate: isoDate(0), dimensions: ["query"], rowLimit: 8 },
    }),
  ]);

  const o = overview.data.rows?.[0];
  return {
    clicks28d: o?.clicks ?? 0,
    impressions28d: o?.impressions ?? 0,
    ctr28d: o?.ctr ? Math.round(o.ctr * 1000) / 10 : 0,
    avgPosition28d: o?.position ? Math.round(o.position * 10) / 10 : 0,
    topQueries: (topQueries.data.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    })),
  };
}
