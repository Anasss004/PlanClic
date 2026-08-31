"use client";

import { useMemo, useState } from "react";
import { Camera, Info, TriangleAlert } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import FileUpload from "@/components/ui/FileUpload";
import { creerLocationManuelle } from "@/app/actions/proprietaire";
import { nombreDeJours } from "@/lib/dates";

type Vehicule = { id: string; marque: string; modele: string; ville: string; prix_jour: number };

const champ =
  "w-full rounded-lg border border-dash-border px-3.5 py-2.5 text-sm text-dash-text outline-none focus:border-dash-dark";
const label = "mb-1 block text-sm font-semibold text-dash-dark";

type Remise = 0 | 10 | 20 | "libre";

export default function FormulaireNouvelleLocation({
  vehicules,
  vehiculePreselectionne,
}: {
  vehicules: Vehicule[];
  vehiculePreselectionne?: string;
}) {
  const [vehiculeId, setVehiculeId] = useState(vehiculePreselectionne ?? "");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [remise, setRemise] = useState<Remise>(0);
  const [prixLibre, setPrixLibre] = useState("");

  const prixJour = useMemo(
    () => vehicules.find((v) => v.id === vehiculeId)?.prix_jour ?? 0,
    [vehicules, vehiculeId]
  );
  const nbJours = dateDebut && dateFin ? nombreDeJours(dateDebut, dateFin) : 0;
  const prixAuto = prixJour * nbJours;

  const prixEffectif = useMemo(() => {
    if (remise === "libre") return Number(prixLibre) || 0;
    if (remise === 10) return Math.round(prixAuto * 0.9);
    if (remise === 20) return Math.round(prixAuto * 0.8);
    return prixAuto;
  }, [remise, prixLibre, prixAuto]);

  const prixBas = prixAuto > 0 && prixEffectif > 0 && prixEffectif < prixAuto * 0.5;

  return (
    <form
      action={creerLocationManuelle}
      className="space-y-5 rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]"
    >
      {/* --- Véhicule + dates + horaires + lieux --- */}
      <div>
        <label className={label}>Véhicule</label>
        <select
          name="vehicule_id"
          required
          value={vehiculeId}
          onChange={(e) => setVehiculeId(e.target.value)}
          className={champ}
        >
          <option value="" disabled>
            Choisir un véhicule
          </option>
          {vehicules.map((v) => (
            <option key={v.id} value={v.id}>
              {v.marque} {v.modele} — {v.ville} · {v.prix_jour} MAD/j
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Prise en charge</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <DatePicker name="date_debut" value={dateDebut} onChange={setDateDebut} required theme="dash" />
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
            placeholder="Lieu (ex : Agence, Aéroport Ménara…)"
            className={`${champ} mt-2`}
          />
        </div>
        <div>
          <label className={label}>Restitution</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <DatePicker name="date_fin" value={dateFin} onChange={setDateFin} required theme="dash" min={dateDebut || undefined} />
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
            placeholder="Lieu (si différent du départ)"
            className={`${champ} mt-2`}
          />
        </div>
      </div>

      {/* --- Client --- */}
      <div className="border-t border-dash-border pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
          Client
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Nom complet du client</label>
            <input name="nom_client" required className={champ} />
          </div>
          <div>
            <label className={label}>
              Téléphone <span className="font-normal text-dash-text-secondary">(optionnel)</span>
            </label>
            <input name="telephone_client" className={champ} />
          </div>
          <div>
            <label className={label}>
              CIN / Passeport <span className="font-normal text-dash-text-secondary">(optionnel)</span>
            </label>
            <input name="cin_client" className={champ} />
          </div>
        </div>
      </div>

      {/* --- Prix --- */}
      <div className="border-t border-dash-border pt-5">
        <label className={label}>Prix total (MAD)</label>

        {prixJour > 0 && nbJours > 0 ? (
          <p className="mb-2 flex items-center gap-1.5 text-sm text-dash-text-secondary">
            <Info size={14} strokeWidth={1.75} />
            {prixJour.toLocaleString("fr-FR")} MAD × {nbJours} jour{nbJours > 1 ? "s" : ""} ={" "}
            <span className="font-semibold text-dash-dark">
              {prixAuto.toLocaleString("fr-FR")} MAD
            </span>
          </p>
        ) : (
          <p className="mb-2 text-xs text-dash-text-secondary">
            Choisis un véhicule et les dates pour le calcul automatique.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {([0, 10, 20] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRemise(r)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                remise === r
                  ? "border-dash-dark bg-dash-dark text-white"
                  : "border-dash-border text-dash-text-secondary hover:bg-gray-50"
              }`}
            >
              {r === 0 ? "Tarif plein" : `−${r}%`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRemise("libre")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              remise === "libre"
                ? "border-dash-dark bg-dash-dark text-white"
                : "border-dash-border text-dash-text-secondary hover:bg-gray-50"
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
              placeholder="Montant"
              className={`${champ} max-w-[200px]`}
            />
          ) : (
            <div className="rounded-lg bg-dash-accent/15 px-4 py-2.5 text-lg font-bold text-dash-dark">
              {prixEffectif.toLocaleString("fr-FR")} MAD
            </div>
          )}
        </div>

        {/* Valeur réellement envoyée */}
        <input type="hidden" name="prix_total" value={prixEffectif || ""} />

        {prixBas && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <TriangleAlert size={13} className="mt-0.5 shrink-0" />
            Ce prix ({prixEffectif.toLocaleString("fr-FR")} MAD) semble bas par
            rapport au tarif habituel ({prixAuto.toLocaleString("fr-FR")} MAD).
            Tu peux valider si c&apos;est voulu.
          </p>
        )}
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
          intégrées au contrat.
        </p>
        <FileUpload name="photos_etat" accept="image/jpeg,image/png" multiple theme="dash" hint="JPEG ou PNG" />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-dash-accent py-3 text-sm font-semibold text-dash-text shadow transition hover:brightness-95 active:scale-[0.99]"
      >
        Enregistrer la location et générer le contrat
      </button>
    </form>
  );
}
