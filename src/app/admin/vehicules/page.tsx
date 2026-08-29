import { Car, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import ToggleVehicule from "@/components/admin/ToggleVehicule";

export default async function AdminVehiculesPage() {
  const supabase = await createClient();

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id, marque, modele, ville, prix_jour, statut, proprietaire_id, proprietaires(nom_entreprise)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Regroupement par agence (propriétaire)
  const groupes = new Map<
    string,
    { nomEntreprise: string; vehicules: NonNullable<typeof vehicules> }
  >();

  (vehicules ?? []).forEach((v) => {
    const proprietaire = Array.isArray(v.proprietaires) ? v.proprietaires[0] : v.proprietaires;
    const nom = proprietaire?.nom_entreprise ?? "Agence inconnue";
    if (!groupes.has(v.proprietaire_id)) {
      groupes.set(v.proprietaire_id, { nomEntreprise: nom, vehicules: [] });
    }
    groupes.get(v.proprietaire_id)!.vehicules.push(v);
  });

  const agences = Array.from(groupes.values()).sort((a, b) =>
    a.nomEntreprise.localeCompare(b.nomEntreprise)
  );

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">
          Véhicules
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          {vehicules?.length ?? 0} véhicule(s) sur {agences.length} agence(s).
        </p>
      </div>

      {!vehicules || vehicules.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule"
          description="Les véhicules publiés par les propriétaires apparaîtront ici."
        />
      ) : (
        <div className="space-y-6">
          {agences.map((agence) => (
            <div key={agence.nomEntreprise}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <Building2 size={15} strokeWidth={1.75} className="text-dash-text-secondary" />
                <p className="text-sm font-semibold text-dash-dark">{agence.nomEntreprise}</p>
                <span className="text-xs text-dash-text-secondary">
                  ({agence.vehicules.length} véhicule{agence.vehicules.length > 1 ? "s" : ""})
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-dash-border bg-white shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
                {agence.vehicules.map((v, i) => (
                  <div
                    key={v.id}
                    className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                      i !== 0 ? "border-t border-dash-border" : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-dash-text">
                        {v.marque} {v.modele}
                      </p>
                      <p className="text-xs text-dash-text-secondary">
                        {v.ville} · {v.prix_jour} MAD/jour
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}