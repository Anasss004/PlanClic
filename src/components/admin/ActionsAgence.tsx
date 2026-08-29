"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Eye, RotateCcw, Send, X } from "lucide-react";
import {
  definirActifAgence,
  envoyerMessageProprietaire,
} from "@/app/actions/admin";
import { demarrerImpersonation } from "@/app/actions/impersonation";
import { useToast } from "@/components/ui/Toast";

export function BoutonImpersonation({
  proprietaireId,
}: {
  proprietaireId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function lancer() {
    if (
      !confirm(
        "Ouvrir l'espace de cette agence en lecture seule ? L'accès est journalisé."
      )
    )
      return;
    startTransition(async () => {
      try {
        await demarrerImpersonation(proprietaireId);
        router.push("/proprietaire/dashboard");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={lancer}
      className="flex items-center gap-1.5 rounded-lg border border-dash-border px-4 py-2.5 text-xs font-semibold text-dash-text-secondary transition hover:bg-gray-50 disabled:opacity-50"
    >
      <Eye size={13} strokeWidth={2} />
      Se connecter en tant que
    </button>
  );
}

export function BoutonActifAgence({
  proprietaireId,
  actif,
}: {
  proprietaireId: string;
  actif: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function basculer() {
    const cible = !actif;
    if (
      !confirm(
        cible
          ? "Réactiver ce compte agence ?"
          : "Désactiver ce compte ? L'agence ne pourra plus publier et ses véhicules seront masqués."
      )
    )
      return;

    startTransition(async () => {
      try {
        await definirActifAgence(proprietaireId, cible);
        toast.success(cible ? "Compte réactivé." : "Compte désactivé.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={basculer}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold transition disabled:opacity-50 ${
        actif
          ? "border border-dash-border text-dash-text-secondary hover:bg-rose-50 hover:text-rose-700"
          : "bg-dash-sidebar text-dash-muted hover:opacity-90"
      }`}
    >
      {actif ? (
        <>
          <Ban size={13} strokeWidth={2} />
          Désactiver le compte
        </>
      ) : (
        <>
          <RotateCcw size={13} strokeWidth={2} />
          Réactiver le compte
        </>
      )}
    </button>
  );
}

export function BoutonMessageAgence({
  proprietaireId,
}: {
  proprietaireId: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function soumettre(formData: FormData) {
    const titre = (formData.get("titre") as string)?.trim();
    const message = (formData.get("message") as string)?.trim();
    if (!titre || !message) {
      toast.error("Titre et message obligatoires.");
      return;
    }
    startTransition(async () => {
      try {
        await envoyerMessageProprietaire(proprietaireId, titre, message);
        toast.success("Message envoyé à l'agence.");
        setOuvert(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="flex items-center gap-1.5 rounded-lg border border-dash-border px-4 py-2.5 text-xs font-semibold text-dash-text-secondary transition hover:bg-gray-50"
      >
        <Send size={13} strokeWidth={2} />
        Envoyer un message
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dash-dark">
                Message à l&apos;agence
              </h2>
              <button
                onClick={() => setOuvert(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <p className="mb-4 text-xs text-dash-text-secondary">
              Ce message apparaîtra dans le centre de notifications de l&apos;espace
              propriétaire. (L&apos;envoi par email n&apos;est pas encore actif.)
            </p>

            <form action={soumettre} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
                  Titre
                </label>
                <input
                  name="titre"
                  required
                  maxLength={120}
                  className="w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
                  Message
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-dash-sidebar py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
