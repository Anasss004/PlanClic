"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, FlagOff } from "lucide-react";
import { traiterReservation } from "@/app/actions/proprietaire";
import { useToast } from "@/components/ui/Toast";

const LABELS_SUCCES: Record<string, string> = {
  confirmee: "Réservation acceptée.",
  refusee: "Réservation refusée.",
  terminee: "Réservation marquée comme terminée.",
};

export default function ActionsReservation({
  reservationId,
  statut,
}: {
  reservationId: string;
  statut: string;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function agir(nouveauStatut: "confirmee" | "refusee" | "terminee") {
    // "Terminée" : action à risque -> délai de grâce de 5 s (undo).
    if (nouveauStatut === "terminee") {
      toast.undoable(
        LABELS_SUCCES.terminee,
        async () => {
          try {
            await traiterReservation(reservationId, "terminee");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Action impossible.");
          }
        },
        { onCancel: () => toast.info("Annulé.") }
      );
      return;
    }

    startTransition(async () => {
      try {
        await traiterReservation(reservationId, nouveauStatut);
        toast.success(LABELS_SUCCES[nouveauStatut]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue.");
      }
    });
  }

  if (statut === "en_attente") {
    return (
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => agir("confirmee")}
          className="flex items-center gap-1.5 rounded-lg bg-dash-sidebar px-4 py-2.5 text-xs font-semibold text-dash-muted transition hover:opacity-90 disabled:opacity-50"
        >
          <Check size={13} strokeWidth={2} />
          Accepter
        </button>
        <button
          disabled={isPending}
          onClick={() => agir("refusee")}
          className="flex items-center gap-1.5 rounded-lg border border-dash-border px-4 py-2.5 text-xs font-medium text-dash-text-secondary transition hover:bg-gray-50 disabled:opacity-50"
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
        className="flex items-center gap-1.5 rounded-lg border border-dash-border px-4 py-2.5 text-xs font-medium text-dash-text-secondary transition hover:bg-gray-50 disabled:opacity-50"
      >
        <FlagOff size={13} strokeWidth={2} />
        Marquer terminée
      </button>
    );
  }

  return null;
}
