import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// Impersonation ("Se connecter en tant que") — mode SUPPORT.
//
// Il ne s'agit PAS d'une vraie bascule de session Auth : le staff
// reste authentifié en tant que lui-même (ses policies RLS staff lui
// donnent déjà la lecture de toutes les agences). Un cookie httpOnly
// indique simplement quelle agence "regarder". L'espace propriétaire
// affiche alors les données de cette agence, en LECTURE SEULE, avec
// une bannière visible. Chaque début/fin est journalisé dans
// audit_logs via la RPC admin_journaliser_impersonation().
// ============================================================

export const COOKIE_IMPERSONATION = "pc_impersonation";

export type ContexteImpersonation = {
  proprietaireId: string;
  nomAgence: string;
};

// Renvoie le contexte d'impersonation SI, et seulement si :
//   * un cookie d'impersonation est présent ;
//   * l'utilisateur connecté est réellement staff (sinon on ignore
//     le cookie — défense en profondeur, le RLS bloquerait de toute
//     façon la lecture).
export async function getImpersonation(): Promise<ContexteImpersonation | null> {
  const jar = await cookies();
  const cible = jar.get(COOKIE_IMPERSONATION)?.value;
  if (!cible) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profil || !["support", "admin"].includes(profil.role)) return null;

  const { data: agence } = await supabase
    .from("proprietaires")
    .select("nom_entreprise")
    .eq("id", cible)
    .single();

  if (!agence) return null;

  return { proprietaireId: cible, nomAgence: agence.nom_entreprise };
}

// Identifiant "effectif" du propriétaire pour les pages de l'espace
// propriétaire : l'agence impersonée si le contexte est actif, sinon
// l'utilisateur lui-même.
export async function resoudreProprietaireId(
  idReel: string
): Promise<{ id: string; impersonation: ContexteImpersonation | null }> {
  const ctx = await getImpersonation();
  return { id: ctx ? ctx.proprietaireId : idReel, impersonation: ctx };
}
