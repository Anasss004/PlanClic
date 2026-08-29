import Link from "next/link";
import { CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import SelecteurPlan from "@/components/admin/SelecteurPlan";

export default async function AdminAbonnementsPage() {
  const supabase = await createClient();

  const { data: proprietaires } = await supabase
    .from("proprietaires")
    .select("id, nom_entreprise, statut_verification")
    .order("nom_entreprise", { ascending: true });

  const { data: plans } = await supabase
    .from("plans")
    .select("id, nom")
    .eq("actif", true)
    .order("prix", { ascending: true });

  // Plan actif de chaque propriétaire — une requête groupée plutôt
  // qu'un appel RPC par ligne.
  const { data: abonnementsActifs } = await supabase
    .from("abonnements")
    .select("proprietaire_id, plan_id, plans(nom)")
    .eq("statut", "actif");

  const planParProprietaire = new Map(
    (abonnementsActifs ?? []).map((a) => [a.proprietaire_id, a])
  );

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">Abonnements</h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Attribution manuelle des plans (pas de paiement automatique pour
          l&apos;instant).
        </p>
      </div>

      {!proprietaires || proprietaires.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Aucun propriétaire"
          description="Les comptes propriétaires apparaîtront ici une fois inscrits."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-dash-border bg-white shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
          {proprietaires.map((p, i) => {
            const abonnement = planParProprietaire.get(p.id);
            const planActuel = Array.isArray(abonnement?.plans) ? abonnement.plans[0] : abonnement?.plans;

            return (
              <div
                key={p.id}
                className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                  i !== 0 ? "border-t border-dash-border" : ""
                }`}
              >
                <div>
                  <Link
                    href={`/admin/agences/${p.id}`}
                    className="text-sm font-semibold text-dash-text underline decoration-dash-border underline-offset-2 hover:decoration-dash-dark"
                  >
                    {p.nom_entreprise}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={p.statut_verification === "verifie" ? "success" : "warning"}>
                      {p.statut_verification === "verifie" ? "Vérifié" : "En attente"}
                    </Badge>
                    {planActuel && <Badge variant="brand">{planActuel.nom}</Badge>}
                  </div>
                </div>

                <SelecteurPlan
                  proprietaireId={p.id}
                  planActuelId={abonnement?.plan_id}
                  plans={plans ?? []}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
