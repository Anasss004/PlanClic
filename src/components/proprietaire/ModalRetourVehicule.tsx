"use client";

import { useState, useTransition } from "react";
import {
  X,
  Gauge,
  Fuel,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Sparkles,
  AlertCircle,
  Car,
  User,
} from "lucide-react";
import { enregistrerRetourVehicule } from "@/app/actions/proprietaire";
import { useToast } from "@/components/ui/Toast";

interface ModalRetourVehiculeProps {
  vehiculeId: string;
  marqueModele: string;
  immatriculation?: string | null;
  kilometrageDepart?: number | null;
  reservationId?: string | null;
  nomClient?: string | null;
  soldeRestant?: number | null;
  ouvert: boolean;
  onFermer: () => void;
}

const NIVEAUX_CARBURANT = [
  { value: "plein", label: "Plein (100%)", pct: "100%", color: "bg-emerald-500" },
  { value: "3/4", label: "3/4", pct: "75%", color: "bg-emerald-400" },
  { value: "1/2", label: "1/2", pct: "50%", color: "bg-amber-400" },
  { value: "1/4", label: "1/4", pct: "25%", color: "bg-amber-500" },
  { value: "reserve", label: "Réserve", pct: "10%", color: "bg-rose-500" },
];

export default function ModalRetourVehicule({
  vehiculeId,
  marqueModele,
  immatriculation,
  kilometrageDepart,
  reservationId,
  nomClient,
  soldeRestant = 0,
  ouvert,
  onFermer,
}: ModalRetourVehiculeProps) {
  const [kmRetour, setKmRetour] = useState<string>(
    kilometrageDepart ? String(kilometrageDepart) : ""
  );
  const [carburant, setCarburant] = useState<string>("plein");
  const [soldeRegle, setSoldeRegle] = useState<boolean>(true);
  const [cautionRestituee, setCautionRestituee] = useState<boolean>(true);
  const [statutApres, setStatutApres] = useState<"disponible" | "maintenance">("disponible");

  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  if (!ouvert) return null;

  const kmNum = Number(kmRetour) || 0;
  const kmParcourus =
    kilometrageDepart && kmNum >= kilometrageDepart ? kmNum - kilometrageDepart : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      try {
        await enregistrerRetourVehicule({
          vehiculeId,
          reservationId,
          kilometrageRetour: kmNum > 0 ? kmNum : undefined,
          niveauCarburant: carburant,
          soldeRegle: (soldeRestant ?? 0) > 0 ? soldeRegle : true,
          cautionRestituee,
          statutApresRetour: statutApres,
        });

        toast.success(
          `Véhicule ${marqueModele} restitué avec succès. Statut : ${
            statutApres === "maintenance" ? "En maintenance" : "Disponible"
          }.`
        );
        onFermer();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors du retour.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4 max-sm:px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm shadow-emerald-200">
              <CheckCircle2 size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">
                Restitution de véhicule
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <span className="font-semibold text-slate-800">{marqueModele}</span>
                {immatriculation && (
                  <span className="rounded bg-slate-200/70 px-1.5 py-0.2 font-mono text-[10px] font-bold text-slate-700">
                    {immatriculation}
                  </span>
                )}
                {nomClient && (
                  <span className="text-slate-400">· Client : {nomClient}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X size={17} />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto max-sm:p-4 max-sm:max-h-[85vh]">
          {/* 1. Kilométrage au retour */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Gauge size={14} className="text-slate-500" />
                Kilométrage au retour
              </label>
              {kilometrageDepart && (
                <span className="text-xs text-slate-500">
                  Départ : <strong className="text-slate-700">{kilometrageDepart.toLocaleString("fr-FR")} km</strong>
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                min={kilometrageDepart || 0}
                value={kmRetour}
                onChange={(e) => setKmRetour(e.target.value)}
                placeholder={kilometrageDepart ? String(kilometrageDepart) : "Ex: 48500"}
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-14 text-sm font-bold text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                KM
              </span>
            </div>

            {kmParcourus > 0 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-emerald-700">
                <Sparkles size={12} />
                + {kmParcourus.toLocaleString("fr-FR")} km parcourus pendant cette location
              </p>
            )}
          </div>

          {/* 2. Niveau de carburant (Segmented bar) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
              <Fuel size={14} className="text-slate-500" />
              Niveau de carburant au retour
            </label>

            <div className="grid grid-cols-5 gap-2 max-sm:gap-1">
              {NIVEAUX_CARBURANT.map((nc) => {
                const actif = carburant === nc.value;
                return (
                  <button
                    key={nc.value}
                    type="button"
                    onClick={() => setCarburant(nc.value)}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 transition-all text-center max-sm:p-1.5 ${
                      actif
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10"
                        : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xs font-bold max-sm:text-[9px] max-sm:leading-tight">{nc.label}</span>
                    <span
                      className={`mt-1 h-1.5 w-6 rounded-full ${
                        actif ? "bg-white" : nc.color
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Solde restant & Caution */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 p-4 space-y-3.5">
            {/* Solde restant si > 0 */}
            {(soldeRestant ?? 0) > 0 && (
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Wallet size={15} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Solde restant : {soldeRestant?.toLocaleString("fr-FR")} MAD
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Règlement à encaisser à la restitution
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer rounded-xl bg-white border border-slate-200 px-3 py-1.5 shadow-2xs hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={soldeRegle}
                    onChange={(e) => setSoldeRegle(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className={`text-xs font-bold ${soldeRegle ? "text-emerald-700" : "text-slate-600"}`}>
                    {soldeRegle ? "✓ Encaissé" : "Non réglé"}
                  </span>
                </label>
              </div>
            )}

            {/* Caution */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Caution / Dépôt de garantie
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Empreinte bancaire ou dépôt espèces
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCautionRestituee(true)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    cautionRestituee
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Restituée
                </button>
                <button
                  type="button"
                  onClick={() => setCautionRestituee(false)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    !cautionRestituee
                      ? "bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Retenue
                </button>
              </div>
            </div>
          </div>

          {/* 4. Statut du véhicule après restitution */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Statut du véhicule après cette restitution :
            </label>
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <button
                type="button"
                onClick={() => setStatutApres("disponible")}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                  statutApres === "disponible"
                    ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white border-slate-200/80 hover:bg-slate-50"
                }`}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                  statutApres === "disponible" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Sparkles size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Disponible immédiatement
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Véhicule propre et prêt pour une nouvelle location.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatutApres("maintenance")}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                  statutApres === "maintenance"
                    ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-white border-slate-200/80 hover:bg-slate-50"
                }`}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                  statutApres === "maintenance" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Wrench size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Nettoyage / Entretien
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bloquer temporairement pour lavage ou révision.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 max-sm:flex-col-reverse max-sm:items-stretch">
            <button
              type="button"
              onClick={onFermer}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs max-sm:py-3"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50 max-sm:justify-center max-sm:py-3"
            >
              <CheckCircle2 size={15} strokeWidth={2.5} />
              {isPending ? "Enregistrement en cours..." : "Valider la restitution"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
