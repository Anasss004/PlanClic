import { SlidersHorizontal } from "lucide-react";
import { exigerAdmin } from "@/lib/admin/auth";
import { getParametresBruts } from "@/lib/admin/parametres";
import EmptyState from "@/components/ui/EmptyState";
import EditeurParametres from "@/components/admin/EditeurParametres";

export default async function ParametresPlateformePage() {
  await exigerAdmin();
  const lignes = await getParametresBruts();

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-[32px] font-bold tracking-tight text-dash-dark">
          <SlidersHorizontal size={26} strokeWidth={1.75} />
          Paramètres plateforme
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Réglages centralisés (numéro WhatsApp, liens légaux, villes,
          catégories). Réservé aux administrateurs · chaque modification est
          journalisée.
        </p>
      </div>

      {lignes.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="Table non initialisée"
          description="Exécutez la migration supabase/14_admin_panel.sql pour créer la table parametres_plateforme et ses valeurs de départ."
        />
      ) : (
        <EditeurParametres lignes={lignes} />
      )}
    </div>
  );
}
