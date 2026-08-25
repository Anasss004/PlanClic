import Link from "next/link";
import { Plus, Car, Fuel, Gauge, Users, DoorOpen, TrendingUp, ArrowRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import MenuActionsVehicule from "@/components/proprietaire/MenuActionsVehicule";

export default async function VehiculesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: proprietaire } = await supabase
    .from("proprietaires")
    .select("statut_verification")
    .eq("id", user!.id)
    .single();

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("*")
    .eq("proprietaire_id", user!.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Revenu généré par véhicule (réservations terminées) — calculé en
  // une seule requête groupée côté client plutôt qu'une requête par
  // véhicule.
  const { data: reservationsTerminees } = await supabase
    .from("reservations")
    .select("vehicule_id, prix_total")
    .eq("proprietaire_id", user!.id)
    .eq("statut", "terminee");

  const revenuParVehicule = new Map<string, number>();
  (reservationsTerminees ?? []).forEach((r) => {
    revenuParVehicule.set(
      r.vehicule_id,
      (revenuParVehicule.get(r.vehicule_id) ?? 0) + (r.prix_total ?? 0)
    );
  });

  const verifie = proprietaire?.statut_verification === "verifie";

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Mes véhicules
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {vehicules?.length ?? 0} véhicule(s) publié(s)
          </p>
        </div>

        {verifie ? (
          <Link
            href="/proprietaire/vehicules/nouveau"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-dark transition-all duration-200 hover:brightness-95 active:scale-95"
          >
            <Plus size={16} strokeWidth={2} />
            Ajouter un véhicule
          </Link>
        ) : (
          <span
            title="Disponible une fois votre compte vérifié"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-400"
          >
            <Plus size={16} strokeWidth={2} />
            Ajouter un véhicule
          </span>
        )}
      </div>

      {!vehicules || vehicules.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule publié"
          description="Ajoutez votre premier véhicule pour commencer à recevoir des demandes."
          action={
            verifie ? (
              <Link
                href="/proprietaire/vehicules/nouveau"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-dark"
              >
                <Plus size={16} strokeWidth={2} />
                Ajouter un véhicule
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicules.map((v) => {
            const revenu = revenuParVehicule.get(v.id) ?? 0;
            return (
              <div
                key={v.id}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Photo */}
                <div className="relative h-40 overflow-hidden bg-brand-light/25">
                  {v.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.photos[0]}
                      alt={`${v.marque} ${v.modele}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car size={36} strokeWidth={1.25} className="text-brand-dark/40" />
                    </div>
                  )}
                  <div className="absolute right-3 top-3">
                    <Badge variant={v.statut === "actif" ? "success" : "neutral"}>
                      {v.statut === "actif" ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-brand-dark">
                        {v.marque} {v.modele}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={11} strokeWidth={1.75} />
                        {v.ville}
                      </p>
                    </div>
                    <MenuActionsVehicule vehiculeId={v.id} statut={v.statut} />
                  </div>

                  {/* Caractéristiques */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {v.carburant && (
                      <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600">
                        <Fuel size={11} strokeWidth={1.75} /> {v.carburant}
                      </span>
                    )}
                    {v.transmission && (
                      <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600">
                        <Gauge size={11} strokeWidth={1.75} />
                        {v.transmission === "automatique" ? "Automatique" : "Manuelle"}
                      </span>
                    )}
                    {v.places && (
                      <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600">
                        <Users size={11} strokeWidth={1.75} /> {v.places}
                      </span>
                    )}
                    {v.portes && (
                      <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600">
                        <DoorOpen size={11} strokeWidth={1.75} /> {v.portes}
                      </span>
                    )}
                  </div>

                  {/* Prix + revenu */}
                  <div className="mb-4 flex items-center justify-between border-t border-gray-50 pt-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {v.prix_jour}
                      <span className="font-normal text-gray-400"> MAD/jour</span>
                    </p>
                    {revenu > 0 && (
                      <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <TrendingUp size={12} strokeWidth={2} />
                        {revenu.toLocaleString("fr-FR")} MAD générés
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/proprietaire/vehicules/${v.id}`}
                    className="flex items-center justify-center gap-1.5 rounded-full border border-gray-200 py-2 text-sm font-medium text-brand-dark transition-all duration-200 hover:border-brand-dark hover:bg-brand-dark hover:text-white"
                  >
                    Voir les détails
                    <ArrowRight size={14} strokeWidth={2} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
