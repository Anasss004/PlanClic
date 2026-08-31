"use client";

import { useState } from "react";
import DatePicker from "@/components/ui/DatePicker";
import { creerReservation } from "@/app/actions/client";

const AUJOURDHUI = new Date().toISOString().slice(0, 10);

export default function FormulaireReservation({
  vehiculeId,
  prixJour,
  dateDebutInitiale,
  dateFinInitiale,
}: {
  vehiculeId: string;
  prixJour: number;
  dateDebutInitiale?: string;
  dateFinInitiale?: string;
}) {
  const [dateDebut, setDateDebut] = useState(dateDebutInitiale ?? "");
  const [dateFin, setDateFin] = useState(dateFinInitiale ?? "");

  const nbJours =
    dateDebut && dateFin
      ? Math.max(
          1,
          Math.round(
            (new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000
          )
        )
      : 0;
  const datesValides = nbJours > 0;
  const total = nbJours * prixJour;

  return (
    <form
      action={creerReservation}
      className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <input type="hidden" name="vehicule_id" value={vehiculeId} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Date de départ
          </label>
          <DatePicker
            name="date_debut"
            value={dateDebut}
            onChange={setDateDebut}
            min={AUJOURDHUI}
            required
            theme="brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Date de retour
          </label>
          <DatePicker
            name="date_fin"
            value={dateFin}
            onChange={setDateFin}
            min={dateDebut || AUJOURDHUI}
            required
            theme="brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Heure de départ <span className="text-gray-400">(optionnel)</span>
          </label>
          <input
            type="time"
            name="heure_debut"
            className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Heure de retour <span className="text-gray-400">(optionnel)</span>
          </label>
          <input
            type="time"
            name="heure_fin"
            className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Lieu de prise en charge souhaité <span className="text-gray-400">(optionnel)</span>
        </label>
        <input
          name="lieu_debut"
          placeholder="ex : Aéroport Marrakech-Ménara, centre-ville…"
          className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
        />
      </div>

      {/* Récapitulatif du prix, calculé en direct */}
      {datesValides ? (
        <div className="rounded-xl bg-brand-light/20 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-brand-dark">
            <span>
              {prixJour} MAD × {nbJours} jour{nbJours > 1 ? "s" : ""}
            </span>
            <span className="font-semibold">{total.toLocaleString("fr-FR")} MAD</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-brand-dark/10 pt-2 text-base font-bold text-brand-dark">
            <span>Total</span>
            <span>{total.toLocaleString("fr-FR")} MAD</span>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-center text-xs text-gray-400">
          Choisis tes dates pour voir le prix total
        </p>
      )}

      <button
        type="submit"
        disabled={!datesValides}
        className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition-all duration-200 hover:brightness-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Envoyer une demande de réservation
      </button>
      <p className="text-center text-xs text-gray-400">
        Le propriétaire doit accepter ta demande avant confirmation.
      </p>
    </form>
  );
}
