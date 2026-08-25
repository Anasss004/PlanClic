"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function validerProprietaire(
  proprietaireId: string,
  decision: "verifie" | "rejete"
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("verifier_proprietaire", {
    p_proprietaire_id: proprietaireId,
    p_decision: decision,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/verifications");
  revalidatePath("/admin/dashboard");
}

export async function validerDocument(
  documentId: string,
  decision: "valide" | "rejete"
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("valider_document", {
    p_document_id: documentId,
    p_decision: decision,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/verifications");
}

export async function changerStatutVehicule(
  vehiculeId: string,
  statut: "actif" | "inactif"
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_changer_statut_vehicule", {
    p_vehicule_id: vehiculeId,
    p_statut: statut,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/vehicules");
}

export async function changerRole(
  userId: string,
  role: "client" | "proprietaire" | "support" | "admin"
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", {
    p_user_id: userId,
    p_new_role: role,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/roles");
}

// Génère une URL signée à courte durée pour consulter un document
// privé (CIN, permis, RC...) — jamais de lien public direct.
export async function obtenirUrlDocumentSigne(storagePath: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data, error } = await supabase.storage
    .from("documents-prives")
    .createSignedUrl(storagePath, 90);

  if (error || !data) throw new Error("Impossible de générer le lien.");

  await supabase.rpc("log_audit", {
    p_action: "document.view",
    p_resource_type: "documents",
    p_resource_id: null,
    p_metadata: {},
  });

  return data.signedUrl;
}
