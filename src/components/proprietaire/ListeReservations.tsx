"use client";

import { useMemo, useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Car,
  Calendar,
  Search,
  MapPin,
  Clock,
  Wallet,
  RotateCcw,
  Phone,
  MessageCircle,
  FileText,
  FileDown,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import ActionsReservation from "@/components/proprietaire/ActionsReservation";
import dynamic from "next/dynamic";

// Modales chargées à la demande (rendues seulement une fois ouvertes).
const ModalPaiement = dynamic(
  () => import("@/components/proprietaire/ModalPaiement"),
  { ssr: false }
);
const ModalRetourVehicule = dynamic(
  () => import("@/components/proprietaire/ModalRetourVehicule"),
  { ssr: false }
);
import { formaterPeriode, formaterHeure, nombreDeJours } from "@/lib/dates";
import { construireLienWhatsApp } from "@/lib/whatsapp";
import {
  regenererContrat,
  obtenirLienContrat,
  obtenirLienContratWhatsApp,
} from "@/app/actions/proprietaire";
import { redirigerFenetre } from "@/lib/fenetre";
import { useToast } from "@/components/ui/Toast";

export type ReservationListe = {
  id: string;
  vehicule_id?: string | null;
  date_debut: string;
  date_fin: string;
  heure_debut: string | null;
  lieu_debut: string | null;
  heure_fin: string | null;
  lieu_fin: string | null;
  statut: string;
  prix_total: number | null;
  montant_paye?: number | null;
  source: string;
  nom_client_manuel: string | null;
  telephone_client_manuel: string | null;
  contrat_url: string | null;
  photos_etat_vehicule: string[] | null;
  created_at: string;
  vehicules: {
    id?: string;
    marque: string;
    modele: string;
    carburant: string | null;
    transmission: string | null;
    photos: string[] | null;
    immatriculation?: string | null;
    kilometrage_actuel?: number | null;
  } | null;
  profiles: {
    prenom: string | null;
    nom: string | null;
    telephone: string | null;
  } | null;
};

const PRIORITE_STATUT: Record<string, number> = {
  en_attente: 0,
  confirmee: 1,
  terminee: 2,
  refusee: 3,
  annulee: 4,
};

const STATUTS: Record<
  string,
  {
    label: string;
    variant: "warning" | "success" | "danger" | "info" | "neutral";
    bordure: string;
  }
> = {
  en_attente: {
    label: "En attente",
    variant: "warning",
    bordure: "border-l-amber-400",
  },
  confirmee: {
    label: "Confirmée",
    variant: "success",
    bordure: "border-l-emerald-500",
  },
  refusee: {
    label: "Refusée",
    variant: "danger",
    bordure: "border-l-rose-500",
  },
  annulee: {
    label: "Annulée",
    variant: "neutral",
    bordure: "border-l-slate-300",
  },
  terminee: {
    label: "Terminée",
    variant: "info",
    bordure: "border-l-sky-500",
  },
};

const FILTRES = [
  { value: "tous", label: "Toutes" },
  { value: "en_attente", label: "En attente" },
  { value: "confirmee", label: "Confirmées" },
  { value: "terminee", label: "Terminées" },
  { value: "refusee", label: "Refusées" },
  { value: "annulee", label: "Annulées" },
];

const PAR_PAGE = 15;

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
  const [reservationPaiement, setReservationPaiement] =
    useState<ReservationListe | null>(null);
  const [reservationRetour, setReservationRetour] =
    useState<ReservationListe | null>(null);

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

        const veh = r.vehicules
          ? `${r.vehicules.marque} ${r.vehicules.modele}`
          : "";

        return `${nom} ${veh} ${r.id}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const pa = PRIORITE_STATUT[a.statut] ?? 9;
        const pb = PRIORITE_STATUT[b.statut] ?? 9;

        if (pa !== pb) return pa - pb;

        return (b.created_at ?? "").localeCompare(b.created_at ?? "");
      });
  }, [reservations, recherche, filtre]);

  const totalPages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
  const pageSure = Math.min(page, totalPages);

  const visibles = filtrees.slice(
    (pageSure - 1) * PAR_PAGE,
    pageSure * PAR_PAGE
  );

  const statsCount = useMemo(() => {
    const counts: Record<string, number> = {
      tous: reservations.length,
    };

    reservations.forEach((r) => {
      counts[r.statut] = (counts[r.statut] ?? 0) + 1;
    });

    return counts;
  }, [reservations]);

  return (
    <div className="space-y-6 font-[family-name:var(--font-jakarta)]">
      {/* =========================================================
          MODAL DE GESTION DU PAIEMENT
      ========================================================= */}
      {reservationPaiement && (
        <ModalPaiement
          reservationId={reservationPaiement.id}
          nomClient={
            reservationPaiement.source === "manuel"
              ? reservationPaiement.nom_client_manuel || "Client"
              : `${reservationPaiement.profiles?.prenom ?? ""} ${reservationPaiement.profiles?.nom ?? ""
                }`.trim() || "Client"
          }
          prixTotal={reservationPaiement.prix_total ?? 0}
          montantPayeActuel={reservationPaiement.montant_paye ?? 0}
          ouvert={!!reservationPaiement}
          onFermer={() => setReservationPaiement(null)}
        />
      )}

      {/* =========================================================
          MODAL DE RESTITUTION DU VÉHICULE
      ========================================================= */}
      {reservationRetour && (
        <ModalRetourVehicule
          vehiculeId={
            reservationRetour.vehicule_id ||
            reservationRetour.vehicules?.id ||
            ""
          }
          marqueModele={
            reservationRetour.vehicules
              ? `${reservationRetour.vehicules.marque} ${reservationRetour.vehicules.modele}`
              : "Véhicule"
          }
          immatriculation={reservationRetour.vehicules?.immatriculation}
          kilometrageDepart={
            reservationRetour.vehicules?.kilometrage_actuel
          }
          reservationId={reservationRetour.id}
          nomClient={
            reservationRetour.source === "manuel"
              ? reservationRetour.nom_client_manuel || "Client"
              : `${reservationRetour.profiles?.prenom ?? ""} ${reservationRetour.profiles?.nom ?? ""
                }`.trim() || "Client"
          }
          soldeRestant={
            reservationRetour.prix_total != null &&
              reservationRetour.montant_paye != null
              ? Math.max(
                0,
                reservationRetour.prix_total -
                reservationRetour.montant_paye
              )
              : 0
          }
          ouvert={!!reservationRetour}
          onFermer={() => setReservationRetour(null)}
        />
      )}

      {/* =========================================================
          FILTRES
      ========================================================= */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {FILTRES.map((f) => {
            const count = statsCount[f.value] ?? 0;
            const actif = filtre === f.value;

            return (
              <button
                key={f.value}
                onClick={() => {
                  setFiltre(f.value);
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${actif
                  ? "bg-slate-900 text-white shadow-xs"
                  : "border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <span>{f.label}</span>

                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${actif
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un client, un véhicule, un téléphone ou un #ID…"
            className="w-full rounded-2xl border border-slate-200/90 bg-white py-3 pl-11 pr-4 text-xs font-medium text-slate-800 outline-none shadow-2xs transition focus:border-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* =========================================================
          LISTE DES RÉSERVATIONS
      ========================================================= */}
      {visibles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
          Aucune réservation ne correspond à vos critères.
        </div>
      ) : (
        <div className="space-y-4">
          {visibles.map((r) => {
            const st = STATUTS[r.statut] ?? {
              label: r.statut,
              variant: "neutral" as const,
              bordure: "border-l-slate-300",
            };

            const v = r.vehicules;
            const p = r.profiles;

            const nomClient =
              r.source === "manuel"
                ? r.nom_client_manuel ?? ""
                : `${p?.prenom ?? ""} ${p?.nom ?? ""}`.trim();

            const telephone =
              r.source === "manuel"
                ? r.telephone_client_manuel
                : p?.telephone ?? null;

            const vehiculeNom = v
              ? `${v.marque} ${v.modele}`
              : "Véhicule";

            const prixTotal = r.prix_total ?? 0;
            const montantPaye = r.montant_paye ?? 0;

            const soldeRestant = Math.max(
              0,
              prixTotal - montantPaye
            );

            const estComplet =
              montantPaye >= prixTotal && prixTotal > 0;

            const estAvance =
              montantPaye > 0 && montantPaye < prixTotal;

            const nbJ =
              r.date_debut && r.date_fin
                ? nombreDeJours(r.date_debut, r.date_fin)
                : 0;

            return (
              <div
                key={r.id}
                className={`card-lift group relative overflow-hidden rounded-3xl border border-slate-200/90 border-l-[6px] ${st.bordure} bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(280px,1.45fr)_minmax(220px,1fr)_minmax(130px,.65fr)_auto] xl:items-stretch xl:gap-0">

                    {/* =================================================
                        BLOC 1 — VÉHICULE + CLIENT
                    ================================================= */}
                    <div className="flex min-w-0 items-center gap-4 xl:pr-5">

                      {/* Image véhicule */}
                      <div className="relative h-[78px] w-[104px] shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100">
                        {v?.photos?.[0] ? (
                          <Image
                            src={v.photos[0]}
                            alt=""
                            fill
                            sizes="104px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Car
                              size={25}
                              className="text-slate-400"
                            />
                          </div>
                        )}

                        {v?.photos && v.photos.length > 1 && (
                          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                            +{v.photos.length - 1}
                          </span>
                        )}
                      </div>

                      {/* Informations */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[15px] font-extrabold tracking-tight text-slate-900">
                            {vehiculeNom}
                          </span>

                          {v?.immatriculation && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-slate-600">
                              {v.immatriculation}
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 flex min-w-0 items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-extrabold text-slate-600">
                            {(nomClient || "C")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">
                              {nomClient || "Client inconnu"}
                            </p>

                            {telephone && (
                              <p className="truncate text-[10px] font-medium text-slate-400">
                                {telephone}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] font-medium text-slate-400">
                            #{r.id.slice(0, 7).toUpperCase()}
                          </span>

                          <span className="h-1 w-1 rounded-full bg-slate-300" />

                          <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                            {r.source === "manuel"
                              ? "Manuelle"
                              : "En ligne"}
                          </span>

                          <Badge variant={st.variant}>
                            {st.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* =================================================
                        BLOC 2 — PÉRIODE + LIEUX
                    ================================================= */}
                    <div className="min-w-0 border-t border-slate-100 pt-4 xl:border-l xl:border-t-0 xl:px-5 xl:pt-0">
                      <div className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                        Location
                      </div>

                      <div className="flex max-w-full items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2">
                        <Calendar
                          size={14}
                          className="shrink-0 text-slate-500"
                        />

                        <span className="min-w-0 truncate text-[11px] font-extrabold text-slate-900">
                          {formaterPeriode(
                            r.date_debut,
                            r.date_fin
                          )}
                        </span>

                        {nbJ > 0 && (
                          <span className="shrink-0 rounded-md border border-slate-200/80 bg-white px-1.5 py-0.5 text-[9px] font-extrabold text-slate-600">
                            {nbJ} j
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {(r.heure_debut || r.heure_fin) && (
                          <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                            <Clock
                              size={12}
                              className="shrink-0 text-slate-400"
                            />

                            <span className="truncate">
                              {r.heure_debut
                                ? `Départ ${formaterHeure(
                                  r.heure_debut
                                )}`
                                : ""}

                              {r.heure_debut && r.heure_fin
                                ? " · "
                                : ""}

                              {r.heure_fin
                                ? `Retour ${formaterHeure(
                                  r.heure_fin
                                )}`
                                : ""}
                            </span>
                          </div>
                        )}

                        {(r.lieu_debut || r.lieu_fin) && (
                          <div className="flex items-start gap-2 text-[10px] font-medium text-slate-500">
                            <MapPin
                              size={12}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <span className="truncate">
                              {r.lieu_debut || "Lieu non défini"}

                              {r.lieu_fin &&
                                r.lieu_fin !== r.lieu_debut
                                ? ` → ${r.lieu_fin}`
                                : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* =================================================
                        BLOC 3 — FINANCES
                    ================================================= */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 xl:flex-col xl:items-start xl:justify-center xl:border-l xl:border-t-0 xl:px-5 xl:pt-0">
                      <div>
                        <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                          Total
                        </span>

                        <span className="mt-0.5 block whitespace-nowrap text-lg font-black tracking-tight text-slate-900">
                          {prixTotal.toLocaleString("fr-FR")}

                          <span className="ml-1 text-[10px] font-bold text-slate-400">
                            MAD
                          </span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setReservationPaiement(r)
                        }
                        disabled={impersonation}
                        className={`mt-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition hover:opacity-90 xl:mt-2.5 ${estComplet
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : estAvance
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                          }`}
                        title="Cliquer pour gérer ou enregistrer un règlement"
                      >
                        <Wallet size={11} />

                        <span>
                          {estComplet
                            ? "Payé"
                            : estAvance
                              ? `Reste ${soldeRestant.toLocaleString(
                                "fr-FR"
                              )} MAD`
                              : "Non payé"}
                        </span>
                      </button>
                    </div>

                    {/* =================================================
                        BLOC 4 — ACTIONS
                    ================================================= */}
                    <div className="flex flex-wrap items-center justify-start gap-2 border-t border-slate-100 pt-4 xl:justify-end xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                      {r.statut === "confirmee" && (
                        <button
                          type="button"
                          onClick={() =>
                            setReservationRetour(r)
                          }
                          className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                          title="Enregistrer la restitution du véhicule"
                        >
                          <RotateCcw
                            size={13}
                            strokeWidth={2.5}
                          />

                          <span>Retour</span>
                        </button>
                      )}

                      {r.statut === "en_attente" && (
                        <ActionsReservation
                          reservationId={r.id}
                          statut={r.statut}
                        />
                      )}

                      {telephone && (
                        <a
                          href={`tel:${telephone.replace(
                            /\s/g,
                            ""
                          )}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
                          title={`Appeler ${nomClient}`}
                        >
                          <Phone
                            size={14}
                            strokeWidth={2}
                          />
                        </a>
                      )}

                      {telephone && (
                        <ContactWhatsAppDropdown
                          telephone={telephone}
                          nomClient={nomClient}
                          vehiculeNom={vehiculeNom}
                          dateDebut={r.date_debut}
                          dateFin={r.date_fin}
                          heureDebut={r.heure_debut}
                          lieuDebut={r.lieu_debut}
                        />
                      )}

                      {r.source === "manuel" &&
                        !impersonation &&
                        r.statut !== "annulee" && (
                          <ContratMenuCompact
                            reservationId={r.id}
                            contratGenere={!!r.contrat_url}
                          />
                        )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          PAGINATION
      ========================================================= */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() =>
              setPage((p) => Math.max(1, p - 1))
            }
            disabled={pageSure === 1}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40"
          >
            Précédent
          </button>

          <span className="px-3 text-xs font-semibold text-slate-500">
            Page {pageSure} sur {totalPages}
          </span>

          <button
            onClick={() =>
              setPage((p) =>
                Math.min(totalPages, p + 1)
              )
            }
            disabled={pageSure === totalPages}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MENU WHATSAPP COMPACT
================================================================ */

function ContactWhatsAppDropdown({
  telephone,
  nomClient,
  vehiculeNom,
  dateDebut,
  dateFin,
  heureDebut,
  lieuDebut,
}: {
  telephone: string;
  nomClient: string;
  vehiculeNom: string;
  dateDebut: string;
  dateFin: string;
  heureDebut?: string | null;
  lieuDebut?: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function ext(e: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        setOuvert(false);
      }
    }

    document.addEventListener("mousedown", ext);

    return () =>
      document.removeEventListener("mousedown", ext);
  }, []);

  const periode = formaterPeriode(
    dateDebut,
    dateFin
  );

  const rdv = [
    lieuDebut
      ? `au lieu suivant : ${lieuDebut}`
      : null,
    heureDebut
      ? `à ${formaterHeure(heureDebut)}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  const modeles = [
    {
      label: "Confirmer la location",
      texte: `Bonjour ${nomClient}, votre location de ${vehiculeNom} (${periode}) est bien confirmée${rdv ? ` ${rdv}` : ""
        }. À bientôt !`,
    },
    {
      label: "Véhicule prêt",
      texte: `Bonjour ${nomClient}, votre ${vehiculeNom} est prête${lieuDebut ? ` (${lieuDebut})` : ""
        }. Vous pouvez venir la récupérer.`,
    },
    {
      label: "Demander CIN / Passeport",
      texte: `Bonjour ${nomClient}, pouvez-vous m'envoyer une photo de votre CIN ou passeport pour préparer le contrat ${vehiculeNom} ? Merci.`,
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
        title="Envoyer un WhatsApp au client"
      >
        <MessageCircle
          size={14}
          strokeWidth={2.5}
        />

        <span className="hidden sm:inline">
          WhatsApp
        </span>

        <ChevronDown
          size={11}
          className={
            ouvert ? "rotate-180" : ""
          }
        />
      </button>

      {ouvert && (
        <div className="absolute bottom-full right-0 z-30 mb-1.5 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Modèles rapides
          </div>

          {modeles.map((m, i) => (
            <a
              key={i}
              href={construireLienWhatsApp(
                telephone,
                m.texte
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOuvert(false)}
              className="block px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
            >
              {m.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MENU CONTRAT PDF COMPACT
================================================================ */

function ContratMenuCompact({
  reservationId,
  contratGenere,
}: {
  reservationId: string;
  contratGenere: boolean;
}) {
  const [isPending, startTransition] =
    useTransition();

  const [ouvert, setOuvert] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const toast = useToast();

  useEffect(() => {
    function ext(e: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node)
      ) {
        setOuvert(false);
      }
    }

    document.addEventListener("mousedown", ext);

    return () =>
      document.removeEventListener("mousedown", ext);
  }, []);

  function voir() {
    setOuvert(false);

    const fenetre = window.open("", "_blank");

    startTransition(async () => {
      try {
        const url =
          await obtenirLienContrat(
            reservationId
          );

        redirigerFenetre(fenetre, url);
      } catch (e) {
        fenetre?.close();

        toast.error(
          e instanceof Error
            ? e.message
            : "Erreur."
        );
      }
    });
  }

  function envoyerWhatsApp() {
    setOuvert(false);

    const fenetre = window.open("", "_blank");

    startTransition(async () => {
      try {
        const lien =
          await obtenirLienContratWhatsApp(
            reservationId
          );

        redirigerFenetre(fenetre, lien);
      } catch (e) {
        fenetre?.close();

        toast.error(
          e instanceof Error
            ? e.message
            : "Erreur."
        );
      }
    });
  }

  function regenerer() {
    setOuvert(false);

    startTransition(async () => {
      try {
        await regenererContrat(
          reservationId
        );

        toast.success(
          "Contrat mis à jour."
        );
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Erreur."
        );
      }
    });
  }

  if (!contratGenere) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={regenerer}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
        title="Générer le contrat de location"
      >
        <FileText size={14} />

        <span className="hidden sm:inline">
          Contrat
        </span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
        title="Options du contrat PDF"
      >
        <FileText
          size={14}
          className="text-slate-500"
        />

        <span className="hidden sm:inline">
          Contrat
        </span>

        <ChevronDown
          size={11}
          className={
            ouvert ? "rotate-180" : ""
          }
        />
      </button>

      {ouvert && (
        <div className="absolute bottom-full right-0 z-30 mb-1.5 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-xl">
          <button
            type="button"
            onClick={voir}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FileDown size={13} />

            Voir le PDF
          </button>

          <button
            type="button"
            onClick={envoyerWhatsApp}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            <MessageCircle size={13} />

            Envoyer par WhatsApp
          </button>

          <button
            type="button"
            onClick={regenerer}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-500 transition hover:bg-slate-50"
          >
            <RefreshCw size={12} />

            Regénérer le PDF
          </button>
        </div>
      )}
    </div>
  );
}