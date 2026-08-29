"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { exigerStaffAction } from "@/lib/admin/auth";

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

// ------------------------------------------------------------
// Gestion des plans (SaaS) — CRUD réservé aux vrais admin
// ------------------------------------------------------------
export async function creerPlan(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("plans").insert({
    nom: formData.get("nom") as string,
    description: (formData.get("description") as string) || null,
    prix: Number(formData.get("prix")),
    periode: formData.get("periode") as string,
    max_vehicules: formData.get("max_vehicules") ? Number(formData.get("max_vehicules")) : null,
    acces_statistiques: formData.get("acces_statistiques") === "on",
    mise_en_avant: formData.get("mise_en_avant") === "on",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/plans");
}

export async function modifierPlan(planId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("plans")
    .update({
      nom: formData.get("nom") as string,
      description: (formData.get("description") as string) || null,
      prix: Number(formData.get("prix")),
      periode: formData.get("periode") as string,
      max_vehicules: formData.get("max_vehicules") ? Number(formData.get("max_vehicules")) : null,
      acces_statistiques: formData.get("acces_statistiques") === "on",
      mise_en_avant: formData.get("mise_en_avant") === "on",
    })
    .eq("id", planId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/plans");
}

export async function basculerPlanActif(planId: string, actifActuel: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("plans")
    .update({ actif: !actifActuel })
    .eq("id", planId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/plans");
}

// ------------------------------------------------------------
// Attribution manuelle d'un plan à un propriétaire
// ------------------------------------------------------------
export async function assignerPlan(proprietaireId: string, planId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_assigner_plan", {
    p_proprietaire_id: proprietaireId,
    p_plan_id: planId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/abonnements");
  revalidatePath(`/admin/agences/${proprietaireId}`);
}

// ------------------------------------------------------------
// Fiche agence — activer / désactiver un compte (suppression
// logique réversible) et envoyer un message in-app.
// ------------------------------------------------------------
export async function definirActifAgence(proprietaireId: string, actif: boolean) {
  await exigerStaffAction();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_definir_actif_agence", {
    p_proprietaire_id: proprietaireId,
    p_actif: actif,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/agences/${proprietaireId}`);
  revalidatePath("/admin/utilisateurs");
}

export async function envoyerMessageProprietaire(
  proprietaireId: string,
  titre: string,
  message: string
) {
  await exigerStaffAction();
  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_notifier_proprietaire", {
    p_proprietaire_id: proprietaireId,
    p_titre: titre,
    p_message: message,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/agences/${proprietaireId}`);
}
