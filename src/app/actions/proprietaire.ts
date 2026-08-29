"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validerFichier } from "@/lib/validation-fichiers";

// Génère un chemin de stockage non prévisible, jamais basé sur
// nom/CIN/tel/email — conforme aux règles de sécurité du projet.
// L'extension vient du type réel détecté (magic bytes), jamais du nom
// de fichier fourni par le client.
function cheminAleatoire(userId: string, mime: string) {
  const extension = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}

// ------------------------------------------------------------
// Étape 2 de l'inscription propriétaire : infos professionnelles
// + upload RC et pièce d'identité du gérant.
// ------------------------------------------------------------
export async function completerProfilPro(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const nom_entreprise = formData.get("nom_entreprise") as string;
  const specialite = formData.get("specialite") as string;
  const ville = formData.get("ville") as string;
  const adresse = formData.get("adresse") as string;
  const registre_commerce = formData.get("registre_commerce") as string;
  const fichierRC = formData.get("document_rc") as File | null;
  const fichierID = formData.get("document_id") as File | null;

  // Upload optionnel — solution temporaire en attendant la finalisation
  // du dossier CNDP : la méthode recommandée est l'envoi par WhatsApp
  // (voir bouton dédié sur la page), donc ces fichiers peuvent être vides.
  const documentsAInserer: {
    owner_id: string;
    type_document: string;
    storage_path: string;
    proprietaire_id: string;
  }[] = [];

  if (fichierRC && fichierRC.size > 0) {
    const validationRC = await validerFichier(fichierRC, ["image/jpeg", "image/png", "application/pdf"]);
    if (!validationRC.valide) {
      redirect("/inscription/infos-professionnelles?erreur=upload-rc");
    }
    const cheminRC = cheminAleatoire(user.id, fichierRC.type);
    const { error } = await supabase.storage.from("documents-prives").upload(cheminRC, fichierRC);
    if (error) {
      redirect("/inscription/infos-professionnelles?erreur=upload-rc");
    }
    documentsAInserer.push({
      owner_id: user.id,
      type_document: "registre_commerce",
      storage_path: cheminRC,
      proprietaire_id: user.id,
    });
  }

  if (fichierID && fichierID.size > 0) {
    const validationID = await validerFichier(fichierID, ["image/jpeg", "image/png", "application/pdf"]);
    if (!validationID.valide) {
      redirect("/inscription/infos-professionnelles?erreur=upload-id");
    }
    const cheminID = cheminAleatoire(user.id, fichierID.type);
    const { error } = await supabase.storage.from("documents-prives").upload(cheminID, fichierID);
    if (error) {
      redirect("/inscription/infos-professionnelles?erreur=upload-id");
    }
    documentsAInserer.push({
      owner_id: user.id,
      type_document: "id_gerant",
      storage_path: cheminID,
      proprietaire_id: user.id,
    });
  }

  // 2. Création de la fiche propriétaire (statut "en_attente" par défaut)
  const { error: erreurProprietaire } = await supabase
    .from("proprietaires")
    .insert({
      id: user.id,
      nom_entreprise,
      specialite,
      ville,
      adresse,
      registre_commerce,
    });

  if (erreurProprietaire) {
    redirect("/inscription/infos-professionnelles?erreur=creation-profil");
  }

  // 3. Référence des documents (jamais le fichier lui-même en base) —
  // uniquement s'il y en a (upload optionnel, cf. WhatsApp ci-dessus)
  if (documentsAInserer.length > 0) {
    await supabase.from("documents").insert(documentsAInserer);
  }

  redirect("/proprietaire/dashboard");
}

// ------------------------------------------------------------
// Ajouter un véhicule (uniquement si compte vérifié — la RLS
// bloque aussi côté base, ceci est la vérification côté UI)
// ------------------------------------------------------------
export async function ajouterVehicule(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  // Restriction selon le plan (feature gating) : vérifie que le
  // propriétaire n'a pas atteint la limite de véhicules de son plan.
  const { data: plan } = await supabase.rpc("plan_actuel", { p_proprietaire_id: user.id });
  const limiteVehicules = plan?.[0]?.max_vehicules;

  if (limiteVehicules != null) {
    const { count: nbVehiculesActuels } = await supabase
      .from("vehicules")
      .select("*", { count: "exact", head: true })
      .eq("proprietaire_id", user.id)
      .is("deleted_at", null);

    if ((nbVehiculesActuels ?? 0) >= limiteVehicules) {
      redirect("/proprietaire/vehicules/nouveau?erreur=limite-plan");
    }
  }

  const photos = formData.getAll("photos") as File[];
  const cheminsPhotos: string[] = [];

  for (const photo of photos) {
    if (photo.size === 0) continue;
    const validation = await validerFichier(photo, ["image/jpeg", "image/png"]);
    if (!validation.valide) continue; // fichier ignoré silencieusement, non bloquant pour le reste
    const chemin = cheminAleatoire(user.id, photo.type);
    const { error } = await supabase.storage
      .from("photos-vehicules")
      .upload(chemin, photo);
    if (!error) {
      const { data } = supabase.storage
        .from("photos-vehicules")
        .getPublicUrl(chemin);
      cheminsPhotos.push(data.publicUrl);
    }
  }

  const { error } = await supabase.from("vehicules").insert({
    proprietaire_id: user.id,
    type: formData.get("type") as string,
    marque: formData.get("marque") as string,
    modele: formData.get("modele") as string,
    portes: Number(formData.get("portes")) || null,
    places: Number(formData.get("places")) || null,
    carburant: formData.get("carburant") as string,
    transmission: formData.get("transmission") as string,
    couleur: formData.get("couleur") as string,
    immatriculation: formData.get("immatriculation") as string,
    prix_jour: Number(formData.get("prix_jour")),
    ville: formData.get("ville") as string,
    photos: cheminsPhotos,
    categorie: (formData.get("categorie") as string) || null,
    km_inclus_jour: formData.get("km_inclus_jour") ? Number(formData.get("km_inclus_jour")) : null,
    age_minimum: formData.get("age_minimum") ? Number(formData.get("age_minimum")) : null,
    anciennete_permis_mois: formData.get("anciennete_permis_mois") ? Number(formData.get("anciennete_permis_mois")) : null,
  });

  if (error) {
    redirect("/proprietaire/vehicules/nouveau?erreur=creation");
  }

  redirect("/proprietaire/vehicules");
}

// ------------------------------------------------------------
// Accepter / refuser / terminer une réservation — passe par la
// fonction SQL sécurisée changer_statut_reservation(), jamais un
// UPDATE direct (voir 02_functions.sql).
// ------------------------------------------------------------
export async function traiterReservation(
  reservationId: string,
  nouveauStatut: "confirmee" | "refusee" | "terminee"
) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("changer_statut_reservation", {
    p_reservation_id: reservationId,
    p_nouveau_statut: nouveauStatut,
  });

  if (error) {
    throw new Error("Action impossible : " + error.message);
  }

  revalidatePath("/proprietaire/reservations");
}

// ------------------------------------------------------------
// Signaler une amende — recherche automatique du client concerné
// via la date et l'immatriculation.
// ------------------------------------------------------------
export async function signalerAmende(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const date_amende = formData.get("date_amende") as string;
  const numero_immatriculation = formData.get("numero_immatriculation") as string;

  // Trouve le véhicule du propriétaire avec cette immatriculation
  const { data: vehicule } = await supabase
    .from("vehicules")
    .select("id")
    .eq("proprietaire_id", user.id)
    .eq("immatriculation", numero_immatriculation)
    .single();

  if (!vehicule) {
    redirect("/proprietaire/amendes?erreur=vehicule-introuvable");
  }

  // Trouve la réservation (confirmée ou déjà terminée — une amende
  // arrive souvent après la fin de la location) qui couvrait cette date.
  // On prend la plus récente si plusieurs correspondent (cas rare de
  // chevauchement entre une ancienne location terminée et une nouvelle).
  const { data: reservationsCorrespondantes } = await supabase
    .from("reservations")
    .select("id")
    .eq("vehicule_id", vehicule!.id)
    .in("statut", ["confirmee", "terminee"])
    .lte("date_debut", date_amende)
    .gte("date_fin", date_amende)
    .order("date_debut", { ascending: false })
    .limit(1);

  const reservation = reservationsCorrespondantes?.[0] ?? null;

  const { error } = await supabase.from("amendes").insert({
    vehicule_id: vehicule!.id,
    proprietaire_id: user.id,
    reservation_id: reservation?.id ?? null,
    date_amende,
    numero_immatriculation,
  });

  if (error) {
    redirect("/proprietaire/amendes?erreur=creation");
  }

  revalidatePath("/proprietaire/amendes");
  redirect("/proprietaire/amendes");
}

// ------------------------------------------------------------
// Modifier un véhicule existant (le propriétaire uniquement, RLS
// interdit déjà toute modification par un tiers).
// ------------------------------------------------------------
export async function modifierVehicule(vehiculeId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Upload des nouvelles photos éventuelles — ajoutées à celles déjà
  // en place, jamais un remplacement destructeur.
  const nouvellesPhotos = formData.getAll("photos") as File[];
  const cheminsAjoutes: string[] = [];
  for (const photo of nouvellesPhotos) {
    if (photo.size === 0) continue;
    const validation = await validerFichier(photo, ["image/jpeg", "image/png"]);
    if (!validation.valide) continue;
    const chemin = cheminAleatoire(user.id, photo.type);
    const { error } = await supabase.storage.from("photos-vehicules").upload(chemin, photo);
    if (!error) {
      const { data } = supabase.storage.from("photos-vehicules").getPublicUrl(chemin);
      cheminsAjoutes.push(data.publicUrl);
    }
  }

  let photosFinales: string[] | undefined;
  if (cheminsAjoutes.length > 0) {
    const { data: vehiculeActuel } = await supabase
      .from("vehicules")
      .select("photos")
      .eq("id", vehiculeId)
      .single();
    photosFinales = [...(vehiculeActuel?.photos ?? []), ...cheminsAjoutes];
  }

  const { error } = await supabase
    .from("vehicules")
    .update({
      marque: formData.get("marque") as string,
      modele: formData.get("modele") as string,
      portes: Number(formData.get("portes")) || null,
      places: Number(formData.get("places")) || null,
      carburant: formData.get("carburant") as string,
      transmission: formData.get("transmission") as string,
      couleur: formData.get("couleur") as string,
      prix_jour: Number(formData.get("prix_jour")),
      ville: formData.get("ville") as string,
      kilometrage_actuel: formData.get("kilometrage_actuel")
        ? Number(formData.get("kilometrage_actuel"))
        : null,
      km_inclus_jour: formData.get("km_inclus_jour")
        ? Number(formData.get("km_inclus_jour"))
        : null,
      age_minimum: formData.get("age_minimum") ? Number(formData.get("age_minimum")) : null,
      anciennete_permis_mois: formData.get("anciennete_permis_mois")
        ? Number(formData.get("anciennete_permis_mois"))
        : null,
      ...(photosFinales ? { photos: photosFinales } : {}),
    })
    .eq("id", vehiculeId);

  if (error) {
    redirect(`/proprietaire/vehicules/${vehiculeId}/modifier?erreur=modification`);
  }

  revalidatePath(`/proprietaire/vehicules/${vehiculeId}`);
  revalidatePath("/proprietaire/vehicules");
  redirect(`/proprietaire/vehicules/${vehiculeId}?message=vehicule-modifie`);
}

// ------------------------------------------------------------
// Activer / désactiver un véhicule (le propriétaire, pas juste l'admin)
// ------------------------------------------------------------
export async function basculerStatutVehicule(vehiculeId: string, statutActuel: string) {
  const supabase = await createClient();
  const nouveauStatut = statutActuel === "actif" ? "inactif" : "actif";

  const { error } = await supabase
    .from("vehicules")
    .update({ statut: nouveauStatut })
    .eq("id", vehiculeId);

  if (error) throw new Error(error.message);

  revalidatePath("/proprietaire/vehicules");
  revalidatePath(`/proprietaire/vehicules/${vehiculeId}`);
}

// ------------------------------------------------------------
// Supprimer un véhicule (suppression logique — deleted_at)
// ------------------------------------------------------------
export async function supprimerVehicule(vehiculeId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("vehicules")
    .update({ deleted_at: new Date().toISOString(), statut: "inactif" })
    .eq("id", vehiculeId);

  if (error) throw new Error(error.message);

  revalidatePath("/proprietaire/vehicules");
}

// ------------------------------------------------------------
// Ajouter une intervention de maintenance
// ------------------------------------------------------------
export async function ajouterMaintenance(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const vehiculeId = formData.get("vehicule_id") as string;

  const { error } = await supabase.from("maintenance").insert({
    vehicule_id: vehiculeId,
    proprietaire_id: user.id,
    type: formData.get("type") as string,
    date_intervention: formData.get("date_intervention") as string,
    kilometrage: formData.get("kilometrage") ? Number(formData.get("kilometrage")) : null,
    cout: formData.get("cout") ? Number(formData.get("cout")) : null,
    description: (formData.get("description") as string) || null,
  });

  if (error) {
    redirect(`/proprietaire/vehicules/${vehiculeId}?erreur=maintenance`);
  }

  revalidatePath(`/proprietaire/vehicules/${vehiculeId}`);
  redirect(`/proprietaire/vehicules/${vehiculeId}?message=maintenance-ajoutee`);
}

// ------------------------------------------------------------
// Ajouter un document véhicule avec date d'expiration (assurance,
// contrôle technique, vignette) — pour les alertes.
// ------------------------------------------------------------
export async function ajouterDocumentVehicule(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const vehiculeId = formData.get("vehicule_id") as string;

  const { error } = await supabase.from("documents_vehicule").insert({
    vehicule_id: vehiculeId,
    proprietaire_id: user.id,
    type: formData.get("type") as string,
    date_expiration: formData.get("date_expiration") as string,
  });

  if (error) {
    redirect(`/proprietaire/vehicules/${vehiculeId}?erreur=document`);
  }

  revalidatePath(`/proprietaire/vehicules/${vehiculeId}`);
  redirect(`/proprietaire/vehicules/${vehiculeId}?message=document-ajoute`);
}

// ------------------------------------------------------------
// Bloquer un véhicule (réservation reçue hors PlanClic) — passe
// par la fonction sécurisée bloquer_vehicule().
// ------------------------------------------------------------
export async function bloquerVehicule(formData: FormData) {
  const supabase = await createClient();
  const vehiculeId = formData.get("vehicule_id") as string;

  const { error } = await supabase.rpc("bloquer_vehicule", {
    p_vehicule_id: vehiculeId,
    p_date_debut: formData.get("date_debut") as string,
    p_date_fin: formData.get("date_fin") as string,
    p_nom_client: formData.get("nom_client") as string,
    p_telephone_client: (formData.get("telephone_client") as string) || null,
  });

  if (error) {
    redirect(`/proprietaire/vehicules/${vehiculeId}?erreur=blocage`);
  }

  revalidatePath(`/proprietaire/vehicules/${vehiculeId}`);
  redirect(`/proprietaire/vehicules/${vehiculeId}?message=vehicule-bloque`);
}

// ------------------------------------------------------------
// Annuler un blocage manuel
// ------------------------------------------------------------
export async function annulerBlocage(reservationId: string, vehiculeId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("annuler_blocage", {
    p_reservation_id: reservationId,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/proprietaire/vehicules/${vehiculeId}`);
}

// ------------------------------------------------------------
// Modifier les informations générales de l'agence (nom, ville,
// adresse, spécialité). Le statut de vérification n'est jamais
// modifiable par cette voie (RLS + trigger l'interdisent déjà).
// ------------------------------------------------------------
export async function modifierProprietaire(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { error } = await supabase
    .from("proprietaires")
    .update({
      nom_entreprise: formData.get("nom_entreprise") as string,
      ville: formData.get("ville") as string,
      adresse: formData.get("adresse") as string,
      specialite: formData.get("specialite") as string,
    })
    .eq("id", user.id);

  if (error) {
    redirect("/proprietaire/parametres?erreur=modification");
  }

  revalidatePath("/proprietaire/parametres");
  redirect("/proprietaire/parametres?message=enregistre");
}
