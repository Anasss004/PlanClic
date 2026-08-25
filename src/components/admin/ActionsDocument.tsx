"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { validerDocument } from "@/app/actions/admin";

export default function ActionsDocument({ documentId }: { documentId: string }) {
  const [isPending, startTransition] = useTransition();

  function decider(decision: "valide" | "rejete") {
    startTransition(async () => {
      try {
        await validerDocument(documentId, decision);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => decider("valide")}
        className="flex items-center gap-1.5 rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        <Check size={13} strokeWidth={2} />
        Valider
      </button>
      <button
        disabled={isPending}
        onClick={() => decider("rejete")}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
      >
        <X size={13} strokeWidth={2} />
        Rejeter
      </button>
    </div>
  );
}
