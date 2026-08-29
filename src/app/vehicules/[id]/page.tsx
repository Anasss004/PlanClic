import { Car, Bike, Truck, MapPin, Fuel, Gauge, Users, DoorOpen, ShieldCheck, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/motion/Reveal";
import FormulaireReservation from "@/components/ReservationForm";

const ICONES_TYPE = { voiture: Car, moto: Bike, utilitaire: Truck } as const;

const LABELS_TYPE: Record<string, string> = {
  voiture: "Voiture",
  moto: "Moto",
  utilitaire: "Utilitaire",
};

const ERREURS: Record<string, string> = {
  "reserve-aux-clients": "Seuls les comptes clients peuvent réserver un véhicule.",
  "vehicule-introuvable": "Ce véhicule n'est plus disponible.",
  "reservation-impossible": "Impossible d'envoyer la demande. Réessaie.",
};

export default async function VehiculeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date_debut?: string; date_fin?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();

  const { data: vehicule } = await supabase
    .from("vehicules_recherche")
    .select("*")
    .eq("id", id)
    .single();

  const { data: proprietaire } = vehicule
    ? await supabase
        .from("proprietaires_public")
        .select("nom_entreprise, ville")
        .eq("id", vehicule.proprietaire_id)
        .single()
    : { data: null };

  if (!vehicule) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl flex-1 px-6 py-16 text-center">
          <p className="text-gray-500">Ce véhicule n&apos;existe pas ou n&apos;est plus disponible.</p>
        </main>
        <Footer />
      </>
    );
  }

  const Icon = ICONES_TYPE[vehicule.type as keyof typeof ICONES_TYPE] ?? Car;

  const conditions = [
    vehicule.km_inclus_jour ? `${vehicule.km_inclus_jour} km/jour inclus` : null,
    vehicule.anciennete_permis_mois
      ? `Permis depuis ${Math.max(1, Math.round(vehicule.anciennete_permis_mois / 12))} an(s) minimum`
      : null,
    vehicule.age_minimum ? `Âge minimum ${vehicule.age_minimum} ans` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {/* Fil d'Ariane */}
        <p className="mb-4 flex items-center gap-1.5 text-xs text-brand-dark/70">
          <MapPin size={13} strokeWidth={1.75} />
          Maroc {vehicule.ville ? `> ${vehicule.ville}` : ""} {vehicule.type ? `> ${LABELS_TYPE[vehicule.type] ?? vehicule.type}` : ""}
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Photo */}
          <Reveal>
            <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-brand-light/25 md:h-full md:min-h-[420px]">
              {vehicule.photos?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vehicule.photos[0]}
                  alt={`${vehicule.marque} ${vehicule.modele}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon size={56} strokeWidth={1.25} className="text-brand-dark/40" />
              )}
            </div>
          </Reveal>

          {/* Infos + réservation */}
          <Reveal delay={100}>
            <h1 className="text-2xl font-bold text-brand-dark">
              {vehicule.marque} {vehicule.modele}
            </h1>
            <div className="mb-4 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin size={14} strokeWidth={1.75} />
                {vehicule.ville}
              </span>
              {proprietaire && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>
                    Proposé par <span className="font-medium text-brand-dark">{proprietaire.nom_entreprise}</span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <ShieldCheck size={12} strokeWidth={2} />
                    Agence vérifiée
                  </span>
                </>
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {vehicule.carburant && (
                <span className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
                  <Fuel size={14} strokeWidth={1.75} /> {vehicule.carburant}
                </span>
              )}
              {vehicule.transmission && (
                <span className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
                  <Gauge size={14} strokeWidth={1.75} />
                  {vehicule.transmission === "automatique" ? "Automatique" : "Manuelle"}
                </span>
              )}
              {vehicule.places && (
                <span className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
                  <Users size={14} strokeWidth={1.75} /> {vehicule.places} places
                </span>
              )}
              {vehicule.portes && (
                <span className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
                  <DoorOpen size={14} strokeWidth={1.75} /> {vehicule.portes} portes
                </span>
              )}
            </div>

            <p className="mb-4">
              <span className="text-2xl font-bold text-brand-dark">{vehicule.prix_jour}</span>
              <span className="text-base font-normal text-gray-400"> MAD/jour</span>
            </p>

            {conditions.length > 0 && (
              <div className="mb-4 space-y-1.5 rounded-xl bg-gray-50 px-4 py-3">
                {conditions.map((c) => (
                  <p key={c} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check size={14} strokeWidth={2} className="text-emerald-600" />
                    {c}
                  </p>
                ))}
              </div>
            )}

            {sp.erreur && (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {ERREURS[sp.erreur] ?? "Une erreur est survenue."}
              </p>
            )}

            <FormulaireReservation
              vehiculeId={vehicule.id}
              prixJour={vehicule.prix_jour}
              dateDebutInitiale={sp.date_debut}
              dateFinInitiale={sp.date_fin}
            />
          </Reveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
