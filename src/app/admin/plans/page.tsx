import { Package, Check, X, Car, BarChart3, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { BoutonNouveauPlan, BoutonModifierPlan, BoutonBasculerPlan } from "@/components/admin/GestionPlan";

export default async function AdminPlansPage() {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .order("prix", { ascending: true });

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">Plans</h1>
          <p className="mt-1 text-sm text-dash-text-secondary">
            Les packs proposés aux propriétaires. Aucun paiement automatique
            pour l&apos;instant — attribution manuelle depuis "Abonnements".
          </p>
        </div>
        <BoutonNouveauPlan />
      </div>

      {!plans || plans.length === 0 ? (
        <EmptyState icon={Package} title="Aucun plan" description="Crée ton premier plan pour commencer." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]"
            >
              <div className="mb-2 flex items-start justify-between">
                <p className="text-lg font-bold text-dash-dark">{p.nom}</p>
                <Badge variant={p.actif ? "success" : "neutral"}>
                  {p.actif ? "Actif" : "Désactivé"}
                </Badge>
              </div>
              {p.description && (
                <p className="mb-3 text-xs text-dash-text-secondary">{p.description}</p>
              )}
              <p className="mb-4 text-2xl font-bold text-dash-dark">
                {p.prix} <span className="text-sm font-normal text-dash-text-secondary">MAD/{p.periode === "mensuel" ? "mois" : "an"}</span>
              </p>

              <ul className="mb-5 space-y-2 text-sm text-dash-text">
                <li className="flex items-center gap-2">
                  <Car size={14} strokeWidth={1.75} className="text-dash-text-secondary" />
                  {p.max_vehicules ? `${p.max_vehicules} véhicule(s) max` : "Véhicules illimités"}
                </li>
                <li className="flex items-center gap-2">
                  {p.acces_statistiques ? (
                    <Check size={14} strokeWidth={2} className="text-emerald-600" />
                  ) : (
                    <X size={14} strokeWidth={2} className="text-gray-300" />
                  )}
                  <BarChart3 size={14} strokeWidth={1.75} className="text-dash-text-secondary" />
                  Statistiques avancées
                </li>
                <li className="flex items-center gap-2">
                  {p.mise_en_avant ? (
                    <Check size={14} strokeWidth={2} className="text-emerald-600" />
                  ) : (
                    <X size={14} strokeWidth={2} className="text-gray-300" />
                  )}
                  <Star size={14} strokeWidth={1.75} className="text-dash-text-secondary" />
                  Mise en avant
                </li>
              </ul>

              <div className="flex gap-2">
                <BoutonModifierPlan plan={p} />
                <BoutonBasculerPlan planId={p.id} actif={p.actif} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
