import Link from "next/link";
import { Plus, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import EmptyState from "@/components/ui/EmptyState";
import ListeVehicules from "@/components/proprietaire/ListeVehicules";

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

  const revenus: Record<string, number> = {};
  (reservationsTerminees ?? []).forEach((r) => {
    revenus[r.vehicule_id] = (revenus[r.vehicule_id] ?? 0) + (r.prix_total ?? 0);
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

  const derniersEntretiens: Record<string, string> = {};
  (dernieresMaintenances ?? []).forEach((m) => {
    if (!derniersEntretiens[m.vehicule_id]) {
      derniersEntretiens[m.vehicule_id] = m.date_intervention;
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
        <ListeVehicules
          vehicules={vehicules}
          revenus={revenus}
          derniersEntretiens={derniersEntretiens}
        />
      )}
    </div>
  );
}
