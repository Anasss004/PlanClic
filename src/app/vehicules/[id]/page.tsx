import { Car, Bike, Truck, MapPin, Fuel, Gauge, Users, DoorOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { creerReservation } from "@/app/actions/client";

const ICONES_TYPE = { voiture: Car, moto: Bike, utilitaire: Truck } as const;

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

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Photo */}
          <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-brand-light/25 md:h-full">
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

          {/* Infos + réservation */}
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">
              {vehicule.marque} {vehicule.modele}
            </h1>
            <p className="mb-1 flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={14} strokeWidth={1.75} />
              {vehicule.ville}
            </p>
            {proprietaire && (
              <p className="mb-4 text-sm text-gray-500">
                Proposé par <span className="font-medium text-brand-dark">{proprietaire.nom_entreprise}</span>
              </p>
            )}

            <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600">
              {vehicule.carburant && (
                <span className="flex items-center gap-1.5">
                  <Fuel size={15} strokeWidth={1.75} /> {vehicule.carburant}
                </span>
              )}
              {vehicule.transmission && (
                <span className="flex items-center gap-1.5">
                  <Gauge size={15} strokeWidth={1.75} /> {vehicule.transmission}
                </span>
              )}
              {vehicule.places && (
                <span className="flex items-center gap-1.5">
                  <Users size={15} strokeWidth={1.75} /> {vehicule.places} places
                </span>
              )}
              {vehicule.portes && (
                <span className="flex items-center gap-1.5">
                  <DoorOpen size={15} strokeWidth={1.75} /> {vehicule.portes} portes
                </span>
              )}
            </div>

            <p className="mb-6 text-2xl font-bold text-brand-dark">
              {vehicule.prix_jour} <span className="text-base font-normal text-gray-400">MAD/jour</span>
            </p>

            {sp.erreur && (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {ERREURS[sp.erreur] ?? "Une erreur est survenue."}
              </p>
            )}

            <form
              action={creerReservation}
              className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <input type="hidden" name="vehicule_id" value={vehicule.id} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Date de départ
                  </label>
                  <input
                    type="date"
                    name="date_debut"
                    defaultValue={sp.date_debut}
                    required
                    className="w-full rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-dark"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Date de retour
                  </label>
                  <input
                    type="date"
                    name="date_fin"
                    defaultValue={sp.date_fin}
                    required
                    className="w-full rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-dark"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition-all duration-200 hover:brightness-95 active:scale-[0.98]"
              >
                Envoyer une demande de réservation
              </button>
              <p className="text-center text-xs text-gray-400">
                Le propriétaire doit accepter ta demande avant confirmation.
              </p>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
