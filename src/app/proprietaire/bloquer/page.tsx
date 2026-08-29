import { Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bloquerVehicule } from "@/app/actions/proprietaire";
import EmptyState from "@/components/ui/EmptyState";
import DatePicker from "@/components/ui/DatePicker";
import { Car } from "lucide-react";

export default async function BloquerVehiculePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; vehicule?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id, marque, modele, ville")
    .eq("proprietaire_id", user!.id)
    .is("deleted_at", null)
    .order("marque", { ascending: true });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-gray-900">
        <Ban size={22} strokeWidth={1.75} />
        Bloquer un véhicule
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Reçu une réservation ailleurs (téléphone, Instagram...) ? Bloque les
        dates ici pour qu&apos;elles n&apos;apparaissent plus disponibles sur PlanClic.
      </p>

      {sp.erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          Impossible de bloquer ce véhicule. Réessaie.
        </p>
      )}

      {!vehicules || vehicules.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule"
          description="Ajoute d'abord un véhicule pour pouvoir bloquer des dates."
        />
      ) : (
        <form
          action={bloquerVehicule}
          className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        >
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Véhicule
            </label>
            <select
              name="vehicule_id"
              required
              defaultValue={sp.vehicule ?? ""}
              className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-dark"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-dark">
                Date de début
              </label>
              <DatePicker name="date_debut" required theme="brand" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-dark">
                Date de fin
              </label>
              <DatePicker name="date_fin" required theme="brand" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Nom du client
            </label>
            <input
              name="nom_client"
              required
              className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-dark"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Téléphone (optionnel)
            </label>
            <input
              name="telephone_client"
              className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-dark"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition-all duration-200 hover:brightness-95 active:scale-[0.98]"
          >
            Bloquer ces dates
          </button>
        </form>
      )}
    </div>
  );
}
