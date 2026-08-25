import { Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import ToggleVehicule from "@/components/admin/ToggleVehicule";

export default async function AdminVehiculesPage() {
  const supabase = await createClient();

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id, marque, modele, ville, prix_jour, statut, proprietaires(nom_entreprise)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Véhicules
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {vehicules?.length ?? 0} véhicule(s) publié(s) sur la plateforme.
        </p>
      </div>

      {!vehicules || vehicules.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule"
          description="Les véhicules publiés par les propriétaires apparaîtront ici."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {vehicules.map((v, i) => (
            <div
              key={v.id}
              className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                i !== 0 ? "border-t border-gray-100" : ""
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {v.marque} {v.modele}
                </p>
                <p className="text-xs text-gray-500">
                  {/* @ts-expect-error - relation typing simplifié */}
                  {v.proprietaires?.nom_entreprise} · {v.ville} · {v.prix_jour} MAD/jour
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={v.statut === "actif" ? "success" : "neutral"}>
                  {v.statut === "actif" ? "Actif" : "Inactif"}
                </Badge>
                <ToggleVehicule vehiculeId={v.id} statutActuel={v.statut} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
