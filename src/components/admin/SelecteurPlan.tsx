"use client";

import { useTransition } from "react";
import { assignerPlan } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

export default function SelecteurPlan({
  proprietaireId,
  planActuelId,
  plans,
}: {
  proprietaireId: string;
  planActuelId?: string;
  plans: { id: string; nom: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function changer(planId: string) {
    if (!planId || planId === planActuelId) return;
    startTransition(async () => {
      try {
        await assignerPlan(proprietaireId, planId);
        toast.success("Plan mis à jour.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <select
      disabled={isPending}
      defaultValue={planActuelId ?? ""}
      onChange={(e) => changer(e.target.value)}
      className="rounded-lg border border-dash-border px-3 py-1.5 text-xs font-medium text-dash-text outline-none disabled:opacity-50"
    >
      <option value="" disabled>
        Aucun plan
      </option>
      {plans.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nom}
        </option>
      ))}
    </select>
  );
}
