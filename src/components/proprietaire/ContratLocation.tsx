"use client";

import { useTransition } from "react";
import { FileText, MessageCircle, RefreshCw, FileDown } from "lucide-react";
import {
  regenererContrat,
  obtenirLienContrat,
  obtenirLienContratWhatsApp,
} from "@/app/actions/proprietaire";
import { redirigerFenetre } from "@/lib/fenetre";
import { useToast } from "@/components/ui/Toast";

export default function ContratLocation({
  reservationId,
  contratGenere,
  nbPhotos,
}: {
  reservationId: string;
  contratGenere: boolean;
  nbPhotos: number;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function voir() {
    // Fenêtre ouverte SYNCHRONEMENT (avant tout await) pour ne pas être
    // bloquée par le navigateur, puis redirigée vers l'URL signée.
    const fenetre = window.open("", "_blank");
    startTransition(async () => {
      try {
        const url = await obtenirLienContrat(reservationId);
        redirigerFenetre(fenetre, url);
      } catch (e) {
        fenetre?.close();
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function envoyerWhatsApp() {
    const fenetre = window.open("", "_blank");
    startTransition(async () => {
      try {
        const lien = await obtenirLienContratWhatsApp(reservationId);
        redirigerFenetre(fenetre, lien);
      } catch (e) {
        fenetre?.close();
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function regenerer() {
    startTransition(async () => {
      try {
        await regenererContrat(reservationId);
        toast.success("Contrat regénéré.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  if (!contratGenere) {
    return (
      <button
        disabled={isPending}
        onClick={regenerer}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dash-border py-2.5 text-sm font-semibold text-dash-text-secondary transition hover:bg-gray-50 disabled:opacity-50"
      >
        <FileText size={15} strokeWidth={1.75} />
        Générer le contrat
      </button>
    );
  }

  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-dash-text-secondary">
        <FileText size={13} strokeWidth={1.75} />
        Contrat généré
        {nbPhotos > 0 ? ` · ${nbPhotos} photo${nbPhotos > 1 ? "s" : ""}` : ""}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isPending}
          onClick={voir}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dash-border py-2 text-xs font-semibold text-dash-text-secondary transition hover:bg-gray-50 disabled:opacity-50"
        >
          <FileDown size={13} strokeWidth={1.75} />
          Voir le PDF
        </button>
        <button
          disabled={isPending}
          onClick={regenerer}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dash-border py-2 text-xs font-medium text-dash-text-secondary transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={13} strokeWidth={1.75} />
          Regénérer
        </button>
      </div>
      <button
        disabled={isPending}
        onClick={envoyerWhatsApp}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
      >
        <MessageCircle size={15} strokeWidth={2} />
        Envoyer le contrat par WhatsApp
      </button>
    </div>
  );
}
