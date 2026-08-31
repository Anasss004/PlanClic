"use client";

import { useMemo, useState } from "react";
import { Car, Calendar, Search, MapPin, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import ActionsReservation from "@/components/proprietaire/ActionsReservation";
import ContratLocation from "@/components/proprietaire/ContratLocation";
import ContactClient from "@/components/proprietaire/ContactClient";
import { formaterPeriode, formaterHeure } from "@/lib/dates";

export type ReservationListe = {
  id: string;
  date_debut: string;
  date_fin: string;
  heure_debut: string | null;
  lieu_debut: string | null;
  heure_fin: string | null;
  lieu_fin: string | null;
  statut: string;
  prix_total: number | null;
  source: string;
  nom_client_manuel: string | null;
  telephone_client_manuel: string | null;
  contrat_url: string | null;
  photos_etat_vehicule: string[] | null;
  created_at: string;
  vehicules: { marque: string; modele: string; carburant: string | null; transmission: string | null; photos: string[] | null } | null;
  profiles: { prenom: string | null; nom: string | null; telephone: string | null } | null;
};

const PRIORITE_STATUT: Record<string, number> = {
  en_attente: 0, confirmee: 1, terminee: 2, refusee: 3, annulee: 4,
};

const STATUTS: Record<string, { label: string; variant: "warning" | "success" | "danger" | "info" | "neutral"; barre: string }> = {
  en_attente: { label: "En attente", variant: "warning", barre: "bg-[#feca5e]" },
  confirmee: { label: "Confirmée", variant: "success", barre: "bg-[#4fba7a]" },
  refusee: { label: "Refusée", variant: "danger", barre: "bg-[#ba1a1a]" },
  annulee: { label: "Annulée", variant: "neutral", barre: "bg-gray-300" },
  terminee: { label: "Terminée", variant: "info", barre: "bg-[#6bb8e0]" },
};

const FILTRES = [
  { value: "tous", label: "Toutes" },
  { value: "en_attente", label: "En attente" },
  { value: "confirmee", label: "Confirmées" },
  { value: "terminee", label: "Terminées" },
  { value: "refusee", label: "Refusées" },
  { value: "annulee", label: "Annulées" },
];

const PAR_PAGE = 18;

export default function ListeReservations({
  reservations,
  impersonation,
}: {
  reservations: ReservationListe[];
  impersonation: boolean;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const [page, setPage] = useState(1);

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return [...reservations]
      .filter((r) => (filtre === "tous" ? true : r.statut === filtre))
      .filter((r) => {
        if (!q) return true;
        const nom =
          r.source === "manuel"
            ? r.nom_client_manuel ?? ""
            : `${r.profiles?.prenom ?? ""} ${r.profiles?.nom ?? ""}`;
        const veh = r.vehicules ? `${r.vehicules.marque} ${r.vehicules.modele}` : "";
        return `${nom} ${veh}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const pa = PRIORITE_STATUT[a.statut] ?? 9;
        const pb = PRIORITE_STATUT[b.statut] ?? 9;
        if (pa !== pb) return pa - pb;
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      });
  }, [reservations, recherche, filtre]);

  const totalPages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
  const pageSure = Math.min(page, totalPages);
  const visibles = filtrees.slice((pageSure - 1) * PAR_PAGE, pageSure * PAR_PAGE);

  return (
    <div>
      {/* Recherche + filtres */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-text-secondary" />
          <input
            value={recherche}
            onChange={(e) => { setRecherche(e.target.value); setPage(1); }}
            placeholder="Rechercher un client, un véhicule…"
            className="w-full rounded-lg border border-dash-border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-dash-dark"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTRES.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFiltre(f.value); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filtre === f.value
                  ? "bg-dash-sidebar text-white"
                  : "bg-gray-50 text-dash-text-secondary hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-dash-border bg-white px-6 py-12 text-center text-sm text-dash-text-secondary">
          Aucune réservation ne correspond.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((r) => {
            const st = STATUTS[r.statut] ?? { label: r.statut, variant: "neutral" as const, barre: "bg-gray-300" };
            const v = r.vehicules;
            const p = r.profiles;
            const nomClient = r.source === "manuel" ? r.nom_client_manuel ?? "" : `${p?.prenom ?? ""} ${p?.nom ?? ""}`.trim();
            const telephone = r.source === "manuel" ? r.telephone_client_manuel : p?.telephone ?? null;
            const vehiculeNom = v ? `${v.marque} ${v.modele}` : "Véhicule";

            return (
              <div key={r.id} className="relative overflow-hidden rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_20px_rgba(15,76,129,0.05)]">
                <div className={`absolute inset-x-0 top-0 h-1 ${st.barre}`} />

                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs text-dash-text-secondary">#{r.id.slice(0, 8).toUpperCase()}</p>
                      <span className="text-[11px] font-medium text-dash-text-secondary">
                        {r.source === "manuel" ? "Manuelle" : "En ligne"}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-dash-text">{nomClient || "—"}</p>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dash-border bg-[#eeeeef]">
                    {v?.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.photos[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Car size={22} strokeWidth={1.5} className="text-dash-dark/30" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-dash-text">{vehiculeNom}</p>
                    <p className="truncate text-xs text-dash-text-secondary">
                      {v?.transmission === "automatique" ? "Automatique" : "Manuelle"} • {v?.carburant ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="mb-4 space-y-1 text-sm text-dash-text">
                  <p className="flex items-center gap-2">
                    <Calendar size={15} strokeWidth={1.75} className="shrink-0 text-dash-text-secondary" />
                    {formaterPeriode(r.date_debut, r.date_fin)}
                  </p>
                  {(r.heure_debut || r.heure_fin) && (
                    <p className="flex items-center gap-2 text-xs text-dash-text-secondary">
                      <Clock size={13} strokeWidth={1.75} className="shrink-0" />
                      {r.heure_debut ? `Départ ${formaterHeure(r.heure_debut)}` : ""}
                      {r.heure_debut && r.heure_fin ? " · " : ""}
                      {r.heure_fin ? `Retour ${formaterHeure(r.heure_fin)}` : ""}
                    </p>
                  )}
                  {(r.lieu_debut || r.lieu_fin) && (
                    <p className="flex items-start gap-2 text-xs text-dash-text-secondary">
                      <MapPin size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                      <span>
                        {r.lieu_debut}
                        {r.lieu_debut && r.lieu_fin && r.lieu_fin !== r.lieu_debut ? ` → ${r.lieu_fin}` : ""}
                      </span>
                    </p>
                  )}
                </div>

                {r.statut !== "refusee" && r.statut !== "annulee" && (
                  <ContactClient
                    infos={{
                      nom: nomClient,
                      telephone,
                      vehicule: vehiculeNom,
                      dateDebut: r.date_debut,
                      dateFin: r.date_fin,
                      heureDebut: r.heure_debut,
                      lieuDebut: r.lieu_debut,
                      statut: r.statut,
                    }}
                  />
                )}

                {r.source === "manuel" && !impersonation && r.statut !== "annulee" && (
                  <ContratLocation
                    reservationId={r.id}
                    contratGenere={!!r.contrat_url}
                    nbPhotos={r.photos_etat_vehicule?.length ?? 0}
                  />
                )}

                <div className="flex items-center justify-between border-t border-dash-border pt-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-dash-text-secondary">Total</p>
                    <p className="text-lg font-semibold text-dash-dark">
                      {(r.prix_total ?? 0).toLocaleString("fr-FR")} MAD
                    </p>
                  </div>
                  <ActionsReservation reservationId={r.id} statut={r.statut} />
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
          <span className="text-dash-text-secondary">
            Page {pageSure} / {totalPages}
          </span>
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
