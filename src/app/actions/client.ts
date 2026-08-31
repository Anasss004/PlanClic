"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validerFichier } from "@/lib/validation-fichiers";

function cheminAleatoire(userId: string, mime: string) {
  const extension = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}

// ------------------------------------------------------------
// Modifier ses informations personnelles
// ------------------------------------------------------------
export async function modifierProfil(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { error } = await supabase
    .from("profiles")
    .update({
      prenom: formData.get("prenom") as string,
      nom: formData.get("nom") as string,
      telephone: formData.get("telephone") as string,
      genre: formData.get("genre") as string,
      date_naissance: (formData.get("date_naissance") as string) || null,
    })
    .eq("id", user.id);

  if (error) {
    redirect("/profil?erreur=modification-impossible");
  }

  revalidatePath("/profil");
  redirect("/profil?message=profil-mis-a-jour");
}

// ------------------------------------------------------------
// Annuler sa propre réservation (uniquement si encore en_attente —
// la règle est appliquée par la fonction SQL sécurisée)
// ------------------------------------------------------------
export async function annulerReservation(reservationId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("changer_statut_reservation", {
    p_reservation_id: reservationId,
    p_nouveau_statut: "annulee",
  });

  if (error) {
    throw new Error("Annulation impossible : " + error.message);
  }

  revalidatePath("/profil");
}

// ------------------------------------------------------------
// Créer une demande de réservation. Le prix et le propriétaire sont
// recalculés côté serveur depuis la vue publique (jamais depuis des
// valeurs envoyées par le client, pour éviter toute manipulation).
// ------------------------------------------------------------
export async function creerReservation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const vehiculeId = formData.get("vehicule_id") as string;
  const dateDebut = formData.get("date_debut") as string;
  const dateFin = formData.get("date_fin") as string;

  if (!user) {
    redirect(
      `/connexion?redirect=/vehicules/${vehiculeId}?date_debut=${dateDebut}&date_fin=${dateFin}`
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "client") {
    redirect(`/vehicules/${vehiculeId}?erreur=reserve-aux-clients`);
  }

  // Vue publique (bypass RLS de la table vehicules par design) —
  // seule source fiable pour proprietaire_id et prix_jour ici.
  const { data: vehicule } = await supabase
    .from("vehicules_recherche")
    .select("proprietaire_id, prix_jour")
    .eq("id", vehiculeId)
    .single();

  if (!vehicule) {
    redirect(`/vehicules/${vehiculeId}?erreur=vehicule-introuvable`);
  }

  const nbJours = Math.max(
    1,
    Math.round(
      (new Date(dateFin).getTime() - new Date(dateDebut).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const prixTotal = nbJours * vehicule!.prix_jour;

  const { error } = await supabase.from("reservations").insert({
    vehicule_id: vehiculeId,
    client_id: user.id,
    proprietaire_id: vehicule!.proprietaire_id,
    date_debut: dateDebut,
    date_fin: dateFin,
    prix_total: prixTotal,
    // Préférences facultatives du client — le propriétaire les ajuste
    // après acceptation (heure/lieu de retour notamment).
    heure_debut: (formData.get("heure_debut") as string) || null,
    heure_fin: (formData.get("heure_fin") as string) || null,
    lieu_debut: ((formData.get("lieu_debut") as string) || "").trim() || null,
  });

  if (error) {
    redirect(`/vehicules/${vehiculeId}?erreur=reservation-impossible`);
  }

  redirect("/profil?onglet=reservations&message=demande-envoyee");
}

// ------------------------------------------------------------
// Upload d'un document d'identité (CIN ou permis), à l'avance,
// avant même d'avoir une réservation en cours.
// ------------------------------------------------------------
export async function uploaderDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const typeDocument = formData.get("type_document") as string;
  const fichier = formData.get("fichier") as File;

  if (!["cin", "permis"].includes(typeDocument)) {
    redirect("/profil?erreur=type-document-invalide");
  }

  const validation = await validerFichier(fichier, ["image/jpeg", "image/png", "application/pdf"]);
  if (!validation.valide) {
    redirect("/profil?erreur=fichier-invalide");
  }

  const chemin = cheminAleatoire(user.id, fichier.type);

  const { error: erreurUpload } = await supabase.storage
    .from("documents-prives")
    .upload(chemin, fichier);

  if (erreurUpload) {
    redirect("/profil?erreur=upload-echoue");
  }

  const { error } = await supabase.from("documents").insert({
    owner_id: user.id,
    type_document: typeDocument,
    storage_path: chemin,
  });

  if (error) {
    redirect("/profil?erreur=enregistrement-echoue");
  }

  revalidatePath("/profil");
  redirect("/profil?onglet=documents&message=document-envoye");
}
