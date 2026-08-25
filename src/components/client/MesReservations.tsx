"use client";

import { useTransition } from "react";
import { ClipboardList } from "lucide-react";
import { annulerReservation } from "@/app/actions/client";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

const STATUTS: Record<string, { label: string; variant: "warning" | "success" | "danger" | "info" | "neutral" }> = {
  en_attente: { label: "En attente", variant: "warning" },
  confirmee: { label: "Confirmée", variant: "success" },
  refusee: { label: "Refusée", variant: "danger" },
  annulee: { label: "Annulée", variant: "neutral" },
  terminee: { label: "Terminée", variant: "info" },
};

export default function MesReservations({ reservations }: { reservations: any[] }) {
  const [isPending, startTransition] = useTransition();

  function annuler(id: string) {
    if (!confirm("Annuler cette demande de réservation ?")) return;
    startTransition(async () => {
      try {
        await annulerReservation(id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Une erreur est survenue.");
      }
    });
  }

  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Aucune réservation"
        description="Vos demandes de réservation apparaîtront ici une fois que vous aurez réservé un véhicule."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {reservations.map((r, i) => {
        const statut = STATUTS[r.statut] ?? { label: r.statut, variant: "neutral" as const };
        return (
          <div
            key={r.id}
            className={`flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
              i !== 0 ? "border-t border-gray-100" : ""
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {r.vehicules?.marque} {r.vehicules?.modele}
              </p>
              <p className="text-xs text-gray-500">
                {r.proprietaires?.nom_entreprise} · {r.date_debut} → {r.date_fin}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={statut.variant}>{statut.label}</Badge>
              {r.statut === "en_attente" && (
                <button
                  disabled={isPending}
                  onClick={() => annuler(r.id)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
