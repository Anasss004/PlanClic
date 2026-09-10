"use client";

import { useState, useTransition } from "react";
import { Wallet, Check, X, AlertCircle, RefreshCw } from "lucide-react";
import { enregistrerPaiement } from "@/app/actions/proprietaire";

interface ModalPaiementProps {
  reservationId: string;
  nomClient: string;
  prixTotal: number;
  montantPayeActuel: number;
  ouvert: boolean;
  onFermer: () => void;
}

export default function ModalPaiement({
  reservationId,
  nomClient,
  prixTotal,
  montantPayeActuel,
  ouvert,
  onFermer,
}: ModalPaiementProps) {
  const [montant, setMontant] = useState<number>(montantPayeActuel);
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  if (!ouvert) return null;

  const soldeRestant = Math.max(0, prixTotal - montant);
  const estPayeComplet = montant >= prixTotal && prixTotal > 0;
  const estAvance = montant > 0 && montant < prixTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (montant < 0) {
      setErreur("Le montant ne peut pas être négatif.");
      return;
    }

    startTransition(async () => {
      try {
        await enregistrerPaiement(reservationId, montant);
        onFermer();
      } catch (err: unknown) {
        setErreur(err instanceof Error ? err.message : "Erreur lors de la mise à jour du paiement.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs transition-opacity"
      onClick={onFermer}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modal */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 max-sm:px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-dash-accent/20 text-dash-dark">
              <Wallet size={18} strokeWidth={2} />
            </span>
            <div>
              <h3 className="text-base font-bold text-dash-dark">
                Gestion du paiement
              </h3>
              <p className="text-xs text-dash-text-secondary">
                Client : <span className="font-semibold text-dash-dark">{nomClient}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFermer}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-dash-dark"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-sm:p-4 max-sm:max-h-[80vh] max-sm:overflow-y-auto">
          {erreur && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={15} className="shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* Synthèse du paiement */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center border border-gray-100 max-sm:gap-1 max-sm:p-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-dash-text-secondary font-medium">Prix total</p>
              <p className="mt-0.5 text-sm font-bold text-dash-dark">{prixTotal.toLocaleString("fr-FR")} MAD</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-dash-text-secondary font-medium">Payé (Avance)</p>
              <p className="mt-0.5 text-sm font-bold text-emerald-600">{montant.toLocaleString("fr-FR")} MAD</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-dash-text-secondary font-medium">Reste à régler</p>
              <p className={`mt-0.5 text-sm font-bold ${soldeRestant > 0 ? "text-rose-600" : "text-gray-400"}`}>
                {soldeRestant.toLocaleString("fr-FR")} MAD
              </p>
            </div>
          </div>

          {/* Boutons de raccourci rapide */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dash-dark">
              Raccourcis rapides
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMontant(prixTotal)}
                className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              >
                Payer la totalité ({prixTotal.toLocaleString("fr-FR")} MAD)
              </button>
              <button
                type="button"
                onClick={() => setMontant(Math.round(prixTotal / 2))}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
              >
                Avance 50% ({Math.round(prixTotal / 2).toLocaleString("fr-FR")} MAD)
              </button>
              <button
                type="button"
                onClick={() => setMontant(0)}
                className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition"
              >
                Remettre à 0
              </button>
            </div>
          </div>

          {/* Champ de saisie du montant payé */}
          <div>
            <label htmlFor="montant_saisi" className="block text-xs font-semibold text-dash-dark mb-1.5">
              Montant versé par le client (MAD)
            </label>
            <div className="relative">
              <input
                id="montant_saisi"
                type="number"
                min="0"
                max={prixTotal * 2}
                step="10"
                value={montant}
                onChange={(e) => setMontant(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-dash-border px-3.5 py-2.5 text-sm font-bold text-dash-dark outline-none focus:border-dash-dark"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-dash-text-secondary">
                MAD
              </span>
            </div>
          </div>

          {/* Indicateur de statut résolu */}
          <div className="rounded-xl border p-3 text-xs flex items-center gap-2.5">
            {estPayeComplet ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                <Check size={16} strokeWidth={2.5} className="text-emerald-600" />
                Paiement complet — Aucun solde restant.
              </span>
            ) : estAvance ? (
              <span className="flex items-center gap-1.5 font-semibold text-amber-700">
                <AlertCircle size={15} className="text-amber-600" />
                Avance enregistrée — Reste {soldeRestant.toLocaleString("fr-FR")} MAD à percevoir.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-rose-600">
                <AlertCircle size={15} />
                Aucun versement enregistré pour cette réservation.
              </span>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 max-sm:flex-col-reverse max-sm:items-stretch">
            <button
              type="button"
              onClick={onFermer}
              className="rounded-lg border border-dash-border px-4 py-2 text-xs font-semibold text-dash-text-secondary hover:bg-gray-50 max-sm:py-3"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-dash-dark px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-dash-dark/90 disabled:opacity-50 max-sm:justify-center max-sm:py-3"
            >
              {isPending && <RefreshCw size={13} className="animate-spin" />}
              Enregistrer le paiement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
