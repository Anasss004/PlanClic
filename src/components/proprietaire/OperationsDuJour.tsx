"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  CalendarX2,
  AlertTriangle,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Car,
  CheckCircle2,
  ChevronRight,
  FileText,
  RotateCcw,
} from "lucide-react";
import dynamic from "next/dynamic";

// Modale chargée à la demande (rendue seulement une fois ouverte).
const ModalRetourVehicule = dynamic(
  () => import("@/components/proprietaire/ModalRetourVehicule"),
  { ssr: false }
);
import { construireLienWhatsApp } from "@/lib/whatsapp";
import { formaterHeure } from "@/lib/dates";

export type OperationItem = {
  id: string;
  vehiculeId?: string | null;
  kilometrageDepart?: number | null;
  dateDebut: string;
  dateFin: string;
  heureDebut?: string | null;
  heureFin?: string | null;
  lieuDebut?: string | null;
  lieuFin?: string | null;
  statut: string;
  source?: string | null;
  nomClient: string;
  telephoneClient?: string | null;
  marqueVehicule: string;
  modeleVehicule: string;
  immatriculationVehicule?: string | null;
  prixTotal?: number | null;
  montantPaye?: number | null;
};

interface OperationsDuJourProps {
  departs: OperationItem[];
  retours: OperationItem[];
  retards: OperationItem[];
}

export default function OperationsDuJour({
  departs,
  retours,
  retards,
}: OperationsDuJourProps) {
  const [onglet, setOnglet] = useState<"departs" | "retours" | "retards">(
    retards.length > 0 ? "retards" : "departs"
  );
  const [itemRetour, setItemRetour] = useState<OperationItem | null>(null);

  const totalActivites = departs.length + retours.length + retards.length;

  return (
    <div className="rounded-2xl border border-dash-border bg-white p-6 shadow-sm">
      {/* Modal de restitution de véhicule */}
      {itemRetour && (
        <ModalRetourVehicule
          vehiculeId={itemRetour.vehiculeId || itemRetour.id}
          marqueModele={`${itemRetour.marqueVehicule} ${itemRetour.modeleVehicule}`}
          immatriculation={itemRetour.immatriculationVehicule}
          kilometrageDepart={itemRetour.kilometrageDepart}
          reservationId={itemRetour.id}
          nomClient={itemRetour.nomClient}
          soldeRestant={
            itemRetour.prixTotal != null && itemRetour.montantPaye != null
              ? Math.max(0, itemRetour.prixTotal - itemRetour.montantPaye)
              : 0
          }
          ouvert={!!itemRetour}
          onFermer={() => setItemRetour(null)}
        />
      )}

      {/* En-tête de la carte */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-dash-accent/20 text-dash-dark">
              <CalendarCheck2 size={20} strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-dash-dark">
                Aujourd&apos;hui en agence
              </h2>
              <p className="text-xs text-dash-text-secondary">
                Gestion des départs, retours et retards du jour
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Onglets */}
        <div className="flex rounded-xl bg-gray-100/80 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setOnglet("departs")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              onglet === "departs"
                ? "bg-white text-dash-dark shadow-sm"
                : "text-dash-text-secondary hover:text-dash-dark"
            }`}
          >
            <CalendarCheck2 size={14} className="text-emerald-600" />
            Départs ({departs.length})
          </button>

          <button
            type="button"
            onClick={() => setOnglet("retours")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              onglet === "retours"
                ? "bg-white text-dash-dark shadow-sm"
                : "text-dash-text-secondary hover:text-dash-dark"
            }`}
          >
            <CalendarX2 size={14} className="text-sky-600" />
            Retours ({retours.length})
          </button>

          <button
            type="button"
            onClick={() => setOnglet("retards")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              onglet === "retards"
                ? "bg-rose-500 text-white shadow-sm font-bold"
                : retards.length > 0
                ? "text-rose-600 font-semibold"
                : "text-dash-text-secondary hover:text-dash-dark"
            }`}
          >
            <AlertTriangle size={14} />
            Retards ({retards.length})
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="mt-5">
        {totalActivites === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
              <CheckCircle2 size={24} strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-dash-dark">
              Aucun départ ni retour prévu pour aujourd&apos;hui
            </p>
            <p className="mt-1 text-xs text-dash-text-secondary max-w-sm">
              Votre flotte fonctionne comme prévu. Utilisez le bouton &quot;Nouvelle location&quot; pour enregistrer un contrat imprévu.
            </p>
          </div>
        ) : (
          <div>
            {/* Liste des départs du jour */}
            {onglet === "departs" && (
              <ListeOperations
                items={departs}
                type="depart"
                emptyMessage="Aucun départ prévu aujourd'hui."
                onMarquerRetour={setItemRetour}
              />
            )}

            {/* Liste des retours du jour */}
            {onglet === "retours" && (
              <ListeOperations
                items={retours}
                type="retour"
                emptyMessage="Aucun retour prévu aujourd'hui."
                onMarquerRetour={setItemRetour}
              />
            )}

            {/* Liste des retards */}
            {onglet === "retards" && (
              <ListeOperations
                items={retards}
                type="retard"
                emptyMessage="Aucun retard signalé. Tous les véhicules sont retournés dans les temps !"
                onMarquerRetour={setItemRetour}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ListeOperations({
  items,
  type,
  emptyMessage,
  onMarquerRetour,
}: {
  items: OperationItem[];
  type: "depart" | "retour" | "retard";
  emptyMessage: string;
  onMarquerRetour: (item: OperationItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-dash-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const msgWhatsApp =
          type === "depart"
            ? `Bonjour ${item.nomClient}, votre ${item.marqueVehicule} ${item.modeleVehicule} est prête pour votre location d'aujourd'hui. À quelle heure pensez-vous arriver ?`
            : type === "retour"
            ? `Bonjour ${item.nomClient}, nous vous rappelons que la restitution de la ${item.marqueVehicule} ${item.modeleVehicule} est prévue aujourd'hui. N'hésitez pas à nous contacter si besoin.`
            : `Bonjour ${item.nomClient}, la restitution de la ${item.marqueVehicule} ${item.modeleVehicule} prévue est dépassée. Pouvez-vous nous indiquer votre heure de retour ? Merci.`;

        const lienWhatsApp = item.telephoneClient
          ? construireLienWhatsApp(item.telephoneClient, msgWhatsApp)
          : null;

        return (
          <div
            key={item.id}
            className={`card-lift flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
              type === "retard"
                ? "border-rose-200/90 bg-rose-50/60 hover:border-rose-300"
                : "border-slate-200/80 bg-white hover:border-dash-accent/70"
            }`}
          >
            {/* Colonne véhicule & client */}
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                  type === "retard"
                    ? "bg-rose-100 text-rose-700"
                    : type === "depart"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-sky-100 text-sky-800"
                }`}
              >
                <Car size={18} strokeWidth={2} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-dash-dark">
                    {item.marqueVehicule} {item.modeleVehicule}
                  </p>
                  {item.immatriculationVehicule && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-gray-600">
                      {item.immatriculationVehicule}
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs text-dash-text-secondary truncate">
                  Client : <span className="font-semibold text-dash-dark">{item.nomClient}</span>
                  {item.prixTotal != null && (
                    <span className="ml-2 font-semibold text-dash-dark">
                      · {item.prixTotal.toLocaleString("fr-FR")} MAD
                    </span>
                  )}
                  {item.prixTotal != null && (
                    <span className="ml-2">
                      {((item.montantPaye ?? 0) >= item.prixTotal && item.prixTotal > 0) ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800 text-[10px]">
                          Payé
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900 text-[10px]">
                          Reste {Math.max(0, item.prixTotal - (item.montantPaye ?? 0)).toLocaleString("fr-FR")} MAD
                        </span>
                      )}
                    </span>
                  )}
                </p>

                {/* Heure et lieu */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dash-text-secondary">
                  {(type === "depart" ? item.heureDebut : item.heureFin) && (
                    <span className="flex items-center gap-1 font-medium text-dash-dark">
                      <Clock size={12} className="text-dash-muted" />
                      {type === "depart" ? "Départ à" : "Retour à"}{" "}
                      {formaterHeure(type === "depart" ? item.heureDebut : item.heureFin)}
                    </span>
                  )}
                  {(type === "depart" ? item.lieuDebut : item.lieuFin) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-dash-muted" />
                      {type === "depart" ? item.lieuDebut : item.lieuFin}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 sm:border-t-0 sm:pt-0 shrink-0">
              {/* Bouton direct "Marquer retourné" pour retours et retards */}
              {(type === "retour" || type === "retard") && (
                <button
                  type="button"
                  onClick={() => onMarquerRetour(item)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
                  title="Enregistrer la restitution du véhicule"
                >
                  <RotateCcw size={13} strokeWidth={2.5} />
                  <span>Marquer retourné</span>
                </button>
              )}

              {item.telephoneClient && (
                <>
                  <a
                    href={`tel:${item.telephoneClient.replace(/\s/g, "")}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-dash-text-secondary transition hover:bg-gray-50 hover:text-dash-dark"
                    title="Appeler le client"
                  >
                    <Phone size={15} strokeWidth={2} />
                  </a>

                  {lienWhatsApp && (
                    <a
                      href={lienWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                      title="Contacter sur WhatsApp"
                    >
                      <MessageCircle size={14} strokeWidth={2.5} />
                      WhatsApp
                    </a>
                  )}
                </>
              )}

              <Link
                href={`/proprietaire/reservations`}
                className="flex items-center gap-1 rounded-lg border border-dash-border bg-white px-3 py-2 text-xs font-semibold text-dash-dark transition hover:bg-gray-50"
              >
                <FileText size={14} strokeWidth={1.75} />
                Fiche
                <ChevronRight size={13} strokeWidth={2} />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
