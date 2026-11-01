import { NextResponse } from "next/server";
import { ipAddress } from "@vercel/functions/headers";
import { createClient } from "@/lib/supabase/server";
import { claimReferral, hashIp, isValidCode, REF_COOKIE } from "@/lib/referralServer";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Chemin de retour post-connexion — uniquement un chemin interne ("/..." mais pas "//...")
  // pour empêcher toute redirection vers un site externe via un lien forgé.
  const rawNext = searchParams.get("next") ?? "/blindtest";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/blindtest";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`);
      // Parrainage : la plupart des comptes se créent via Google, sans jamais taper de code.
      // On rattache ici, côté serveur, depuis le cookie posé au clic sur le lien (ou le ?ref
      // encore présent dans l'URL de retour). Idempotent et silencieux.
      try {
        const userId = data.user?.id;
        const cookieRef = request.headers.get("cookie")?.match(/(?:^|;\s*)drf_ref=([A-Za-z0-9]{4,12})/)?.[1];
        const urlRef = new URL(next, origin).searchParams.get("ref");
        const ref = cookieRef ?? urlRef;
        if (userId && ref && isValidCode(ref.toUpperCase())) {
          const r = await claimReferral(userId, ref, cookieRef ? "cookie" : "url", await hashIp(ipAddress(request)));
          if (r.ok || ["self", "too_old", "unknown_code"].includes(r.reason)) {
            res.cookies.set({ name: REF_COOKIE, value: "", maxAge: 0, path: "/" });
          }
        }
      } catch {}
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/blindtest?auth_error=1`);
}
