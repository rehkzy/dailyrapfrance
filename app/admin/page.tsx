import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminEmails } from "@/lib/adminAuth";
import { Suspense } from "react";
import AdminStudio from "@/components/admin/AdminStudio";

export const metadata = {
  title: "Back-office — DailyRapFrance",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// /admin — réservé aux e-mails listés dans ADMIN_EMAILS. Le contrôle est fait ICI côté
// serveur (redirection avant tout rendu) ET dans chaque route /api/admin/* : la page ne
// fait que l'affichage, aucune donnée sensible ne part sans re-vérification.
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !adminEmails().includes(user.email.toLowerCase())) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#070404] text-ink" data-admin>
      <Suspense fallback={null}>
        <AdminStudio adminEmail={user.email} />
      </Suspense>
    </div>
  );
}
