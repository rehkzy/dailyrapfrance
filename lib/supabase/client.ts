import { createBrowserClient } from "@supabase/ssr";

// Client Supabase côté navigateur — utilisé pour la connexion OAuth et les lectures publiques
// (classement). Les variables NEXT_PUBLIC_* sont sûres à exposer : c'est la clé "anon",
// limitée par les règles RLS définies dans supabase/schema.sql.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
