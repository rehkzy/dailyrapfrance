import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// /profil → le profil de la personne connectée (sinon la connexion, qui ramène ici).
export default async function MyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/parametres");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  if (!profile?.username) redirect("/parametres");
  redirect(`/profil/${profile.username}`);
}
