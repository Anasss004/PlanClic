"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Car, Wrench, TrendingUp, Search, FilePlus2 } from "lucide-react";
import MenuActionsVehicule from "@/components/proprietaire/MenuActionsVehicule";
import { formaterDate } from "@/lib/dates";

type Vehicule = {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  ville: string;
  categorie: string | null;
  statut: string;
  prix_jour: number;
  photos: string[] | null;
};

const LABELS_CATEGORIE: Record<string, string> = {
  economique: "Économique",
  berline_luxe: "Berline Luxe",
  suv_4x4: "SUV & 4x4",
};

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
  const [page, setPage] = useState(1);

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
      if (!q) return true;
      return `${v.marque} ${v.modele} ${v.immatriculation}`.toLowerCase().includes(q);
    });
  }, [vehicules, recherche, ville, categorie]);

  const totalPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageSure = Math.min(page, totalPages);
  const visibles = filtres.slice((pageSure - 1) * PAR_PAGE, pageSure * PAR_PAGE);

  const selectClass =
    "rounded-lg border border-dash-border px-3 py-2 text-sm text-dash-text-secondary outline-none focus:border-dash-dark";

  return (
    <div>
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
            return (
              <div
                key={v.id}
                className="group flex items-center gap-4 rounded-xl border border-white/30 bg-white p-3 shadow-[0px_4px_20px_rgba(18,53,68,0.05)] transition-shadow hover:shadow-[0px_8px_24px_rgba(18,53,68,0.1)] sm:gap-6 sm:p-4"
              >
                <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-[#eeeeef] sm:h-24 sm:w-32">
                  {v.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.photos[0]} alt={`${v.marque} ${v.modele}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car size={28} strokeWidth={1.25} className="text-dash-dark/30" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/proprietaire/vehicules/${v.id}`}
                    className="truncate text-lg font-semibold text-dash-text hover:text-dash-dark hover:underline sm:text-xl"
                  >
                    {v.marque} {v.modele}
                  </Link>
                  <p className="font-mono text-xs text-dash-text-secondary sm:text-sm">{v.immatriculation}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {revenu > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-[#006c4a]">
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

                <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${
                      v.statut === "actif"
                        ? "border-dash-accent/30 bg-dash-accent/20 text-[#7b5900]"
                        : "border-gray-300 bg-gray-50 text-gray-500"
                    }`}
                  >
                    {v.statut === "actif" ? "Disponible" : "Inactif"}
                  </span>
                  <p className="text-lg font-semibold text-dash-dark">
                    {v.prix_jour}
                    <span className="text-sm font-normal text-dash-text-secondary"> DH/j</span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/proprietaire/bloquer?vehicule=${v.id}`}
                    title="Enregistrer une location pour ce véhicule"
                    className="flex items-center gap-1.5 rounded-lg bg-dash-accent px-3 py-2 text-sm font-bold text-dash-text shadow-sm transition hover:brightness-95"
                  >
                    <FilePlus2 size={14} strokeWidth={2.5} />
                    <span className="hidden lg:inline">Nouvelle location</span>
                  </Link>
                  <Link
                    href={`/proprietaire/vehicules/${v.id}`}
                    className="rounded-lg border border-dash-border px-4 py-2 text-sm font-medium text-dash-text-secondary transition hover:border-dash-dark/30 hover:bg-gray-50 hover:text-dash-dark"
                  >
                    Voir
                  </Link>
                  <Link
                    href={`/proprietaire/vehicules/${v.id}/modifier`}
                    className="hidden rounded-lg border border-dash-border px-4 py-2 text-sm font-medium text-dash-text-secondary transition hover:border-dash-dark/30 hover:bg-gray-50 hover:text-dash-dark sm:block"
                  >
                    Modifier
                  </Link>
                  <MenuActionsVehicule vehiculeId={v.id} statut={v.statut} />
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
