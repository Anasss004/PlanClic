import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ActionsReservation from "@/components/proprietaire/ActionsReservation";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

const STATUTS: Record<string, { label: string; variant: "warning" | "success" | "danger" | "info" | "neutral" }> = {
  en_attente: { label: "En attente", variant: "warning" },
  confirmee: { label: "Confirmée", variant: "success" },
  refusee: { label: "Refusée", variant: "danger" },
  annulee: { label: "Annulée", variant: "neutral" },
  terminee: { label: "Terminée", variant: "info" },
};

export default async function ReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, date_debut, date_fin, statut, prix_total, vehicule_id, client_id, vehicules(marque, modele), profiles(prenom, nom)")
    .eq("proprietaire_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Réservations
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {reservations?.length ?? 0} réservation(s) au total
        </p>
      </div>

      {!reservations || reservations.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune réservation"
          description="Les demandes de réservation de vos véhicules apparaîtront ici."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {reservations.map((r, i) => {
            const statut = STATUTS[r.statut] ?? { label: r.statut, variant: "neutral" as const };
            return (
              <div
                key={r.id}
                className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                  i !== 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {/* @ts-expect-error - relation typing simplifié */}
                    {r.vehicules?.marque} {r.vehicules?.modele}
                  </p>
                  <p className="text-xs text-gray-500">
                    {/* @ts-expect-error - relation typing simplifié */}
                    {r.profiles?.prenom} {r.profiles?.nom} · {r.date_debut} → {r.date_fin}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={statut.variant}>{statut.label}</Badge>
                  <ActionsReservation reservationId={r.id} statut={r.statut} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
