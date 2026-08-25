import { Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Footer from "@/components/Footer";
import EmptyState from "@/components/ui/EmptyState";
import Reveal from "@/components/motion/Reveal";
import VehicleResultCard from "@/components/VehicleResultCard";
import EnTeteRecherche from "@/components/recherche/EnTeteRecherche";
import PanneauCarte from "@/components/recherche/PanneauCarte";

const LABELS_TYPE: Record<string, string> = {
  voiture: "Voiture",
  moto: "Moto",
  utilitaire: "Utilitaire",
};

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    ville?: string;
    date_debut?: string;
    date_fin?: string;
    transmission?: string;
    carburant?: string;
    passagers_min?: string;
    prix_max?: string;
  }>;
}) {
  const params = await searchParams;
  const {
    type,
    ville,
    date_debut,
    date_fin,
    transmission,
    carburant,
    passagers_min,
    prix_max,
  } = params;

  const supabase = await createClient();

  // Profil connecté (pour le header) — même logique que le Header global.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let profile: { prenom: string; nom: string; role: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("prenom, nom, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // 1. Véhicules correspondant aux critères (vue publique : uniquement
  // actifs, agences vérifiées, sans immatriculation).
  let requete = supabase.from("vehicules_recherche").select("*");
  if (type) requete = requete.eq("type", type);
  if (ville) requete = requete.eq("ville", ville);
  if (transmission) requete = requete.eq("transmission", transmission);
  if (carburant) requete = requete.eq("carburant", carburant);
  if (passagers_min) requete = requete.gte("places", Number(passagers_min));
  if (prix_max) requete = requete.lte("prix_jour", Number(prix_max));

  const { data: vehiculesCorrespondants } = await requete;

  // 2. Exclusion des véhicules déjà réservés (confirmés) sur la
  // période demandée — vraie vérification de disponibilité.
  let vehiculesDisponibles = vehiculesCorrespondants ?? [];

  if (date_debut && date_fin && vehiculesDisponibles.length > 0) {
    const idsVehicules = vehiculesDisponibles.map((v) => v.id);

    const { data: reservationsConflit } = await supabase
      .from("reservations")
      .select("vehicule_id")
      .in("vehicule_id", idsVehicules)
      .eq("statut", "confirmee")
      .lte("date_debut", date_fin)
      .gte("date_fin", date_debut);

    const idsIndisponibles = new Set(
      (reservationsConflit ?? []).map((r) => r.vehicule_id)
    );

    vehiculesDisponibles = vehiculesDisponibles.filter(
      (v) => !idsIndisponibles.has(v.id)
    );
  }

  // 3. Noms des agences (requête séparée — vue publique dédiée).
  const idsProprietaires = [
    ...new Set(vehiculesDisponibles.map((v) => v.proprietaire_id)),
  ];
  const { data: agences } = idsProprietaires.length
    ? await supabase
        .from("proprietaires_public")
        .select("id, nom_entreprise")
        .in("id", idsProprietaires)
    : { data: [] };
  const agenceParId = new Map((agences ?? []).map((a) => [a.id, a.nom_entreprise]));

  const nbJours =
    date_debut && date_fin
      ? Math.max(
          1,
          Math.round(
            (new Date(date_fin).getTime() - new Date(date_debut).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <>
      <EnTeteRecherche
        profile={profile}
        ville={ville}
        dateDebut={date_debut}
        dateFin={date_fin}
        type={type}
        transmission={transmission}
        carburant={carburant}
        passagersMin={passagers_min}
        prixMax={prix_max}
      />

      <main className="mx-auto w-full max-w-[1280px] flex-1 bg-[#f4f7f8] px-6 py-6">
        <p className="mb-2 text-xs text-brand-dark/70">
          Maroc {ville ? `> ${ville}` : ""} {type ? `> ${LABELS_TYPE[type] ?? type}` : ""}
        </p>

        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          {vehiculesDisponibles.length} offre{vehiculesDisponibles.length > 1 ? "s" : ""} trouvée{vehiculesDisponibles.length > 1 ? "s" : ""}
        </h1>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Liste des résultats */}
          <div>
            {vehiculesDisponibles.length === 0 ? (
              <EmptyState
                icon={Car}
                title="Aucun véhicule disponible"
                description="Essaie une autre ville, un autre type de véhicule ou d'autres filtres."
              />
            ) : (
              <div className="space-y-4">
                {vehiculesDisponibles.map((v, i) => (
                  <Reveal key={v.id} delay={i * 50}>
                    <VehicleResultCard
                      vehicule={v}
                      nomAgence={agenceParId.get(v.proprietaire_id)}
                      nbJours={nbJours}
                      query={query}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </div>

          <PanneauCarte ville={ville} />
        </div>
      </main>
      <Footer />
    </>
  );
}
