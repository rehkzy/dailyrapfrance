import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminEmails } from "@/lib/adminAuth";
import AdminDashboard from "@/components/AdminDashboard";

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
    <main className="min-h-screen bg-bg text-ink relative">
      <div className="aurora-fixed" aria-hidden="true" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-24">
        <AdminDashboard adminEmail={user.email} />
      </div>
    </main>
  );
}
