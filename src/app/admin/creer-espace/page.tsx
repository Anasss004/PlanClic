import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigerStaff } from "@/lib/admin/auth";
import { getParametresPlateforme } from "@/lib/admin/parametres";
import { serviceRoleDisponible } from "@/lib/supabase/admin";
import AssistantEspace from "@/components/admin/AssistantEspace";

export default async function CreerEspacePage() {
  await exigerStaff();
  const supabase = await createClient();

  const [{ data: plans }, parametres] = await Promise.all([
    supabase
      .from("plans")
      .select("id, nom, prix")
      .eq("actif", true)
      .order("prix", { ascending: true }),
    getParametresPlateforme(),
  ]);

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-[32px] font-bold tracking-tight text-dash-dark">
          <Sparkles size={26} strokeWidth={1.75} />
          Créer un espace agence
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Onboarding complet en un flux : compte propriétaire, plan, premier
          véhicule et liens à transmettre.
        </p>
      </div>

      <AssistantEspace
        plans={plans ?? []}
        villes={parametres.villes}
        categories={parametres.categories_vehicule}
        serviceRoleDispo={serviceRoleDisponible()}
      />
    </div>
  );
}
