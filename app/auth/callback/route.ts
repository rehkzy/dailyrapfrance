import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Chemin de retour post-connexion — uniquement un chemin interne ("/..." mais pas "//...")
  // pour empêcher toute redirection vers un site externe via un lien forgé.
  const rawNext = searchParams.get("next") ?? "/blindtest";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/blindtest";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/blindtest?auth_error=1`);
}
