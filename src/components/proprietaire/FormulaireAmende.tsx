"use client";

import { useMemo, useState } from "react";
import { Search, UserCheck, UserX, Phone, CalendarRange } from "lucide-react";
import { signalerAmende } from "@/app/actions/proprietaire";
import DatePicker from "@/components/ui/DatePicker";
import SelecteurRecherchable from "@/components/ui/SelecteurRecherchable";
import { formaterPeriode } from "@/lib/dates";

export type VehiculeAmende = {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string | null;
  ville: string | null;
};

export type ReservationAmende = {
  id: string;
  vehicule_id: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  source: string;
  nom_client_manuel: string | null;
  telephone_client_manuel: string | null;
  profiles: { prenom: string | null; nom: string | null; telephone: string | null } | null;
};

export default function FormulaireAmende({
  vehicules,
  reservations,
  erreur,
}: {
  vehicules: VehiculeAmende[];
  reservations: ReservationAmende[];
  erreur?: string;
}) {
  const [vehiculeId, setVehiculeId] = useState("");
  const [dateAmende, setDateAmende] = useState("");

  const options = useMemo(
    () =>
      vehicules.map((v) => ({
        valeur: v.id,
        libelle: `${v.marque} ${v.modele}`,
        details: [v.immatriculation, v.ville].filter(Boolean).join(" · "),
      })),
    [vehicules]
  );

  // Réservation couvrant la date de l'amende pour ce véhicule.
  //
  // Les statuts "confirmee" ET "terminee" sont retenus : une amende arrive
  // très souvent après la fin de la location, s'en tenir aux réservations
  // en cours ferait perdre le locataire dès la clôture.
  //
  // Ce calcul n'est qu'un confort d'affichage : l'action serveur refait la
  // même recherche avant d'enregistrer, le navigateur ne fait pas autorité.
  const reservationTrouvee = useMemo(() => {
    if (!vehiculeId || !dateAmende) return null;
    const candidates = reservations.filter(
      (r) =>
        r.vehicule_id === vehiculeId &&
        ["confirmee", "terminee"].includes(r.statut) &&
        r.date_debut <= dateAmende &&
        r.date_fin >= dateAmende
    );
    // La plus récente si plusieurs se chevauchent — même règle que le serveur.
    return (
      candidates.sort((a, b) => b.date_debut.localeCompare(a.date_debut))[0] ?? null
    );
  }, [reservations, vehiculeId, dateAmende]);

  const client = useMemo(() => {
    if (!reservationTrouvee) return null;
    const r = reservationTrouvee;
    if (r.source === "manuel") {
      return {
        nom: r.nom_client_manuel?.trim() || "Client hors-ligne",
        telephone: r.telephone_client_manuel,
      };
    }
    const nom = `${r.profiles?.prenom ?? ""} ${r.profiles?.nom ?? ""}`.trim();
    return { nom: nom || "Client PlanClic", telephone: r.profiles?.telephone ?? null };
  }, [reservationTrouvee]);

  // On ne propose la saisie de secours qu'une fois les deux champs remplis et
  // la recherche infructueuse — sinon l'encart s'afficherait dès l'ouverture.
  const rechercheFaite = !!vehiculeId && !!dateAmende;
  const aucunClient = rechercheFaite && !reservationTrouvee;

  return (
    <form
      action={signalerAmende}
      className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      {erreur && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {erreur === "vehicule-introuvable"
            ? "Ce véhicule ne fait pas partie de votre flotte."
            : erreur === "champs-manquants"
              ? "Sélectionnez un véhicule et une date."
              : "Impossible d'enregistrer cette amende."}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Véhicule concerné
          </label>
          <SelecteurRecherchable
            name="vehicule_id"
            required
            options={options}
            valeur={vehiculeId}
            onChange={setVehiculeId}
            placeholder="Choisir un véhicule de la flotte"
            placeholderVide="Aucun véhicule ne correspond"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Date de l&apos;amende
          </label>
          <DatePicker
            name="date_amende"
            required
            theme="brand"
            value={dateAmende}
            onChange={setDateAmende}
          />
        </div>
      </div>

      {/* --- Locataire identifié automatiquement --- */}
      {client && reservationTrouvee && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <UserCheck size={17} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Locataire au moment de l&apos;amende
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-emerald-950">
              {client.nom}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-800">
              {client.telephone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={12} strokeWidth={2} />
                  {client.telephone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <CalendarRange size={12} strokeWidth={2} />
                {formaterPeriode(reservationTrouvee.date_debut, reservationTrouvee.date_fin)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- Aucune réservation : saisie manuelle de secours --- */}
      {aucunClient && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <UserX size={17} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900">
                Aucun client trouvé pour cette date
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                Ce véhicule n&apos;était pas loué ce jour-là, ou la location a
                été reçue hors PlanClic. Vous pouvez renseigner le locataire à
                la main — ou laisser vide et enregistrer quand même.
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  name="nom_client_manuel"
                  placeholder="Nom du locataire (optionnel)"
                  className="w-full rounded-full border border-amber-200 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-amber-500"
                />
                <input
                  name="telephone_client_manuel"
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  className="w-full rounded-full border border-amber-200 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={!rechercheFaite}
          className="flex items-center justify-center gap-1.5 rounded-full bg-brand-accent px-6 py-2.5 text-sm font-semibold text-brand-dark transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full"
        >
          <Search size={15} strokeWidth={2} />
          Enregistrer l&apos;amende
        </button>
      </div>
    </form>
  );
}
