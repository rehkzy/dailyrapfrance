import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

/*
 * Back-office — clients & garde d'accès.
 *
 * adminClient() : client Supabase avec la clé SERVICE_ROLE — contourne le RLS, voit tout
 * (dont auth.users : e-mails, dernière connexion), peut supprimer des comptes. Ne doit
 * JAMAIS fuiter côté client : ce module est marqué "server-only".
 *
 * requireAdmin() : vérifie que la requête vient d'une session connectée ET que l'e-mail
 * du compte figure dans ADMIN_EMAILS (variable d'environnement, liste séparée par des
 * virgules). Toutes les routes /api/admin/* commencent par cet appel.
 */

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante — ajoute-la aux variables d'environnement.");
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(): Promise<{ ok: true; email: string } | { ok: false; status: number; error: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, status: 401, error: "Non connecté" };
  const allowed = adminEmails();
  if (allowed.length === 0) return { ok: false, status: 500, error: "ADMIN_EMAILS non configurée" };
  if (!allowed.includes(user.email.toLowerCase())) return { ok: false, status: 403, error: "Accès refusé" };
  return { ok: true, email: user.email };
}
