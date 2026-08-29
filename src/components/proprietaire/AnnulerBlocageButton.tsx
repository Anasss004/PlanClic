"use client";

import { useTransition } from "react";
import { annulerBlocage } from "@/app/actions/proprietaire";
import { useToast } from "@/components/ui/Toast";

export default function AnnulerBlocageButton({
  reservationId,
  vehiculeId,
}: {
  reservationId: string;
  vehiculeId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function annuler() {
    if (!confirm("Débloquer ces dates ?")) return;
    startTransition(async () => {
      try {
        await annulerBlocage(reservationId, vehiculeId);
        toast.success("Blocage annulé.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={annuler}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
    >
      Débloquer
    </button>
  );
}
