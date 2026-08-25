import Link from "next/link";
import { Car, Bike, Truck, MapPin, Gauge, Fuel, Check, Star } from "lucide-react";

const ICONES_TYPE = { voiture: Car, moto: Bike, utilitaire: Truck } as const;

type Vehicule = {
  id: string;
  type: string;
  marque: string;
  modele: string;
  portes: number | null;
  places: number | null;
  carburant: string | null;
  transmission: string | null;
  prix_jour: number;
  ville: string;
  photos: string[] | null;
  km_inclus_jour: number | null;
  age_minimum: number | null;
  anciennete_permis_mois: number | null;
};

export default function VehicleResultCard({
  vehicule,
  nomAgence,
  nbJours,
  query,
}: {
  vehicule: Vehicule;
  nomAgence?: string;
  nbJours: number | null;
  query: string;
}) {
  const Icon = ICONES_TYPE[vehicule.type as keyof typeof ICONES_TYPE] ?? Car;
  const total = nbJours ? Math.round(nbJours * vehicule.prix_jour) : null;

  const conditions = [
    vehicule.km_inclus_jour ? `${vehicule.km_inclus_jour} km/Jr` : null,
    vehicule.carburant,
    vehicule.anciennete_permis_mois
      ? `Dès ${Math.round(vehicule.anciennete_permis_mois / 12) || 1} an${
          vehicule.anciennete_permis_mois >= 24 ? "s" : ""
        } de permis`
      : null,
    vehicule.age_minimum ? `Dès ${vehicule.age_minimum} ans` : null,
  ].filter(Boolean) as string[];

  return (
    <Link
      href={`/vehicules/${vehicule.id}${query ? `?${query}` : ""}`}
      className="group flex overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Photo */}
      <div className="relative w-[160px] shrink-0 overflow-hidden bg-brand-light/25 sm:w-[200px]">
        {vehicule.photos?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicule.photos[0]}
            alt={`${vehicule.marque} ${vehicule.modele}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon size={32} strokeWidth={1.25} className="text-brand-dark/40" />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col justify-between gap-3 border-l border-gray-100 p-4 sm:flex-row sm:gap-4">
        {/* Colonne infos véhicule */}
        <div className="min-w-0">
          <p className="text-base font-bold text-brand-dark">
            {vehicule.marque} {vehicule.modele}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {vehicule.places && (
              <span className="rounded-full border border-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
                {vehicule.places} places
              </span>
            )}
            {vehicule.portes && (
              <span className="rounded-full border border-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
                {vehicule.portes} portes
              </span>
            )}
            {vehicule.transmission && (
              <span className="flex items-center gap-1 rounded-full border border-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
                <Gauge size={10} strokeWidth={2} />
                {vehicule.transmission === "automatique" ? "Automatique" : "Manuelle"}
              </span>
            )}
          </div>

          {conditions.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-brand-dark">
              {conditions.map((c) => (
                <span key={c} className="flex items-center gap-1.5">
                  {c === vehicule.carburant ? (
                    <Fuel size={13} strokeWidth={1.75} />
                  ) : (
                    <Check size={13} strokeWidth={2} />
                  )}
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Colonne agence + prix */}
        <div className="flex shrink-0 flex-row items-end justify-between gap-3 border-t border-gray-100 pt-3 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="text-right">
            {nomAgence && (
              <p className="text-xs font-semibold text-brand-dark">{nomAgence}</p>
            )}
            <p className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-500">
              <MapPin size={11} strokeWidth={1.75} />
              {vehicule.ville}
            </p>
          </div>

          <div className="text-right">
            <p className="text-base font-bold text-brand-dark">
              {vehicule.prix_jour}
              <span className="text-[10px] font-normal text-gray-400"> MAD/Jr</span>
            </p>
            {total && (
              <p className="text-[11px] text-gray-400">
                Total {total.toLocaleString("fr-FR")} MAD
              </p>
            )}
            <span className="mt-2 inline-block rounded-full bg-brand-accent px-4 py-1.5 text-xs font-semibold text-brand-dark shadow transition-all group-hover:brightness-95">
              Sélectionner
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
