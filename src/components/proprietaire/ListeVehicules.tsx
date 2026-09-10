"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Car, Wrench, TrendingUp, Search, FilePlus2, Check, KeyRound, RotateCcw } from "lucide-react";
import MenuActionsVehicule from "@/components/proprietaire/MenuActionsVehicule";
import ModalStatutVehicule from "@/components/proprietaire/ModalStatutVehicule";
import ModalRetourVehicule from "@/components/proprietaire/ModalRetourVehicule";
import { formaterDate } from "@/lib/dates";

type Vehicule = {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  ville: string;
  categorie: string | null;
  statut: string;
  statut_operationnel?: string | null;
  kilometrage_actuel?: number | null;
  prix_jour: number;
  photos: string[] | null;
};

const LABELS_CATEGORIE: Record<string, string> = {
  economique: "Économique",
  berline_luxe: "Berline Luxe",
  suv_4x4: "SUV & 4x4",
};

const FILTRES_STATUT_OP = [
  { value: "tous", label: "Toute la flotte" },
  { value: "disponible", label: "🟢 Disponibles (En agence)" },
  { value: "livree", label: "🔵 En location (Livrés)" },
  { value: "maintenance", label: "🛠️ En maintenance" },
];

const PAR_PAGE = 20;

export default function ListeVehicules({
  vehicules,
  revenus,
  derniersEntretiens,
}: {
  vehicules: Vehicule[];
  revenus: Record<string, number>;
  derniersEntretiens: Record<string, string>;
}) {
  const [recherche, setRecherche] = useState("");
  const [ville, setVille] = useState("");
  const [categorie, setCategorie] = useState("");
  const [filtreOp, setFiltreOp] = useState("tous");
  const [page, setPage] = useState(1);
  const [vehiculeModalStatut, setVehiculeModalStatut] = useState<Vehicule | null>(null);
  const [vehiculeModalRetour, setVehiculeModalRetour] = useState<Vehicule | null>(null);

  const villes = useMemo(
    () => [...new Set(vehicules.map((v) => v.ville).filter(Boolean))].sort(),
    [vehicules]
  );
  const categories = useMemo(
    () => [...new Set(vehicules.map((v) => v.categorie).filter(Boolean) as string[])],
    [vehicules]
  );

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return vehicules.filter((v) => {
      if (ville && v.ville !== ville) return false;
      if (categorie && v.categorie !== categorie) return false;
      if (filtreOp !== "tous") {
        const stOp = v.statut_operationnel || "disponible";
        if (stOp !== filtreOp) return false;
      }
      if (!q) return true;
      return `${v.marque} ${v.modele} ${v.immatriculation}`.toLowerCase().includes(q);
    });
  }, [vehicules, recherche, ville, categorie, filtreOp]);

  const totalPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageSure = Math.min(page, totalPages);
  const visibles = filtres.slice((pageSure - 1) * PAR_PAGE, pageSure * PAR_PAGE);

  const selectClass =
    "rounded-lg border border-dash-border px-3 py-2 text-sm text-dash-text-secondary outline-none focus:border-dash-dark";

  return (
    <div>
      {/* Modal de changement rapide d'état opérationnel */}
      {vehiculeModalStatut && (
        <ModalStatutVehicule
          vehiculeId={vehiculeModalStatut.id}
          marqueModele={`${vehiculeModalStatut.marque} ${vehiculeModalStatut.modele}`}
          immatriculation={vehiculeModalStatut.immatriculation}
          statutActuel={vehiculeModalStatut.statut_operationnel || "disponible"}
          kilometrageActuel={vehiculeModalStatut.kilometrage_actuel}
          ouvert={!!vehiculeModalStatut}
          onFermer={() => setVehiculeModalStatut(null)}
        />
      )}

      {/* Modal de restitution / retour de véhicule */}
      {vehiculeModalRetour && (
        <ModalRetourVehicule
          vehiculeId={vehiculeModalRetour.id}
          marqueModele={`${vehiculeModalRetour.marque} ${vehiculeModalRetour.modele}`}
          immatriculation={vehiculeModalRetour.immatriculation}
          kilometrageDepart={vehiculeModalRetour.kilometrage_actuel}
          ouvert={!!vehiculeModalRetour}
          onFermer={() => setVehiculeModalRetour(null)}
        />
      )}

      {/* Onglets rapides de filtrage par état de flotte */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTRES_STATUT_OP.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setFiltreOp(f.value);
              setPage(1);
            }}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              filtreOp === f.value
                ? "bg-dash-sidebar text-white shadow-xs"
                : "bg-white text-dash-text-secondary border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Recherche + filtres ville / catégorie */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-text-secondary" />
          <input
            value={recherche}
            onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
            placeholder="Marque, modèle, immatriculation…"
            className="w-full rounded-lg border border-dash-border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-dash-dark"
          />
        </div>
        {villes.length > 1 && (
          <select value={ville} onChange={(e) => { setVille(e.target.value); setPage(1); }} className={selectClass}>
            <option value="">Toutes les villes</option>
            {villes.map((vl) => (
              <option key={vl} value={vl}>{vl}</option>
            ))}
          </select>
        )}
        {categories.length > 0 && (
          <select value={categorie} onChange={(e) => { setCategorie(e.target.value); setPage(1); }} className={selectClass}>
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{LABELS_CATEGORIE[c] ?? c}</option>
            ))}
          </select>
        )}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-dash-border bg-white px-6 py-12 text-center text-sm text-dash-text-secondary">
          Aucun véhicule ne correspond.
        </p>
      ) : (
        <div className="space-y-3">
          {visibles.map((v) => {
            const revenu = revenus[v.id] ?? 0;
            const entretien = derniersEntretiens[v.id];
            const stOp = v.statut_operationnel || "disponible";

            return (
              <div
                key={v.id}
                className="card-lift group flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#eeeeef] sm:h-24 sm:w-32">
                    {v.photos?.[0] ? (
                      <Image
                        src={v.photos[0]}
                        alt={`${v.marque} ${v.modele}`}
                        fill
                        sizes="(max-width: 640px) 96px, 128px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Car size={28} strokeWidth={1.25} className="text-dash-dark/30" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/proprietaire/vehicules/${v.id}`}
                        className="truncate text-base font-bold text-dash-dark hover:underline sm:text-lg"
                      >
                        {v.marque} {v.modele}
                      </Link>

                      {/* Badge d'état opérationnel 1-clic */}
                      <button
                        type="button"
                        onClick={() => setVehiculeModalStatut(v)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition hover:brightness-95 ${
                          stOp === "livree"
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : stOp === "maintenance"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                        title="Cliquer pour changer l'état du véhicule"
                      >
                        {stOp === "livree" ? (
                          <>
                            <KeyRound size={12} /> Livrée (En location)
                          </>
                        ) : stOp === "maintenance" ? (
                          <>
                            <Wrench size={12} /> En Maintenance
                          </>
                        ) : (
                          <>
                            <Check size={12} /> Disponible (En agence)
                          </>
                        )}
                      </button>
                    </div>

                    <p className="font-mono text-xs text-dash-text-secondary">{v.immatriculation}</p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {revenu > 0 && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <TrendingUp size={12} strokeWidth={2} />
                          {revenu.toLocaleString("fr-FR")} MAD générés
                        </span>
                      )}
                      {entretien && (
                        <span className="hidden items-center gap-1 text-xs text-dash-text-secondary sm:flex">
                          <Wrench size={12} strokeWidth={1.75} />
                          Entretien : {formaterDate(entretien)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 sm:border-t-0 sm:pt-0 sm:justify-end gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-base font-extrabold text-dash-dark">
                      {v.prix_jour}
                      <span className="text-xs font-normal text-dash-text-secondary"> DH/j</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Bouton direct de restitution si le véhicule est en cours de location */}
                    {(stOp === "livree" || stOp === "en_retard") && (
                      <button
                        type="button"
                        onClick={() => setVehiculeModalRetour(v)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
                        title="Marquer le véhicule comme retourné (Restitution)"
                      >
                        <RotateCcw size={13} strokeWidth={2.5} />
                        <span>Retour</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setVehiculeModalStatut(v)}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-dash-dark transition hover:bg-gray-100"
                    >
                      État
                    </button>
                    <Link
                      href={`/proprietaire/bloquer?vehicule=${v.id}`}
                      title="Enregistrer une location pour ce véhicule"
                      className="flex items-center gap-1.5 rounded-lg bg-dash-accent px-3 py-2 text-xs font-bold text-dash-text shadow-xs transition hover:brightness-95"
                    >
                      <FilePlus2 size={14} strokeWidth={2.5} />
                      <span className="hidden md:inline">Location</span>
                    </Link>
                    <Link
                      href={`/proprietaire/vehicules/${v.id}`}
                      className="rounded-lg border border-dash-border px-3 py-2 text-xs font-semibold text-dash-text-secondary transition hover:bg-gray-50 hover:text-dash-dark"
                    >
                      Voir
                    </Link>
                    <MenuActionsVehicule vehiculeId={v.id} statut={v.statut} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSure === 1}
            className="rounded-lg border border-dash-border px-3 py-1.5 font-medium text-dash-text-secondary disabled:opacity-40 hover:bg-gray-50"
          >
            Précédent
          </button>
          <span className="text-dash-text-secondary">Page {pageSure} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSure === totalPages}
            className="rounded-lg border border-dash-border px-3 py-1.5 font-medium text-dash-text-secondary disabled:opacity-40 hover:bg-gray-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
