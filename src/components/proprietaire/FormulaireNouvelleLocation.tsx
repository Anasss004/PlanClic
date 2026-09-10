"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Info, TriangleAlert, Wrench, ShieldAlert, CalendarX2 } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import FileUpload from "@/components/ui/FileUpload";
import { creerLocationManuelle } from "@/app/actions/proprietaire";
import { nombreDeJours, formaterDate } from "@/lib/dates";

type Vehicule = {
  id: string;
  marque: string;
  modele: string;
  immatriculation?: string | null;
  ville: string;
  prix_jour: number;
  statut_operationnel?: string | null;
};

type ReservationExistante = {
  vehicule_id: string;
  date_debut: string;
  date_fin: string;
  statut: string;
};

const champ =
  "w-full rounded-xl border border-dash-border px-3.5 py-2.5 text-sm text-dash-text outline-none focus:border-dash-dark shadow-2xs";
const label = "mb-1.5 block text-xs font-bold text-dash-dark";

type Remise = 0 | 10 | 20 | "libre";

function genererDatesIntervalle(debut: string, fin: string): string[] {
  const dates: string[] = [];
  const curr = new Date(debut + "T00:00:00");
  const end = new Date(fin + "T00:00:00");
  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

export default function FormulaireNouvelleLocation({
  vehicules,
  reservationsExistantes = [],
  vehiculePreselectionne,
}: {
  vehicules: Vehicule[];
  reservationsExistantes?: ReservationExistante[];
  vehiculePreselectionne?: string;
}) {
  const [vehiculeId, setVehiculeId] = useState(vehiculePreselectionne ?? "");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [remise, setRemise] = useState<Remise>(0);
  const [prixLibre, setPrixLibre] = useState("");
  const [montantPaye, setMontantPaye] = useState("");

  const vehiculeSelectionne = useMemo(
    () => vehicules.find((v) => v.id === vehiculeId),
    [vehicules, vehiculeId]
  );

  const estEnMaintenance = vehiculeSelectionne?.statut_operationnel === "maintenance";

  // Réservations actives du véhicule sélectionné
  const reservationsDuVehicule = useMemo(
    () => reservationsExistantes.filter((r) => r.vehicule_id === vehiculeId),
    [reservationsExistantes, vehiculeId]
  );

  // Toutes les dates déjà bloquées pour ce véhicule
  const datesOccupees = useMemo(() => {
    const datesSet = new Set<string>();
    reservationsDuVehicule.forEach((r) => {
      const intervalle = genererDatesIntervalle(r.date_debut, r.date_fin);
      intervalle.forEach((d) => datesSet.add(d));
    });
    return Array.from(datesSet);
  }, [reservationsDuVehicule]);

  // Détection du chevauchement de dates
  const conflitReservation = useMemo(() => {
    if (!dateDebut || !dateFin) return null;
    return (
      reservationsDuVehicule.find(
        (r) => !(r.date_fin < dateDebut || r.date_debut > dateFin)
      ) ?? null
    );
  }, [dateDebut, dateFin, reservationsDuVehicule]);

  const prixJour = vehiculeSelectionne?.prix_jour ?? 0;
  const nbJours = dateDebut && dateFin ? nombreDeJours(dateDebut, dateFin) : 0;
  const prixAuto = prixJour * nbJours;

  const prixEffectif = useMemo(() => {
    if (remise === "libre") return Number(prixLibre) || 0;
    if (remise === 10) return Math.round(prixAuto * 0.9);
    if (remise === 20) return Math.round(prixAuto * 0.8);
    return prixAuto;
  }, [remise, prixLibre, prixAuto]);

  const soldeRestant = Math.max(0, prixEffectif - (Number(montantPaye) || 0));
  const prixBas = prixAuto > 0 && prixEffectif > 0 && prixEffectif < prixAuto * 0.5;

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const formulaireBloque = estEnMaintenance || !!conflitReservation;

  return (
    <form
      action={creerLocationManuelle}
      className="space-y-6 rounded-2xl border border-dash-border bg-white p-6 shadow-sm"
    >
      {/* --- Alerte véhicule en maintenance --- */}
      {estEnMaintenance && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800">
            <Wrench size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">
              Véhicule actuellement en maintenance
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              La <strong>{vehiculeSelectionne?.marque} {vehiculeSelectionne?.modele}</strong> est actuellement marquée au garage / en révision. 
              Pour pouvoir créer une réservation, rendez-vous dans{" "}
              <Link href="/proprietaire/vehicules" className="underline font-bold hover:text-amber-950">
                Ma Flotte
              </Link>{" "}
              et remettez le véhicule en statut &quot;Disponible&quot;.
            </p>
          </div>
        </div>
      )}

      {/* --- Alerte conflit de chevauchement de dates --- */}
      {conflitReservation && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-rose-900 shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-200/80 text-rose-800">
            <CalendarX2 size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-900">
              Chevauchement de dates impossible
            </h4>
            <p className="text-xs text-rose-800 mt-0.5">
              Ce véhicule est déjà réservé du{" "}
              <strong>{formaterDate(conflitReservation.date_debut)}</strong> au{" "}
              <strong>{formaterDate(conflitReservation.date_fin)}</strong>. 
              Veuillez sélectionner d&apos;autres dates ou un autre véhicule disponible.
            </p>
          </div>
        </div>
      )}

      {/* --- Véhicule + dates + horaires + lieux --- */}
      <div>
        <label className={label}>Véhicule</label>
        <select
          name="vehicule_id"
          required
          value={vehiculeId}
          onChange={(e) => {
            setVehiculeId(e.target.value);
            setDateDebut("");
            setDateFin("");
          }}
          className={champ}
        >
          <option value="" disabled>
            Choisir un véhicule de la flotte
          </option>
          {vehicules.map((v) => {
            const enMaint = v.statut_operationnel === "maintenance";
            return (
              <option key={v.id} value={v.id} className={enMaint ? "text-amber-800 bg-amber-50" : ""}>
                {enMaint ? "🛠️ [EN MAINTENANCE] " : ""}{v.marque} {v.modele} {v.immatriculation ? `(${v.immatriculation})` : ""} — {v.ville} · {v.prix_jour} MAD/j
              </option>
            );
          })}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Date et heure de prise en charge</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <DatePicker
                name="date_debut"
                value={dateDebut}
                onChange={setDateDebut}
                min={aujourdhui}
                datesDesactivees={datesOccupees}
                required
                theme="dash"
              />
            </div>
            <input
              type="time"
              name="heure_debut"
              aria-label="Heure de prise en charge"
              className={`${champ} w-28`}
            />
          </div>
          <input
            name="lieu_debut"
            placeholder="Lieu de départ (ex : Agence, Aéroport…)"
            className={`${champ} mt-2`}
          />
        </div>
        <div>
          <label className={label}>Date et heure de restitution</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <DatePicker
                name="date_fin"
                value={dateFin}
                onChange={setDateFin}
                min={dateDebut || aujourdhui}
                datesDesactivees={datesOccupees}
                required
                theme="dash"
              />
            </div>
            <input
              type="time"
              name="heure_fin"
              aria-label="Heure de restitution"
              className={`${champ} w-28`}
            />
          </div>
          <input
            name="lieu_fin"
            placeholder="Lieu de restitution (si différent)"
            className={`${champ} mt-2`}
          />
        </div>
      </div>

      {datesOccupees.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2 text-xs text-slate-600 border border-slate-200/80">
          <Info size={14} className="text-slate-500 shrink-0" />
          <span>
            Les dates déjà réservées pour ce véhicule sont automatiquement barrées et bloquées dans le calendrier.
          </span>
        </div>
      )}

      {/* --- Client --- */}
      <div className="border-t border-dash-border pt-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-dash-text-secondary">
          Informations du Client
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Nom complet du client</label>
            <input name="nom_client" placeholder="Ex: Mohamed Alami" required className={champ} />
          </div>
          <div>
            <label className={label}>
              Téléphone <span className="font-normal text-dash-text-secondary">(optionnel)</span>
            </label>
            <input name="telephone_client" placeholder="+212 6..." className={champ} />
          </div>
          <div>
            <label className={label}>
              CIN / Passeport <span className="font-normal text-dash-text-secondary">(optionnel)</span>
            </label>
            <input name="cin_client" placeholder="Ex: AB123456" className={champ} />
          </div>
        </div>
      </div>

      {/* --- Prix & Tarification --- */}
      <div className="border-t border-dash-border pt-5">
        <label className={label}>Tarification de la location (MAD)</label>

        {prixJour > 0 && nbJours > 0 ? (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-dash-text-secondary">
            <Info size={14} strokeWidth={1.75} />
            {prixJour.toLocaleString("fr-FR")} MAD × {nbJours} jour{nbJours > 1 ? "s" : ""} ={" "}
            <span className="font-bold text-dash-dark">
              {prixAuto.toLocaleString("fr-FR")} MAD
            </span>
          </p>
        ) : (
          <p className="mb-2 text-xs text-dash-text-secondary">
            Choisissez un véhicule et les dates pour calculer le montant total.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {([0, 10, 20] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRemise(r)}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                remise === r
                  ? "border-dash-dark bg-dash-dark text-white shadow-2xs"
                  : "border-dash-border bg-white text-dash-text-secondary hover:bg-gray-50"
              }`}
            >
              {r === 0 ? "Tarif plein" : `−${r}%`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRemise("libre")}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
              remise === "libre"
                ? "border-dash-dark bg-dash-dark text-white shadow-2xs"
                : "border-dash-border bg-white text-dash-text-secondary hover:bg-gray-50"
            }`}
          >
            Prix libre
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          {remise === "libre" ? (
            <input
              type="number"
              min={0}
              step="1"
              value={prixLibre}
              onChange={(e) => setPrixLibre(e.target.value)}
              placeholder="Montant total en MAD"
              className={`${champ} max-w-[220px]`}
            />
          ) : (
            <div className="rounded-xl bg-dash-accent/15 px-4 py-2 text-lg font-bold text-dash-dark border border-dash-accent/30">
              {prixEffectif.toLocaleString("fr-FR")} MAD
            </div>
          )}
        </div>

        {/* Valeur réellement envoyée */}
        <input type="hidden" name="prix_total" value={prixEffectif || ""} />

        {prixBas && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 border border-amber-200">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            Ce prix ({prixEffectif.toLocaleString("fr-FR")} MAD) semble inférieur de plus de 50% au tarif standard ({prixAuto.toLocaleString("fr-FR")} MAD).
          </p>
        )}

        {/* --- Avance / Acompte versé & Solde restant --- */}
        <div className="mt-5 rounded-2xl border border-dash-border bg-gray-50/70 p-4 space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>
                Avance / Acompte perçu à la réservation (MAD)
              </label>
              <input
                type="number"
                name="montant_paye"
                min={0}
                max={prixEffectif || 999999}
                step="10"
                placeholder="0"
                value={montantPaye}
                onChange={(e) => setMontantPaye(e.target.value)}
                className={champ}
              />
              <p className="mt-1 text-[11px] text-dash-text-secondary">
                Laissez à 0 si le client réglera la totalité à la prise en charge.
              </p>
            </div>

            <div>
              <label className={label}>
                Solde restant dû
              </label>
              <div className={`flex h-[42px] items-center rounded-xl border px-3.5 text-xs font-bold ${
                soldeRestant > 0
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}>
                {soldeRestant > 0
                  ? `${soldeRestant.toLocaleString("fr-FR")} MAD restant à percevoir`
                  : "Payé en totalité (0 MAD restant)"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Photos état des lieux --- */}
      <div className="border-t border-dash-border pt-5">
        <label className={label}>
          <span className="flex items-center gap-1.5">
            <Camera size={15} strokeWidth={1.75} />
            Photos d&apos;état des lieux
          </span>
        </label>
        <p className="mb-3 text-xs text-dash-text-secondary">
          Recommandé : au moins une photo <strong>extérieure</strong> du véhicule
          et une photo du <strong>compteur kilométrique</strong>. Elles sont
          intégrées au contrat PDF.
        </p>
        <FileUpload name="photos_etat" accept="image/jpeg,image/png" multiple theme="dash" hint="JPEG ou PNG" />
      </div>

      <button
        type="submit"
        disabled={formulaireBloque}
        className="w-full rounded-xl bg-dash-accent py-3.5 text-sm font-bold text-dash-text shadow-sm transition hover:brightness-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {estEnMaintenance
          ? "Impossible : Véhicule en maintenance"
          : conflitReservation
          ? "Impossible : Dates déjà réservées"
          : "Enregistrer la location et générer le contrat"}
      </button>
    </form>
  );
}
