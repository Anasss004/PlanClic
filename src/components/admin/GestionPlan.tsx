"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, X } from "lucide-react";
import { creerPlan, modifierPlan, basculerPlanActif } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

type Plan = {
  id: string;
  nom: string;
  description: string | null;
  prix: number;
  periode: string;
  max_vehicules: number | null;
  acces_statistiques: boolean;
  mise_en_avant: boolean;
  actif: boolean;
};

function FormulairePlan({
  plan,
  onFermer,
}: {
  plan?: Plan;
  onFermer: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function soumettre(formData: FormData) {
    startTransition(async () => {
      try {
        if (plan) {
          await modifierPlan(plan.id, formData);
          toast.success("Plan modifié.");
        } else {
          await creerPlan(formData);
          toast.success("Plan créé.");
        }
        onFermer();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dash-dark">
            {plan ? "Modifier le plan" : "Nouveau plan"}
          </h2>
          <button onClick={onFermer} className="text-gray-400 hover:text-gray-600">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form action={soumettre} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">Nom</label>
            <input
              name="nom"
              defaultValue={plan?.nom}
              required
              className="w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">Description</label>
            <input
              name="description"
              defaultValue={plan?.description ?? ""}
              className="w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-dash-text-secondary">Prix (MAD)</label>
              <input
                name="prix"
                type="number"
                min={0}
                step="0.01"
                defaultValue={plan?.prix ?? 0}
                required
                className="w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-dash-text-secondary">Période</label>
              <select
                name="periode"
                defaultValue={plan?.periode ?? "mensuel"}
                className="w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark"
              >
                <option value="mensuel">Mensuel</option>
                <option value="annuel">Annuel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-dash-text-secondary">
              Véhicules max (vide = illimité)
            </label>
            <input
              name="max_vehicules"
              type="number"
              min={0}
              defaultValue={plan?.max_vehicules ?? ""}
              className="w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-dash-text">
              <input
                type="checkbox"
                name="acces_statistiques"
                defaultChecked={plan?.acces_statistiques}
                className="h-4 w-4 rounded border-dash-border"
              />
              Accès aux statistiques avancées
            </label>
            <label className="flex items-center gap-2 text-sm text-dash-text">
              <input
                type="checkbox"
                name="mise_en_avant"
                defaultChecked={plan?.mise_en_avant}
                className="h-4 w-4 rounded border-dash-border"
              />
              Mise en avant dans les résultats de recherche
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-dash-sidebar py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {plan ? "Enregistrer" : "Créer le plan"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function BoutonNouveauPlan() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-dash-accent px-5 py-2.5 text-sm font-semibold text-dash-text shadow transition hover:brightness-95"
      >
        <Plus size={16} strokeWidth={2} />
        Nouveau plan
      </button>
      {ouvert && <FormulairePlan onFermer={() => setOuvert(false)} />}
    </>
  );
}

export function BoutonModifierPlan({ plan }: { plan: Plan }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="flex items-center gap-1.5 rounded-lg border border-dash-border px-3 py-1.5 text-xs font-medium text-dash-text-secondary hover:bg-gray-50"
      >
        <Pencil size={13} strokeWidth={1.75} />
        Modifier
      </button>
      {ouvert && <FormulairePlan plan={plan} onFermer={() => setOuvert(false)} />}
    </>
  );
}

export function BoutonBasculerPlan({ planId, actif }: { planId: string; actif: boolean }) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function basculer() {
    startTransition(async () => {
      try {
        await basculerPlanActif(planId, actif);
        toast.success(actif ? "Plan désactivé." : "Plan réactivé.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={basculer}
      className="rounded-lg border border-dash-border px-3 py-1.5 text-xs font-medium text-dash-text-secondary hover:bg-gray-50 disabled:opacity-50"
    >
      {actif ? "Désactiver" : "Réactiver"}
    </button>
  );
}
