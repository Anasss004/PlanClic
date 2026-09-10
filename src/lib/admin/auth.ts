import { redirect } from "next/navigation";
import { getUtilisateurEtProfil } from "@/lib/utilisateur";

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
  // Mémorisé par requête : exigerStaff() est appelé à la fois dans le layout
  // admin et dans chaque page, mais un seul appel réseau part réellement.
  const { user, profil } = await getUtilisateurEtProfil();

  if (!user) redirect("/connexion");

  if (!profil || !["support", "admin"].includes(profil.role)) {
    redirect("/");
  }

  return profil as ProfilStaff;
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
  const { user, profil } = await getUtilisateurEtProfil();
  if (!user) throw new Error("Non authentifié.");

  if (!profil || !["support", "admin"].includes(profil.role)) {
    throw new Error("Action réservée à l'équipe PlanClic.");
  }
  return profil as ProfilStaff;
}

export async function exigerAdminAction(): Promise<ProfilStaff> {
  const profil = await exigerStaffAction();
  if (profil.role !== "admin") {
    throw new Error("Action réservée à un administrateur.");
  }
  return profil;
}
