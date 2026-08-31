import Link from "next/link";
import { Plus, Car, Wrench, TrendingUp, FilePlus2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import EmptyState from "@/components/ui/EmptyState";
import MenuActionsVehicule from "@/components/proprietaire/MenuActionsVehicule";

export default async function VehiculesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id: pid } = await resoudreProprietaireId(user!.id);

  const { data: proprietaire } = await supabase
    .from("proprietaires")
    .select("statut_verification")
    .eq("id", pid)
    .single();

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("*")
    .eq("proprietaire_id", pid)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: reservationsTerminees } = await supabase
    .from("reservations")
    .select("vehicule_id, prix_total")
    .eq("proprietaire_id", pid)
    .eq("statut", "terminee");

  const revenuParVehicule = new Map<string, number>();
  (reservationsTerminees ?? []).forEach((r) => {
    revenuParVehicule.set(
      r.vehicule_id,
      (revenuParVehicule.get(r.vehicule_id) ?? 0) + (r.prix_total ?? 0)
    );
  });

  // Dernier entretien connu par véhicule (donnée réelle uniquement,
  // pas de "prochain entretien" prédit puisqu'on n'a pas cette info).
  const idsVehicules = (vehicules ?? []).map((v) => v.id);
  const { data: dernieresMaintenances } = idsVehicules.length
    ? await supabase
        .from("maintenance")
        .select("vehicule_id, date_intervention")
        .in("vehicule_id", idsVehicules)
        .order("date_intervention", { ascending: false })
    : { data: [] };

  const dernierEntretienParVehicule = new Map<string, string>();
  (dernieresMaintenances ?? []).forEach((m) => {
    if (!dernierEntretienParVehicule.has(m.vehicule_id)) {
      dernierEntretienParVehicule.set(m.vehicule_id, m.date_intervention);
    }
  });

  const verifie = proprietaire?.statut_verification === "verifie";

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">Ma Flotte</h1>
          <p className="mt-1 text-sm text-dash-text-secondary">
            {vehicules?.length ?? 0} véhicule(s) publié(s)
          </p>
        </div>

        {verifie ? (
          <Link
            href="/proprietaire/vehicules/nouveau"
            className="inline-flex items-center gap-1.5 rounded-lg bg-dash-accent px-5 py-2.5 text-sm font-semibold text-dash-text shadow transition hover:brightness-95"
          >
            <Plus size={16} strokeWidth={2} />
            Ajouter un véhicule
          </Link>
        ) : (
          <span
            title="Disponible une fois votre compte vérifié"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-400"
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-dash-accent px-5 py-2.5 text-sm font-semibold text-dash-text"
              >
                <Plus size={16} strokeWidth={2} />
                Ajouter un véhicule
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {vehicules.map((v) => {
            const revenu = revenuParVehicule.get(v.id) ?? 0;
            const dernierEntretien = dernierEntretienParVehicule.get(v.id);
            return (
              <div
                key={v.id}
                className="group flex items-center gap-4 rounded-xl border border-white/30 bg-white p-3 shadow-[0px_4px_20px_rgba(18,53,68,0.05)] transition-shadow hover:shadow-[0px_8px_24px_rgba(18,53,68,0.1)] sm:gap-6 sm:p-4"
              >
                {/* Photo */}
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-[#eeeeef] sm:h-24 sm:w-32">
                  {v.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.photos[0]}
                      alt={`${v.marque} ${v.modele}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car size={28} strokeWidth={1.25} className="text-dash-dark/30" />
                    </div>
                  )}
                </div>

                {/* Infos principales */}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/proprietaire/vehicules/${v.id}`}
                    className="truncate text-lg font-semibold text-dash-text hover:text-dash-dark hover:underline sm:text-xl"
                  >
                    {v.marque} {v.modele}
                  </Link>
                  <p className="font-mono text-xs text-dash-text-secondary sm:text-sm">
                    {v.immatriculation}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {revenu > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-[#006c4a]">
                        <TrendingUp size={12} strokeWidth={2} />
                        {revenu.toLocaleString("fr-FR")} MAD générés
                      </span>
                    )}
                    {dernierEntretien && (
                      <span className="hidden items-center gap-1 text-xs text-dash-text-secondary sm:flex">
                        <Wrench size={12} strokeWidth={1.75} />
                        Entretien : {dernierEntretien}
                      </span>
                    )}
                  </div>
                </div>

                {/* Statut + prix */}
                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${
                      v.statut === "actif"
                        ? "border-dash-accent/30 bg-dash-accent/20 text-[#7b5900]"
                        : "border-gray-300 bg-gray-50 text-gray-500"
                    }`}
                  >
                    {v.statut === "actif" ? "Disponible" : "Inactif"}
                  </span>
                  <p className="text-lg font-semibold text-dash-dark">
                    {v.prix_jour}
                    <span className="text-sm font-normal text-dash-text-secondary"> DH/j</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/proprietaire/bloquer?vehicule=${v.id}`}
                    title="Enregistrer une location pour ce véhicule"
                    className="flex items-center gap-1.5 rounded-lg bg-dash-accent px-3 py-2 text-sm font-bold text-dash-text shadow-sm transition hover:brightness-95"
                  >
                    <FilePlus2 size={14} strokeWidth={2.5} />
                    <span className="hidden lg:inline">Nouvelle location</span>
                  </Link>
                  <Link
                    href={`/proprietaire/vehicules/${v.id}`}
                    className="rounded-lg border border-dash-border px-4 py-2 text-sm font-medium text-dash-text-secondary transition hover:border-dash-dark/30 hover:bg-gray-50 hover:text-dash-dark"
                  >
                    Voir
                  </Link>
                  <Link
                    href={`/proprietaire/vehicules/${v.id}/modifier`}
                    className="hidden rounded-lg border border-dash-border px-4 py-2 text-sm font-medium text-dash-text-secondary transition hover:border-dash-dark/30 hover:bg-gray-50 hover:text-dash-dark sm:block"
                  >
                    Modifier
                  </Link>
                  <MenuActionsVehicule vehiculeId={v.id} statut={v.statut} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
