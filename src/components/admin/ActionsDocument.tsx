"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { validerDocument } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

export default function ActionsDocument({ documentId }: { documentId: string }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function decider(decision: "valide" | "rejete") {
    startTransition(async () => {
      try {
        await validerDocument(documentId, decision);
        toast.success(decision === "valide" ? "Document approuvé." : "Document rejeté.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => decider("valide")}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-dash-sidebar px-3 py-2 text-xs font-semibold text-dash-muted transition hover:opacity-90 disabled:opacity-50"
      >
        <Check size={13} strokeWidth={2} />
        Approuvé
      </button>
      <button
        disabled={isPending}
        onClick={() => decider("rejete")}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dash-border px-3 py-2 text-xs font-medium text-dash-text-secondary transition hover:bg-gray-50 disabled:opacity-50"
      >
        <X size={13} strokeWidth={2} />
        Rejeté
      </button>
    </div>
  );
}
