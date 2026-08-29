import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfilStaff = {
  id: string;
  role: "support" | "admin";
  prenom: string | null;
  nom: string | null;
  email: string | null;
};

// ------------------------------------------------------------
// À utiliser en tête des Server Components / Server Actions de
// l'espace /admin. Double barrière avec le RLS : la base refuse déjà
// toute opération privilégiée à un non-staff, mais on veut aussi une
// redirection propre (jamais de page blanche / d'erreur brute).
// ------------------------------------------------------------
export async function exigerStaff(): Promise<ProfilStaff> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, prenom, nom, email")
    .eq("id", user.id)
    .single();

  if (!profile || !["support", "admin"].includes(profile.role)) {
    redirect("/");
  }

  return profile as ProfilStaff;
}

export async function exigerAdmin(): Promise<ProfilStaff> {
  const profil = await exigerStaff();
  if (profil.role !== "admin") {
    redirect("/admin/dashboard");
  }
  return profil;
}

// Variante pour Server Actions : lève au lieu de rediriger, pour que
// le message remonte dans un toast côté client.
export async function exigerStaffAction(): Promise<ProfilStaff> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, prenom, nom, email")
    .eq("id", user.id)
    .single();

  if (!profile || !["support", "admin"].includes(profile.role)) {
    throw new Error("Action réservée à l'équipe PlanClic.");
  }
  return profile as ProfilStaff;
}

export async function exigerAdminAction(): Promise<ProfilStaff> {
  const profil = await exigerStaffAction();
  if (profil.role !== "admin") {
    throw new Error("Action réservée à un administrateur.");
  }
  return profil;
}
