import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { logVisit } from "@/lib/visitLogger";
import { captureReferral } from "@/lib/referralEdge";

// Signatures des scanners automatisés qui balaient tout Internet à la recherche de
// sites WordPress vulnérables ou de fichiers malveillants déposés par d'anciens
// piratages. Notre site est en Next.js — il n'y a jamais eu et n'y aura jamais de
// PHP exécuté ici, donc toute requête vers ces chemins est forcément un scan, pas
// un visiteur légitime. On la bloque en 404 immédiat, avant même de vérifier la
// session ou de journaliser la visite — zéro coût, zéro pollution des logs.
const SCANNER_PATTERN =
  /\.(php\d?|phtml|asp|aspx|jsp|cgi|sh|bak|sql|env)$|^\/(wp-admin|wp-content|wp-includes|wp-login|wordpress|xmlrpc\.php|\.env|\.git|cgi-bin|phpinfo|shell|config)/i;

// Rafraîchit la session Supabase à chaque requête. Sans ça, la session expire côté
// Server Components (qui ne peuvent pas écrire de cookies) et l'utilisateur se retrouve
// déconnecté au bout d'un moment sans raison apparente.
// Fichiers « maison » (tag audio, gimmicks) : servis uniquement au site lui-même. Une
// requête tapée dans la barre d'adresse, un lien direct depuis un autre site, un curl ou
// un téléchargeur n'envoient pas de Sec-Fetch-Site same-origin ni de Referer du site →
// 403. Ça n'empêche pas un développeur obstiné (ce que le navigateur joue peut être
// capturé), mais ça ferme la porte au téléchargement direct et au hotlink.
const PROTECTED_ASSET = /^\/audio\//;
const OWN_HOSTS = new Set(["dailyrapfrance.best", "www.dailyrapfrance.best", "localhost:3000"]);

function isOwnPageRequest(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "same-site") return true;
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const h = new URL(referer).host;
      if (OWN_HOSTS.has(h) || h === request.nextUrl.host || h.endsWith(".vercel.app")) return true;
    } catch {}
  }
  return false;
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (SCANNER_PATTERN.test(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 });
  }
  if (PROTECTED_ASSET.test(request.nextUrl.pathname)) {
    if (!isOwnPageRequest(request)) return new NextResponse(null, { status: 403 });
    const r = NextResponse.next();
    r.headers.set("X-Robots-Tag", "noindex, nofollow");
    r.headers.set("Content-Disposition", "inline");
    return r;
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  await supabase.auth.getUser();

  // Lien de parrainage (?ref=CODE) : cookie 30 jours + journal du clic. Le cookie survit au
  // passage par Google (même navigateur), là où le localStorage seul pouvait se perdre.
  const refCookie = captureReferral(request, event);
  if (refCookie) response.cookies.set(refCookie);

  // Log de visite (IP + géo, via Vercel) — en tâche de fond, ne ralentit jamais la page.
  event.waitUntil(logVisit(request));

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
