"use client";

import { useState, useTransition } from "react";
import { Car, X, Check, AlertCircle, Wrench, Gauge, RefreshCw, KeyRound } from "lucide-react";
import { changerStatutOperationnelVehicule } from "@/app/actions/proprietaire";

interface ModalStatutVehiculeProps {
  vehiculeId: string;
  marqueModele: string;
  immatriculation?: string | null;
  statutActuel: string;
  kilometrageActuel?: number | null;
  ouvert: boolean;
  onFermer: () => void;
}

const STATUTS_OPTIONS = [
  {
    code: "disponible",
    label: "Disponible (En agence)",
    description: "Le véhicule est garé au parking, propre et disponible à la location",
    icon: Check,
    color: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    badgeColor: "bg-emerald-600 text-white",
  },
  {
    code: "livree",
    label: "Livrée / En location",
    description: "Le véhicule a été remis au client et circule actuellement sur la route",
    icon: KeyRound,
    color: "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100",
    badgeColor: "bg-sky-600 text-white",
  },
  {
    code: "maintenance",
    label: "En Maintenance / Garage",
    description: "Le véhicule est au garage pour vidange, révision ou réparation",
    icon: Wrench,
    color: "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
    badgeColor: "bg-amber-600 text-white",
  },
];

export default function ModalStatutVehicule({
  vehiculeId,
  marqueModele,
  immatriculation,
  statutActuel,
  kilometrageActuel,
  ouvert,
  onFermer,
}: ModalStatutVehiculeProps) {
  const [statutSelectionne, setStatutSelectionne] = useState(statutActuel || "disponible");
  const [kilometrage, setKilometrage] = useState<string>(kilometrageActuel ? String(kilometrageActuel) : "");
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  if (!ouvert) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    const kmNum = kilometrage.trim() ? Number(kilometrage) : undefined;

    startTransition(async () => {
      try {
        await changerStatutOperationnelVehicule(vehiculeId, statutSelectionne, kmNum);
        onFermer();
      } catch (err: unknown) {
        setErreur(err instanceof Error ? err.message : "Erreur lors du changement de statut.");
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
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-dash-accent/20 text-dash-dark">
              <Car size={18} strokeWidth={2} />
            </span>
            <div>
              <h3 className="text-base font-bold text-dash-dark">
                Changer l&apos;état du véhicule
              </h3>
              <p className="text-xs text-dash-text-secondary">
                {marqueModele} {immatriculation && `(${immatriculation})`}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {erreur && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={15} className="shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* Choix des statuts en 1 clic */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-dash-text-secondary">
              Sélectionnez l&apos;état actuel
            </label>
            <div className="space-y-2">
              {STATUTS_OPTIONS.map((opt) => {
                const estActive = statutSelectionne === opt.code;
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setStatutSelectionne(opt.code)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      estActive
                        ? `${opt.color} ring-2 ring-dash-dark/20 font-bold shadow-xs`
                        : "border-gray-200 bg-white hover:bg-gray-50 text-dash-dark"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${opt.badgeColor}`}>
                      <IconComponent size={14} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-dash-dark">{opt.label}</p>
                      <p className="text-[11px] text-dash-text-secondary leading-tight mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kilométrage optionnel */}
          <div>
            <label htmlFor="kilometrage_input" className="flex items-center gap-1.5 text-xs font-semibold text-dash-dark mb-1.5">
              <Gauge size={14} className="text-dash-muted" />
              Mettre à jour le kilométrage (km)
            </label>
            <input
              id="kilometrage_input"
              type="number"
              min="0"
              placeholder="Ex: 85000"
              value={kilometrage}
              onChange={(e) => setKilometrage(e.target.value)}
              className="w-full rounded-xl border border-dash-border px-3.5 py-2.5 text-sm font-semibold text-dash-dark outline-none focus:border-dash-dark"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onFermer}
              className="rounded-lg border border-dash-border px-4 py-2 text-xs font-semibold text-dash-text-secondary hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-dash-dark px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-dash-dark/90 disabled:opacity-50"
            >
              {isPending && <RefreshCw size={13} className="animate-spin" />}
              Appliquer l&apos;état
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
