"use client";

import { useTransition } from "react";
import { Check, X, ExternalLink } from "lucide-react";
import { validerProprietaire, obtenirUrlDocumentSigne } from "@/app/actions/admin";

export default function ActionsVerificationProprietaire({
  proprietaireId,
}: {
  proprietaireId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function decider(decision: "verifie" | "rejete") {
    startTransition(async () => {
      try {
        await validerProprietaire(proprietaireId, decision);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => decider("verifie")}
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

export function VoirDocument({ storagePath }: { storagePath: string }) {
  async function ouvrir() {
    try {
      const url = await obtenirUrlDocumentSigne(storagePath);
      window.open(url, "_blank");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Impossible d'ouvrir le document.");
    }
  }

  return (
    <button
      onClick={ouvrir}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
    >
      <ExternalLink size={13} strokeWidth={1.75} />
      Voir le document
    </button>
  );
}
