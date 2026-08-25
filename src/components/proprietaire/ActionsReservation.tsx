"use client";

import { useTransition } from "react";
import { Check, X, FlagOff } from "lucide-react";
import { traiterReservation } from "@/app/actions/proprietaire";

export default function ActionsReservation({
  reservationId,
  statut,
}: {
  reservationId: string;
  statut: string;
}) {
  const [isPending, startTransition] = useTransition();

  function agir(nouveauStatut: "confirmee" | "refusee" | "terminee") {
    startTransition(async () => {
      try {
        await traiterReservation(reservationId, nouveauStatut);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Une erreur est survenue.");
      }
    });
  }

  if (statut === "en_attente") {
    return (
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => agir("confirmee")}
          className="flex items-center gap-1.5 rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <Check size={13} strokeWidth={2} />
          Accepter
        </button>
        <button
          disabled={isPending}
          onClick={() => agir("refusee")}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <X size={13} strokeWidth={2} />
          Refuser
        </button>
      </div>
    );
  }

  if (statut === "confirmee") {
    return (
      <button
        disabled={isPending}
        onClick={() => agir("terminee")}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
      >
        <FlagOff size={13} strokeWidth={2} />
        Marquer terminée
      </button>
    );
  }

  return null;
}
