"use client";

import { useState, useTransition } from "react";
import { Megaphone } from "lucide-react";
import { diffuserAnnonce } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

const champ =
  "w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark";
const label = "mb-1 block text-xs font-medium text-dash-text-secondary";

export default function FormulaireAnnonce({
  plans,
}: {
  plans: { id: string; nom: string }[];
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [cible, setCible] = useState<"tous" | "plan">("tous");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");

  function soumettre(formData: FormData) {
    const titre = (formData.get("titre") as string)?.trim();
    const message = (formData.get("message") as string)?.trim();
    if (!titre || !message) {
      toast.error("Titre et message obligatoires.");
      return;
    }
    if (cible === "plan" && !planId) {
      toast.error("Sélectionnez un plan.");
      return;
    }
    startTransition(async () => {
      try {
        const n = await diffuserAnnonce(
          titre,
          message,
          cible,
          cible === "plan" ? planId : undefined
        );
        toast.success(`Annonce envoyée à ${n} agence(s).`);
        (document.getElementById("form-annonce") as HTMLFormElement)?.reset();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <form
      id="form-annonce"
      action={soumettre}
      className="rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]"
    >
      <div className="space-y-3">
        <div>
          <label className={label}>Titre</label>
          <input name="titre" required maxLength={120} className={champ} />
        </div>
        <div>
          <label className={label}>Message</label>
          <textarea name="message" required rows={4} maxLength={2000} className={champ} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Destinataires</label>
            <select
              value={cible}
              onChange={(e) => setCible(e.target.value as "tous" | "plan")}
              className={champ}
            >
              <option value="tous">Tous les propriétaires</option>
              <option value="plan">Propriétaires d&apos;un plan</option>
            </select>
          </div>
          {cible === "plan" && (
            <div>
              <label className={label}>Plan</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className={champ}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <p className="text-xs text-dash-text-secondary">
          L&apos;annonce apparaît dans le centre de notifications de l&apos;espace
          propriétaire. L&apos;envoi d&apos;un email associé n&apos;est pas encore
          disponible (système d&apos;emailing à construire).
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-dash-accent px-5 py-2.5 text-sm font-semibold text-dash-text hover:brightness-95 disabled:opacity-50"
        >
          <Megaphone size={15} strokeWidth={2} />
          {isPending ? "Envoi…" : "Diffuser l'annonce"}
        </button>
      </div>
    </form>
  );
}
