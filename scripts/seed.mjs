// ============================================================
// PlanClic — Script de remplissage (seed) pour tests locaux
//
// Utilise l'API Admin de Supabase (clé service_role) pour créer de
// vrais comptes de test (auth + profils), puis remplit véhicules,
// réservations, maintenance, documents et plans via le client
// service_role (qui contourne le RLS, normal pour un script de seed
// exécuté en local — cette clé n'est JAMAIS utilisée dans
// l'application elle-même).
//
// USAGE :
//   1. Dans .env.local, ajoute (temporairement, juste pour ce script) :
//      SUPABASE_SERVICE_ROLE_KEY=ta-vraie-cle-service-role
//      (trouvable dans Supabase > Project Settings > API > service_role)
//   2. npm run seed
//
// Le script est rejouable : s'il trouve un compte de test déjà
// existant (par email), il le réutilise au lieu de planter.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Charge .env.local manuellement (pas de dépendance dotenv) ---
function chargerEnvLocal() {
  const cheminEnv = path.resolve(__dirname, "..", ".env.local");
  if (!existsSync(cheminEnv)) return;
  const contenu = readFileSync(cheminEnv, "utf-8");
  contenu.split("\n").forEach((ligne) => {
    const l = ligne.trim();
    if (!l || l.startsWith("#")) return;
    const idx = l.indexOf("=");
    if (idx === -1) return;
    const cle = l.slice(0, idx).trim();
    const valeur = l.slice(idx + 1).trim();
    if (!process.env[cle]) process.env[cle] = valeur;
  });
}
chargerEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "❌ Il manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local.\n" +
      "   Ajoute temporairement SUPABASE_SERVICE_ROLE_KEY (Supabase > Project Settings > API)."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MOT_DE_PASSE_TEST = "Test1234!";

// ------------------------------------------------------------
// Crée un utilisateur (ou récupère l'existant si l'email est déjà pris)
// ------------------------------------------------------------
async function creerOuRecupererUtilisateur({ email, role, nom, prenom, telephone }) {
  const { data: creation, error } = await supabase.auth.admin.createUser({
    email,
    password: MOT_DE_PASSE_TEST,
    email_confirm: true,
    user_metadata: { role, nom, prenom, telephone },
  });

  if (!error) {
    console.log(`  ✓ Compte créé : ${email} (${role})`);
    return creation.user.id;
  }

  if (error.message.toLowerCase().includes("already been registered") || error.status === 422) {
    const { data: profil } = await supabase.from("profiles").select("id").eq("email", email).single();
    if (profil) {
      console.log(`  ↺ Compte déjà existant réutilisé : ${email}`);
      return profil.id;
    }
  }

  throw new Error(`Impossible de créer/trouver ${email} : ${error.message}`);
}

async function main() {
  console.log("🌱 Remplissage de la base PlanClic avec des données de test...\n");

  // ------------------------------------------------------------
  // 1. Comptes
  // ------------------------------------------------------------
  console.log("👤 Création des comptes...");

  const adminId = await creerOuRecupererUtilisateur({
    email: "admin@planclic.test",
    role: "admin",
    nom: "Admin",
    prenom: "PlanClic",
    telephone: "0600000001",
  });

  const client1Id = await creerOuRecupererUtilisateur({
    email: "client1@planclic.test",
    role: "client",
    nom: "Bennani",
    prenom: "Sara",
    telephone: "0611111111",
  });

  const client2Id = await creerOuRecupererUtilisateur({
    email: "client2@planclic.test",
    role: "client",
    nom: "Idrissi",
    prenom: "Karim",
    telephone: "0622222222",
  });

  const proprio1Id = await creerOuRecupererUtilisateur({
    email: "proprio1@planclic.test",
    role: "proprietaire",
    nom: "Alaoui",
    prenom: "Youssef",
    telephone: "0633333333",
  });

  const proprio2Id = await creerOuRecupererUtilisateur({
    email: "proprio2@planclic.test",
    role: "proprietaire",
    nom: "Tazi",
    prenom: "Nadia",
    telephone: "0644444444",
  });

  const proprio3Id = await creerOuRecupererUtilisateur({
    email: "proprio3@planclic.test",
    role: "proprietaire",
    nom: "Chraibi",
    prenom: "Omar",
    telephone: "0655555555",
  });

  // ------------------------------------------------------------
  // 2. Fiches propriétaires (agences)
  // ------------------------------------------------------------
  console.log("\n🏢 Création des agences...");

  async function upsertProprietaire(id, data) {
    const { error } = await supabase.from("proprietaires").upsert({ id, ...data }, { onConflict: "id" });
    if (error) console.error(`  ✗ Erreur agence ${data.nom_entreprise} :`, error.message);
    else console.log(`  ✓ Agence : ${data.nom_entreprise} (${data.statut_verification})`);
  }

  await upsertProprietaire(proprio1Id, {
    nom_entreprise: "Atlas Cars",
    specialite: "voitures_utilitaires",
    ville: "Marrakech",
    adresse: "12 Avenue Mohammed VI, Marrakech",
    registre_commerce: "RC12345",
    statut_verification: "verifie",
  });

  await upsertProprietaire(proprio2Id, {
    nom_entreprise: "Casa Location",
    specialite: "voitures_utilitaires",
    ville: "Casablanca",
    adresse: "45 Boulevard Zerktouni, Casablanca",
    registre_commerce: "RC67890",
    statut_verification: "verifie",
  });

  await upsertProprietaire(proprio3Id, {
    nom_entreprise: "Fes Auto",
    specialite: "motos",
    ville: "Fès",
    adresse: "8 Rue Talaa Kebira, Fès",
    registre_commerce: "RC11223",
    statut_verification: "en_attente", // reste en attente exprès, pour tester /admin/verifications
  });

  // ------------------------------------------------------------
  // 3. Véhicules
  // ------------------------------------------------------------
  console.log("\n🚗 Création des véhicules...");

  async function creerVehicule(data) {
    const { data: vehicule, error } = await supabase
      .from("vehicules")
      .insert(data)
      .select("id")
      .single();
    if (error) {
      console.error(`  ✗ Erreur véhicule ${data.marque} ${data.modele} :`, error.message);
      return null;
    }
    console.log(`  ✓ ${data.marque} ${data.modele} (${data.ville})`);
    return vehicule.id;
  }

  const dacia = await creerVehicule({
    proprietaire_id: proprio1Id,
    type: "voiture",
    marque: "Dacia",
    modele: "Logan",
    portes: 4,
    places: 5,
    carburant: "essence",
    transmission: "manuelle",
    couleur: "Blanc",
    immatriculation: "12345-أ-1",
    prix_jour: 250,
    ville: "Marrakech",
    categorie: "economique",
    km_inclus_jour: 200,
    photos: [],
  });

  const rangeRover = await creerVehicule({
    proprietaire_id: proprio1Id,
    type: "voiture",
    marque: "Range Rover",
    modele: "Velar",
    portes: 4,
    places: 5,
    carburant: "diesel",
    transmission: "automatique",
    couleur: "Noir",
    immatriculation: "54321-ب-1",
    prix_jour: 1200,
    ville: "Marrakech",
    categorie: "suv_4x4",
    age_minimum: 25,
    anciennete_permis_mois: 36,
    photos: [],
  });

  const yamaha = await creerVehicule({
    proprietaire_id: proprio1Id,
    type: "moto",
    marque: "Yamaha",
    modele: "MT-07",
    places: 2,
    carburant: "essence",
    transmission: "manuelle",
    couleur: "Bleu",
    immatriculation: "99887-د-1",
    prix_jour: 400,
    ville: "Marrakech",
    photos: [],
  });

  const clio = await creerVehicule({
    proprietaire_id: proprio2Id,
    type: "voiture",
    marque: "Renault",
    modele: "Clio",
    portes: 4,
    places: 5,
    carburant: "essence",
    transmission: "manuelle",
    couleur: "Gris",
    immatriculation: "11122-ه-2",
    prix_jour: 220,
    ville: "Casablanca",
    categorie: "economique",
    photos: [],
  });

  const classeC = await creerVehicule({
    proprietaire_id: proprio2Id,
    type: "voiture",
    marque: "Mercedes",
    modele: "Classe C",
    portes: 4,
    places: 5,
    carburant: "diesel",
    transmission: "automatique",
    couleur: "Blanc",
    immatriculation: "33344-و-2",
    prix_jour: 900,
    ville: "Casablanca",
    categorie: "berline_luxe",
    photos: [],
  });

  // ------------------------------------------------------------
  // 4. Réservations (différents statuts pour tester tous les cas)
  // ------------------------------------------------------------
  console.log("\n📅 Création des réservations...");

  function dansNJours(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  async function creerReservation(data) {
    const { error } = await supabase.from("reservations").insert(data);
    if (error) console.error("  ✗ Erreur réservation :", error.message);
    else console.log(`  ✓ Réservation ${data.statut} (${data.source})`);
  }

  await creerReservation({
    vehicule_id: dacia,
    client_id: client1Id,
    proprietaire_id: proprio1Id,
    date_debut: dansNJours(10),
    date_fin: dansNJours(13),
    statut: "en_attente",
    prix_total: 750,
    source: "planclic",
  });

  await creerReservation({
    vehicule_id: rangeRover,
    client_id: client1Id,
    proprietaire_id: proprio1Id,
    date_debut: dansNJours(5),
    date_fin: dansNJours(8),
    statut: "confirmee",
    prix_total: 3600,
    source: "planclic",
  });

  await creerReservation({
    vehicule_id: clio,
    client_id: client2Id,
    proprietaire_id: proprio2Id,
    date_debut: dansNJours(-20),
    date_fin: dansNJours(-17),
    statut: "terminee",
    prix_total: 660,
    source: "planclic",
  });

  await creerReservation({
    vehicule_id: classeC,
    client_id: client2Id,
    proprietaire_id: proprio2Id,
    date_debut: dansNJours(15),
    date_fin: dansNJours(18),
    statut: "refusee",
    prix_total: 2700,
    source: "planclic",
  });

  await creerReservation({
    vehicule_id: yamaha,
    client_id: null,
    proprietaire_id: proprio1Id,
    date_debut: dansNJours(2),
    date_fin: dansNJours(4),
    statut: "confirmee",
    prix_total: 800,
    source: "manuel",
    nom_client_manuel: "Ahmed Manuel",
    telephone_client_manuel: "0666778899",
  });

  // ------------------------------------------------------------
  // 5. Maintenance
  // ------------------------------------------------------------
  console.log("\n🔧 Ajout d'un historique de maintenance...");

  const { error: erreurMaintenance } = await supabase.from("maintenance").insert({
    vehicule_id: dacia,
    proprietaire_id: proprio1Id,
    type: "vidange",
    date_intervention: dansNJours(-30),
    kilometrage: 45000,
    cout: 350,
    description: "Vidange + filtre à huile",
  });
  console.log(erreurMaintenance ? `  ✗ ${erreurMaintenance.message}` : "  ✓ Vidange enregistrée");

  // ------------------------------------------------------------
  // 6. Documents véhicule (une alerte proche, une lointaine)
  // ------------------------------------------------------------
  console.log("\n📄 Ajout des documents véhicule (assurance/contrôle technique)...");

  await supabase.from("documents_vehicule").insert([
    {
      vehicule_id: rangeRover,
      proprietaire_id: proprio1Id,
      type: "assurance",
      date_expiration: dansNJours(15),
    },
    {
      vehicule_id: dacia,
      proprietaire_id: proprio1Id,
      type: "controle_technique",
      date_expiration: dansNJours(200),
    },
  ]);
  console.log("  ✓ 2 documents ajoutés (1 expire bientôt, pour tester l'alerte)");

  // ------------------------------------------------------------
  // 7. Plan Pro pour Atlas Cars
  // ------------------------------------------------------------
  console.log("\n📦 Attribution du plan Pro à Atlas Cars...");

  const { data: planPro } = await supabase.from("plans").select("id").eq("nom", "Pro").single();
  if (planPro) {
    await supabase.from("abonnements").update({ statut: "annule" }).eq("proprietaire_id", proprio1Id).eq("statut", "actif");
    await supabase.from("abonnements").insert({ proprietaire_id: proprio1Id, plan_id: planPro.id });
    console.log("  ✓ Atlas Cars passé en plan Pro (véhicules illimités + statistiques)");
  } else {
    console.log("  ⚠ Plan 'Pro' introuvable — exécute d'abord la migration 13_saas_plans.sql");
  }

  // ------------------------------------------------------------
  // Résumé final
  // ------------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("✅ Remplissage terminé ! Comptes de test (mot de passe pour tous : " + MOT_DE_PASSE_TEST + ")");
  console.log("=".repeat(60));
  console.log(`
  admin@planclic.test       → admin (accès /admin/*)
  client1@planclic.test     → client (a une demande en attente + une confirmée)
  client2@planclic.test     → client (a une réservation terminée + une refusée)
  proprio1@planclic.test    → Atlas Cars, Marrakech, VÉRIFIÉ, plan Pro
  proprio2@planclic.test    → Casa Location, Casablanca, VÉRIFIÉ, plan Basique
  proprio3@planclic.test    → Fes Auto, Fès, EN ATTENTE (teste /admin/verifications)
  `);
  console.log("⚠️  N'oublie pas de retirer SUPABASE_SERVICE_ROLE_KEY de .env.local une fois fini si tu ne t'en sers pas ailleurs.");
}

main().catch((e) => {
  console.error("\n❌ Erreur pendant le seed :", e);
  process.exit(1);
});
