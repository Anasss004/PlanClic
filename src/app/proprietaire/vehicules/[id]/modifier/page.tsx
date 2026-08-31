import { createClient } from "@/lib/supabase/server";
import { modifierVehicule } from "@/app/actions/proprietaire";
import FileUpload from "@/components/ui/FileUpload";
import GestionPhotosVehicule from "@/components/proprietaire/GestionPhotosVehicule";

export default async function ModifierVehiculePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: vehicule } = await supabase
    .from("vehicules")
    .select("*")
    .eq("id", id)
    .single();

  if (!vehicule) {
    return <p className="text-sm text-gray-500">Véhicule introuvable.</p>;
  }

  const modifierAvecId = modifierVehicule.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-brand-dark">
        Modifier {vehicule.marque} {vehicule.modele}
      </h1>

      {sp.erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          Impossible d&apos;enregistrer les modifications.
        </p>
      )}

      <form
        action={modifierAvecId}
        className="space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-semibold text-brand-dark">Photos</label>
          <GestionPhotosVehicule vehiculeId={id} photos={vehicule.photos ?? []} />
          <p className="mb-2 text-xs text-[#6a6a6a]">
            Survole une photo pour la supprimer ou la mettre en couverture (la
            photo de couverture s&apos;affiche en premier sur les annonces). Les
            nouvelles photos ci-dessous s&apos;ajoutent aux existantes.
          </p>
          <FileUpload name="photos" accept="image/*" multiple theme="brand" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Marque</label>
            <input name="marque" defaultValue={vehicule.marque} required className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Modèle</label>
            <input name="modele" defaultValue={vehicule.modele} required className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Portes</label>
            <input name="portes" type="number" min={0} defaultValue={vehicule.portes ?? ""} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Places</label>
            <input name="places" type="number" min={1} defaultValue={vehicule.places ?? ""} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Couleur</label>
            <input name="couleur" defaultValue={vehicule.couleur ?? ""} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Carburant</label>
            <select name="carburant" defaultValue={vehicule.carburant ?? ""} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900">
              <option value="essence">Essence</option>
              <option value="diesel">Diesel</option>
              <option value="electrique">Électrique</option>
              <option value="hybride">Hybride</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Transmission</label>
            <select name="transmission" defaultValue={vehicule.transmission ?? ""} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900">
              <option value="manuelle">Manuelle</option>
              <option value="automatique">Automatique</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Ville</label>
            <input name="ville" defaultValue={vehicule.ville} required className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">Prix / jour (MAD)</label>
            <input name="prix_jour" type="number" min={0} step="0.01" defaultValue={vehicule.prix_jour} required className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-brand-dark">Kilométrage actuel</label>
          <input name="kilometrage_actuel" type="number" min={0} defaultValue={vehicule.kilometrage_actuel ?? ""} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
        </div>

        <div className="rounded-2xl border border-gray-100 p-4">
          <p className="mb-3 text-sm font-semibold text-brand-dark">
            Conditions de location (optionnel)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[#6a6a6a]">Km/jour inclus</label>
              <input name="km_inclus_jour" type="number" min={0} defaultValue={vehicule.km_inclus_jour ?? ""} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6a6a6a]">Âge minimum</label>
              <input name="age_minimum" type="number" min={18} defaultValue={vehicule.age_minimum ?? ""} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6a6a6a]">Permis (mois min.)</label>
              <input name="anciennete_permis_mois" type="number" min={0} defaultValue={vehicule.anciennete_permis_mois ?? ""} className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95"
        >
          Enregistrer les modifications
        </button>
      </form>
    </div>
  );
}
