import { FilePlus2, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import EmptyState from "@/components/ui/EmptyState";
import FormulaireNouvelleLocation from "@/components/proprietaire/FormulaireNouvelleLocation";

const ERREURS: Record<string, string> = {
  creation:
    "La location n'a pas pu être enregistrée. Vérifie les dates (chevauchement possible avec une réservation existante).",
  "champs-manquants": "Merci de renseigner le véhicule, les dates et le nom du client.",
};

export default async function NouvelleLocationPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; vehicule?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id: pid } = await resoudreProprietaireId(user!.id);

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id, marque, modele, ville, prix_jour")
    .eq("proprietaire_id", pid)
    .is("deleted_at", null)
    .order("marque", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl font-[family-name:var(--font-jakarta)]">
      <h1 className="mb-1 flex items-center gap-2 text-[32px] font-bold tracking-tight text-dash-dark">
        <FilePlus2 size={26} strokeWidth={1.75} />
        Nouvelle location
      </h1>
      <p className="mb-6 text-sm text-dash-text-secondary">
        Enregistre une location reçue hors PlanClic (téléphone, Instagram,
        agence). Les dates sont bloquées sur le calendrier et un contrat PDF est
        généré automatiquement.
      </p>

      {sp.erreur && (
        <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {ERREURS[sp.erreur] ?? "Une erreur est survenue. Réessaie."}
        </p>
      )}

      {!vehicules || vehicules.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule"
          description="Ajoute d'abord un véhicule pour pouvoir enregistrer une location."
        />
      ) : (
        <FormulaireNouvelleLocation
          vehicules={vehicules}
          vehiculePreselectionne={sp.vehicule}
        />
      )}
    </div>
  );
}
