"use server";

import { createClient } from "@/lib/supabase/server";
import { exigerStaffAction } from "@/lib/admin/auth";
import {
  createAdminClient,
  serviceRoleDisponible,
  ServiceRoleIndisponibleError,
} from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type EntreeVehicule = {
  type: string;
  marque: string;
  modele: string;
  immatriculation: string;
  prix_jour: string;
  ville: string;
  carburant?: string;
  transmission?: string;
  categorie?: string;
};

export type EntreeEspace = {
  // Compte / gérant
  email: string;
  prenom: string;
  nom: string;
  telephone?: string;
  genre?: string;
  // Agence
  nom_entreprise: string;
  specialite: string;
  ville: string;
  adresse?: string;
  registre_commerce: string;
  verifier: boolean;
  // Plan
  plan_id?: string;
  // Premier véhicule (optionnel)
  vehicule?: EntreeVehicule | null;
};

export type RecapEspace = {
  userId: string;
  email: string;
  lienConnexion: string;
  lienMotDePasse: string | null;
  vehiculeCree: boolean;
  avertissements: string[];
};

// ============================================================
// Création guidée d'un espace agence (compte + plan + 1er véhicule)
// depuis l'admin. La création du compte Auth utilise la clé
// service_role CÔTÉ SERVEUR UNIQUEMENT (jamais exposée au client),
// dans cette action précise. Toutes les écritures métier qui suivent
// passent par des fonctions SECURITY DEFINER revérifiant le rôle.
// ============================================================
export async function creerEspaceProprietaire(
  entree: EntreeEspace
): Promise<RecapEspace> {
  await exigerStaffAction();

  if (!serviceRoleDisponible()) {
    throw new ServiceRoleIndisponibleError();
  }

  // Validations minimales côté serveur (la base revalide aussi).
  const email = entree.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Email invalide.");
  if (!entree.prenom?.trim() || !entree.nom?.trim())
    throw new Error("Nom et prénom obligatoires.");
  if (!entree.nom_entreprise?.trim())
    throw new Error("Nom de l'agence obligatoire.");
  if (!["voitures_utilitaires", "motos"].includes(entree.specialite))
    throw new Error("Spécialité invalide.");
  if (!entree.ville?.trim()) throw new Error("Ville obligatoire.");
  if (!entree.registre_commerce?.trim())
    throw new Error("Registre de commerce obligatoire.");

  const admin = createAdminClient();
  const avertissements: string[] = [];

  // 1. Compte Auth — le trigger handle_new_user() crée le profil
  //    (role = 'proprietaire') à partir des user_metadata.
  const { data: creation, error: erreurCreation } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        role: "proprietaire",
        nom: entree.nom.trim(),
        prenom: entree.prenom.trim(),
        telephone: entree.telephone?.trim() || null,
        genre: entree.genre || null,
      },
    });

  if (erreurCreation || !creation?.user) {
    const msg = erreurCreation?.message ?? "";
    if (msg.toLowerCase().includes("already been registered") || msg.includes("exists")) {
      throw new Error("Un compte existe déjà avec cet email.");
    }
    throw new Error("Création du compte impossible : " + msg);
  }

  const userId = creation.user.id;
  const supabase = await createClient();

  // 2. Fiche agence (+ vérification si documents déjà contrôlés hors ligne)
  const { error: erreurFiche } = await supabase.rpc(
    "admin_creer_fiche_proprietaire",
    {
      p_user_id: userId,
      p_nom_entreprise: entree.nom_entreprise.trim(),
      p_specialite: entree.specialite,
      p_ville: entree.ville.trim(),
      p_adresse: entree.adresse?.trim() || "",
      p_registre_commerce: entree.registre_commerce.trim(),
      p_verifier: entree.verifier,
    }
  );

  if (erreurFiche) {
    // Rollback : on retire le compte Auth pour ne pas laisser d'orphelin.
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    throw new Error(
      "Création de la fiche agence impossible : " + erreurFiche.message
    );
  }

  // 3. Plan (optionnel — sinon le trigger a déjà mis "Basique")
  if (entree.plan_id) {
    const { error: erreurPlan } = await supabase.rpc("admin_assigner_plan", {
      p_proprietaire_id: userId,
      p_plan_id: entree.plan_id,
    });
    if (erreurPlan) {
      avertissements.push(
        "Le plan n'a pas pu être attribué (" +
          erreurPlan.message +
          "). Le plan Basique par défaut reste actif."
      );
    }
  }

  // 4. Premier véhicule (optionnel)
  let vehiculeCree = false;
  if (entree.vehicule && entree.vehicule.marque?.trim()) {
    const v = entree.vehicule;
    const prix = Number(v.prix_jour);
    if (!v.modele?.trim() || !v.immatriculation?.trim() || !prix || prix <= 0) {
      avertissements.push(
        "Le véhicule n'a pas été créé : modèle, immatriculation et prix/jour sont obligatoires."
      );
    } else {
      const { error: erreurVehicule } = await supabase.rpc(
        "admin_ajouter_vehicule",
        {
          p_proprietaire_id: userId,
          p_type: v.type || "voiture",
          p_marque: v.marque.trim(),
          p_modele: v.modele.trim(),
          p_immatriculation: v.immatriculation.trim(),
          p_prix_jour: prix,
          p_ville: (v.ville || entree.ville).trim(),
          p_carburant: v.carburant || "",
          p_transmission: v.transmission || "",
          p_categorie: v.categorie || "",
        }
      );
      if (erreurVehicule) {
        avertissements.push(
          "Le véhicule n'a pas pu être créé : " + erreurVehicule.message
        );
      } else {
        vehiculeCree = true;
      }
    }
  }

  // 5. Lien de définition de mot de passe (type "recovery")
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  let lienMotDePasse: string | null = null;
  const { data: lien, error: erreurLien } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${site}/reinitialiser-mot-de-passe` },
  });
  if (erreurLien || !lien?.properties?.action_link) {
    avertissements.push(
      "Le lien de mot de passe n'a pas pu être généré. Demandez à l'agence d'utiliser « Mot de passe oublié » sur la page de connexion."
    );
  } else {
    lienMotDePasse = lien.properties.action_link;
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/abonnements");

  return {
    userId,
    email,
    lienConnexion: `${site}/connexion`,
    lienMotDePasse,
    vehiculeCree,
    avertissements,
  };
}
