"use client";

import { useTransition } from "react";
import { Check, X, ExternalLink } from "lucide-react";
import { validerProprietaire, obtenirUrlDocumentSigne } from "@/app/actions/admin";
import { redirigerFenetre } from "@/lib/fenetre";
import { useToast } from "@/components/ui/Toast";

export default function ActionsVerificationProprietaire({
  proprietaireId,
}: {
  proprietaireId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function decider(decision: "verifie" | "rejete") {
    startTransition(async () => {
      try {
        await validerProprietaire(proprietaireId, decision);
        toast.success(decision === "verifie" ? "Compte validé." : "Compte rejeté.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => decider("verifie")}
        className="flex items-center gap-1.5 rounded-lg bg-dash-sidebar px-4 py-2.5 text-xs font-semibold text-dash-muted transition hover:opacity-90 disabled:opacity-50"
      >
        <Check size={13} strokeWidth={2} />
        Valider
      </button>
      <button
        disabled={isPending}
        onClick={() => decider("rejete")}
        className="flex items-center gap-1.5 rounded-lg border border-dash-border px-4 py-2.5 text-xs font-medium text-dash-text-secondary transition hover:bg-gray-50 disabled:opacity-50"
      >
        <X size={13} strokeWidth={2} />
        Rejeter
      </button>
    </div>
  );
}

export function VoirDocument({ storagePath }: { storagePath: string }) {
  const toast = useToast();

  function ouvrir() {
    // Fenêtre ouverte SYNCHRONEMENT (avant l'await) pour éviter le
    // blocage de pop-up (Safari notamment), puis redirigée.
    const fenetre = window.open("", "_blank");
    void (async () => {
      try {
        const url = await obtenirUrlDocumentSigne(storagePath);
        redirigerFenetre(fenetre, url);
      } catch (e) {
        fenetre?.close();
        toast.error(e instanceof Error ? e.message : "Impossible d'ouvrir le document.");
      }
    })();
  }

  return (
    <button
      onClick={ouvrir}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dash-border px-3 py-2 text-xs font-medium text-dash-text-secondary transition hover:bg-gray-50"
    >
      <ExternalLink size={13} strokeWidth={1.75} />
      Voir le document
    </button>
  );
}
