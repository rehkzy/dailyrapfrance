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
 *
 * Limite importante : l'adresse IP des visiteurs n'est JAMAIS exposée par l'API
 * Google Analytics (ni par aucun outil d'analytics grand public) — Google l'utilise
 * en interne pour résoudre la position géographique puis la jette immédiatement,
 * conformément au RGPD. Seule une localisation approximative (pays/ville) est
 * disponible, jamais l'IP brute.
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

function fmtSeconds(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}m ${s}s`;
}

// ── Google Analytics 4 ──────────────────────────────────────────────────────

export type GA4Report = {
  activeUsers28d: number;
  newUsers28d: number;
  sessions28d: number;
  pageViews28d: number;
  avgSessionDuration: string;
  engagementRate: number;
  bounceRate: number;

  activeUsersNow: number;
  realtimeByCountry: { country: string; users: number }[];
  realtimeByDevice: { device: string; users: number }[];

  days: { day: string; users: number; sessions: number }[];

  topPages: { path: string; views: number; avgDuration: string }[];

  topCountries: { country: string; users: number }[];
  topCities: { city: string; users: number }[];

  byDeviceCategory: { device: string; users: number }[];
  byBrowser: { browser: string; users: number }[];
  byOS: { os: string; users: number }[];

  bySource: { source: string; users: number }[];
  newVsReturning: { type: string; users: number }[];
};

export async function fetchGA4Report(): Promise<GA4Report | null> {
  const creds = credentials();
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!creds || !propertyId) return null;

  const client = new BetaAnalyticsDataClient({ credentials: creds });
  const property = `properties/${propertyId}`;

  const [
    [overview],
    [byDay],
    [topPages],
    [countries],
    [cities],
    [devices],
    [browsers],
    [os],
    [sources],
    [newVsReturning],
    [realtimeByCountry],
    [realtimeByDevice],
  ] = await Promise.all([
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "newUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "engagementRate" },
        { name: "bounceRate" },
      ],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "13daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "city" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "browser" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 6,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "operatingSystem" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 6,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
      dimensions: [{ name: "newVsReturning" }],
      metrics: [{ name: "activeUsers" }],
    }),
    client.runRealtimeReport({
      property,
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 8,
    }),
    client.runRealtimeReport({
      property,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    }),
  ]);

  const row = overview.rows?.[0];
  const activeUsersNow = (realtimeByCountry.rows ?? []).reduce(
    (sum, r) => sum + Number(r.metricValues?.[0]?.value ?? 0),
    0
  );

  return {
    activeUsers28d: Number(row?.metricValues?.[0]?.value ?? 0),
    newUsers28d: Number(row?.metricValues?.[1]?.value ?? 0),
    sessions28d: Number(row?.metricValues?.[2]?.value ?? 0),
    pageViews28d: Number(row?.metricValues?.[3]?.value ?? 0),
    avgSessionDuration: fmtSeconds(Number(row?.metricValues?.[4]?.value ?? 0)),
    engagementRate: Math.round(Number(row?.metricValues?.[5]?.value ?? 0) * 1000) / 10,
    bounceRate: Math.round(Number(row?.metricValues?.[6]?.value ?? 0) * 1000) / 10,

    activeUsersNow,
    realtimeByCountry: (realtimeByCountry.rows ?? []).map((r) => ({
      country: r.dimensionValues?.[0]?.value ?? "Inconnu",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),
    realtimeByDevice: (realtimeByDevice.rows ?? []).map((r) => ({
      device: r.dimensionValues?.[0]?.value ?? "Inconnu",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),

    days: (byDay.rows ?? []).map((r) => ({
      day: r.dimensionValues?.[0]?.value ?? "",
      users: Number(r.metricValues?.[0]?.value ?? 0),
      sessions: Number(r.metricValues?.[1]?.value ?? 0),
    })),

    topPages: (topPages.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? "",
      views: Number(r.metricValues?.[0]?.value ?? 0),
      avgDuration: fmtSeconds(Number(r.metricValues?.[1]?.value ?? 0)),
    })),

    topCountries: (countries.rows ?? []).map((r) => ({
      country: r.dimensionValues?.[0]?.value ?? "Inconnu",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),
    topCities: (cities.rows ?? []).map((r) => ({
      city: r.dimensionValues?.[0]?.value ?? "Inconnu",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),

    byDeviceCategory: (devices.rows ?? []).map((r) => ({
      device: r.dimensionValues?.[0]?.value ?? "Inconnu",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),
    byBrowser: (browsers.rows ?? []).map((r) => ({
      browser: r.dimensionValues?.[0]?.value ?? "Inconnu",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),
    byOS: (os.rows ?? []).map((r) => ({
      os: r.dimensionValues?.[0]?.value ?? "Inconnu",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),

    bySource: (sources.rows ?? []).map((r) => ({
      source: r.dimensionValues?.[0]?.value ?? "Inconnu",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),
    newVsReturning: (newVsReturning.rows ?? []).map((r) => ({
      type: r.dimensionValues?.[0]?.value === "new" ? "Nouveaux" : "Récurrents",
      users: Number(r.metricValues?.[0]?.value ?? 0),
    })),
  };
}

// ── Search Console ───────────────────────────────────────────────────────

export type SearchConsoleReport = {
  clicks28d: number;
  impressions28d: number;
  ctr28d: number;
  avgPosition28d: number;
  topQueries: { query: string; clicks: number; impressions: number; position: number }[];
  topPages: { page: string; clicks: number; impressions: number }[];
  byCountry: { country: string; clicks: number; impressions: number }[];
  byDevice: { device: string; clicks: number; impressions: number }[];
  trend: { day: string; clicks: number; impressions: number }[];
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

  const [overview, topQueries, topPages, byCountry, byDevice, trend] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(28), endDate: isoDate(0), dimensions: [] },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(28), endDate: isoDate(0), dimensions: ["query"], rowLimit: 10 },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(28), endDate: isoDate(0), dimensions: ["page"], rowLimit: 10 },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(28), endDate: isoDate(0), dimensions: ["country"], rowLimit: 8 },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(28), endDate: isoDate(0), dimensions: ["device"] },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(28), endDate: isoDate(0), dimensions: ["date"] },
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
      position: r.position ? Math.round(r.position * 10) / 10 : 0,
    })),
    topPages: (topPages.data.rows ?? []).map((r) => ({
      page: (r.keys?.[0] ?? "").replace(/^https?:\/\/[^/]+/, ""),
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    })),
    byCountry: (byCountry.data.rows ?? []).map((r) => ({
      country: (r.keys?.[0] ?? "").toUpperCase(),
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    })),
    byDevice: (byDevice.data.rows ?? []).map((r) => ({
      device: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    })),
    trend: (trend.data.rows ?? []).map((r) => ({
      day: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    })),
  };
}
