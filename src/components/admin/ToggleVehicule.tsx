"use client";

import { useTransition } from "react";
import { changerStatutVehicule } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

export default function ToggleVehicule({
  vehiculeId,
  statutActuel,
}: {
  vehiculeId: string;
  statutActuel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function basculer() {
    const nouveau = statutActuel === "actif" ? "inactif" : "actif";
    startTransition(async () => {
      try {
        await changerStatutVehicule(vehiculeId, nouveau);
        toast.success(nouveau === "actif" ? "Véhicule réactivé." : "Véhicule désactivé.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={basculer}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
    >
      {statutActuel === "actif" ? "Désactiver" : "Réactiver"}
    </button>
  );
}
