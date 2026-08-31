import { FilePlus2, Car, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import { creerLocationManuelle } from "@/app/actions/proprietaire";
import EmptyState from "@/components/ui/EmptyState";
import DatePicker from "@/components/ui/DatePicker";
import FileUpload from "@/components/ui/FileUpload";

const ERREURS: Record<string, string> = {
  creation:
    "La location n'a pas pu être enregistrée. Vérifie les dates (chevauchement possible avec une réservation existante).",
  "champs-manquants": "Merci de renseigner le véhicule, les dates et le nom du client.",
};

const champ =
  "w-full rounded-lg border border-dash-border px-3.5 py-2.5 text-sm text-dash-text outline-none focus:border-dash-dark";
const label = "mb-1 block text-sm font-semibold text-dash-dark";

export default async function NouvelleLocationPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; vehicule?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id: pid } = await resoudreProprietaireId(user!.id);

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id, marque, modele, ville")
    .eq("proprietaire_id", pid)
    .is("deleted_at", null)
    .order("marque", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl font-[family-name:var(--font-jakarta)]">
      <h1 className="mb-1 flex items-center gap-2 text-[32px] font-bold tracking-tight text-dash-dark">
        <FilePlus2 size={26} strokeWidth={1.75} />
        Nouvelle location
      </h1>
      <p className="mb-6 text-sm text-dash-text-secondary">
        Enregistre une location reçue hors PlanClic (téléphone, Instagram,
        agence). Les dates sont bloquées sur le calendrier et un contrat PDF est
        généré automatiquement.
      </p>

      {sp.erreur && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {ERREURS[sp.erreur] ?? "Une erreur est survenue. Réessaie."}
        </p>
      )}

      {!vehicules || vehicules.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule"
          description="Ajoute d'abord un véhicule pour pouvoir enregistrer une location."
        />
      ) : (
        <form
          action={creerLocationManuelle}
          className="space-y-5 rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]"
        >
          <div>
            <label className={label}>Véhicule</label>
            <select
              name="vehicule_id"
              required
              defaultValue={sp.vehicule ?? ""}
              className={champ}
            >
              <option value="" disabled>
                Choisir un véhicule
              </option>
              {vehicules.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.marque} {v.modele} — {v.ville}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Date de début</label>
              <DatePicker name="date_debut" required theme="dash" />
            </div>
            <div>
              <label className={label}>Date de fin</label>
              <DatePicker name="date_fin" required theme="dash" />
            </div>
          </div>

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
                  Téléphone{" "}
                  <span className="font-normal text-dash-text-secondary">(optionnel)</span>
                </label>
                <input name="telephone_client" className={champ} />
              </div>
              <div>
                <label className={label}>
                  CIN / Passeport{" "}
                  <span className="font-normal text-dash-text-secondary">(optionnel)</span>
                </label>
                <input name="cin_client" className={champ} />
              </div>
            </div>
          </div>

          <div className="border-t border-dash-border pt-5">
            <label className={label}>
              Prix total{" "}
              <span className="font-normal text-dash-text-secondary">(MAD, optionnel)</span>
            </label>
            <input
              name="prix_total"
              type="number"
              min={0}
              step="1"
              className={`${champ} max-w-[200px]`}
            />
            <p className="mt-1 text-xs text-dash-text-secondary">
              Renseigné, il apparaît sur le contrat et compte dans ton chiffre
              d&apos;affaires une fois la location marquée « terminée ».
            </p>
          </div>

          <div className="border-t border-dash-border pt-5">
            <label className={label}>
              <span className="flex items-center gap-1.5">
                <Camera size={15} strokeWidth={1.75} />
                Photos d&apos;état des lieux
              </span>
            </label>
            <p className="mb-3 text-xs text-dash-text-secondary">
              Recommandé : au moins une photo <strong>extérieure</strong> du
              véhicule et une photo du <strong>compteur kilométrique</strong>.
              Elles sont intégrées au contrat.
            </p>
            <FileUpload
              name="photos_etat"
              accept="image/jpeg,image/png"
              multiple
              theme="dash"
              hint="JPEG ou PNG"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-dash-accent py-3 text-sm font-semibold text-dash-text shadow transition hover:brightness-95 active:scale-[0.99]"
          >
            Enregistrer la location et générer le contrat
          </button>
        </form>
      )}
    </div>
  );
}
