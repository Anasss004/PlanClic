import { TriangleAlert, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signalerAmende } from "@/app/actions/proprietaire";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import ImmatriculationInput from "@/components/ui/ImmatriculationInput";
import DatePicker from "@/components/ui/DatePicker";

export default async function AmendesPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: amendes } = await supabase
    .from("amendes")
    .select("id, date_amende, numero_immatriculation, reservation_id, reservations(id, profiles(prenom, nom))")
    .eq("proprietaire_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Amendes
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Retrouvez automatiquement le locataire concerné par une amende.
        </p>
      </div>

      <form
        action={signalerAmende}
        className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
      >
        {params.erreur && (
          <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {params.erreur === "vehicule-introuvable"
              ? "Aucun véhicule trouvé avec cette immatriculation."
              : "Impossible d'enregistrer cette amende."}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Date de l&apos;amende
            </label>
            <DatePicker name="date_amende" required theme="brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Immatriculation
            </label>
            <ImmatriculationInput name="numero_immatriculation" />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-accent px-6 py-2.5 text-sm font-semibold text-brand-dark sm:w-auto"
            >
              <Search size={15} strokeWidth={2} />
              Rechercher
            </button>
          </div>
        </div>
      </form>

      {!amendes || amendes.length === 0 ? (
        <EmptyState
          icon={TriangleAlert}
          title="Aucune amende enregistrée"
          description="Les amendes que vous signalez apparaîtront ici, avec le locataire identifié automatiquement."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {amendes.map((a, i) => (
            <div
              key={a.id}
              className={`flex items-center justify-between px-5 py-4 ${
                i !== 0 ? "border-t border-gray-100" : ""
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {a.numero_immatriculation}
                </p>
                <p className="text-xs text-gray-500">{a.date_amende}</p>
              </div>
              {a.reservation_id ? (
                <Badge variant="success">
                  {/* @ts-expect-error - relation typing simplifié */}
                  {a.reservations?.profiles?.prenom} {a.reservations?.profiles?.nom}
                </Badge>
              ) : (
                <Badge variant="neutral">Locataire non identifié</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
