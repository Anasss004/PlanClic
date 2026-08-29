import { Settings, Info, Package, Check, X, Car, BarChart3, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { modifierProprietaire } from "@/app/actions/proprietaire";

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: proprietaire } = await supabase
    .from("proprietaires")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { count: nbVehiculesActuels } = await supabase
    .from("vehicules")
    .select("id", { count: "exact", head: true })
    .eq("proprietaire_id", user!.id)
    .is("deleted_at", null);

  const { data: planData } = await supabase.rpc("plan_actuel", { p_proprietaire_id: user!.id });
  const plan = planData?.[0];

  return (
    <div className="mx-auto max-w-3xl font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">
          Paramètres de l&apos;Agence
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Gérez les informations générales de votre agence.
        </p>
      </div>

      {/* Mon plan */}
      <div className="mb-6 rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dash-dark">
          <Package size={18} strokeWidth={1.75} />
          Mon plan
        </h2>

        {plan ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-bold text-dash-dark">{plan.nom}</p>
              <p className="text-sm text-dash-text-secondary">
                {nbVehiculesActuels ?? 0} véhicule(s) utilisé(s)
                {plan.max_vehicules != null ? ` sur ${plan.max_vehicules}` : " — illimité"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-dash-text">
                <Car size={14} strokeWidth={1.75} className="text-dash-text-secondary" />
                {plan.max_vehicules ?? "∞"}
              </span>
              <span className="flex items-center gap-1.5 text-dash-text">
                {plan.acces_statistiques ? (
                  <Check size={14} strokeWidth={2} className="text-emerald-600" />
                ) : (
                  <X size={14} strokeWidth={2} className="text-gray-300" />
                )}
                <BarChart3 size={14} strokeWidth={1.75} className="text-dash-text-secondary" />
              </span>
              <span className="flex items-center gap-1.5 text-dash-text">
                {plan.mise_en_avant ? (
                  <Check size={14} strokeWidth={2} className="text-emerald-600" />
                ) : (
                  <X size={14} strokeWidth={2} className="text-gray-300" />
                )}
                <Star size={14} strokeWidth={1.75} className="text-dash-text-secondary" />
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-dash-text-secondary">
            Aucun plan actif pour l&apos;instant. Contacte le support PlanClic.
          </p>
        )}

        <p className="mt-4 text-xs text-dash-text-secondary">
          Le changement de plan se fait pour l&apos;instant directement avec
          l&apos;équipe PlanClic (pas encore de paiement en ligne automatique).
        </p>
      </div>

      {sp.message && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          Modifications enregistrées.
        </p>
      )}
      {sp.erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          Impossible d&apos;enregistrer les modifications.
        </p>
      )}

      <div className="rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-dash-dark">
          <Settings size={18} strokeWidth={1.75} />
          Informations Générales
        </h2>

        <form action={modifierProprietaire} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
              Nom de l&apos;agence
            </label>
            <input
              name="nom_entreprise"
              defaultValue={proprietaire?.nom_entreprise}
              required
              className="w-full rounded-lg border border-dash-border px-4 py-2.5 text-sm outline-none focus:border-dash-dark"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
                Spécialité
              </label>
              <select
                name="specialite"
                defaultValue={proprietaire?.specialite}
                className="w-full rounded-lg border border-dash-border px-4 py-2.5 text-sm outline-none focus:border-dash-dark"
              >
                <option value="voitures_utilitaires">Voitures & utilitaires</option>
                <option value="motos">Motos</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
                Ville
              </label>
              <input
                name="ville"
                defaultValue={proprietaire?.ville}
                required
                className="w-full rounded-lg border border-dash-border px-4 py-2.5 text-sm outline-none focus:border-dash-dark"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
              Adresse de l&apos;agence
            </label>
            <input
              name="adresse"
              defaultValue={proprietaire?.adresse ?? ""}
              className="w-full rounded-lg border border-dash-border px-4 py-2.5 text-sm outline-none focus:border-dash-dark"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-dash-sidebar px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
          >
            Enregistrer les modifications
          </button>
        </form>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-dash-border bg-[#faf9fa] p-4 text-sm text-dash-text-secondary">
        <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        <p>
          La tarification avancée (assurances, cautions), les zones de livraison et la
          gestion d&apos;équipe multi-utilisateurs ne sont pas encore disponibles — un
          compte PlanClic correspond aujourd&apos;hui à un seul utilisateur par agence.
        </p>
      </div>
    </div>
  );
}
