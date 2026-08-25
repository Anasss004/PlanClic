import { ajouterVehicule } from "@/app/actions/proprietaire";
import ImmatriculationInput from "@/components/ui/ImmatriculationInput";

export default async function NouveauVehiculePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-brand-dark">
        Ajouter un véhicule
      </h1>

      {params.erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          Impossible d&apos;ajouter ce véhicule. Vérifie les champs.
        </p>
      )}

      <form
        action={ajouterVehicule}
        className="space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Type</label>
            <select name="type" required className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-brand-dark">
              <option value="voiture">Voiture</option>
              <option value="moto">Moto</option>
              <option value="utilitaire">Utilitaire</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Ville</label>
            <input name="ville" required className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Marque</label>
            <input name="marque" required className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Modèle</label>
            <input name="modele" required className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Portes</label>
            <input name="portes" type="number" min={0} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Places</label>
            <input name="places" type="number" min={1} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Couleur</label>
            <input name="couleur" className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Carburant</label>
            <select name="carburant" className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-brand-dark">
              <option value="essence">Essence</option>
              <option value="diesel">Diesel</option>
              <option value="electrique">Électrique</option>
              <option value="hybride">Hybride</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Transmission</label>
            <select name="transmission" className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-brand-dark">
              <option value="manuelle">Manuelle</option>
              <option value="automatique">Automatique</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Immatriculation</label>
            <ImmatriculationInput />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Prix / jour (MAD)</label>
            <input name="prix_jour" type="number" min={0} step="0.01" required className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 p-4">
          <p className="mb-3 text-sm font-semibold text-brand-dark">
            Conditions de location (optionnel)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[#6a6a6a]">Km/jour inclus</label>
              <input name="km_inclus_jour" type="number" min={0} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6a6a6a]">Âge minimum</label>
              <input name="age_minimum" type="number" min={18} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6a6a6a]">Permis (mois min.)</label>
              <input name="anciennete_permis_mois" type="number" min={0} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 p-4">
          <label className="mb-1 block text-sm font-semibold text-brand-dark">
            Photos du véhicule
          </label>
          <p className="mb-2 text-xs text-[#6a6a6a]">
            Ces photos seront visibles publiquement sur l&apos;annonce.
          </p>
          <input type="file" name="photos" accept="image/*" multiple className="w-full text-sm" />
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95"
        >
          Publier le véhicule
        </button>
      </form>
    </div>
  );
}
