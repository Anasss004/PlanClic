import { TriangleAlert, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import FormulaireAmende, {
  type ReservationAmende,
} from "@/components/proprietaire/FormulaireAmende";

type AmendeListe = {
  id: string;
  date_amende: string;
  numero_immatriculation: string;
  reservation_id: string | null;
  nom_client_manuel: string | null;
  telephone_client_manuel: string | null;
  vehicules: { marque: string; modele: string } | null;
  reservations: {
    source: string;
    nom_client_manuel: string | null;
    profiles: { prenom: string | null; nom: string | null } | null;
  } | null;
};

// Nom du locataire à afficher : via la réservation quand elle existe,
// sinon via la saisie de secours, sinon aucun.
function nomLocataire(a: AmendeListe): string | null {
  const r = a.reservations;
  if (r) {
    if (r.source === "manuel") return r.nom_client_manuel?.trim() || "Client hors-ligne";
    const nom = `${r.profiles?.prenom ?? ""} ${r.profiles?.nom ?? ""}`.trim();
    return nom || "Client PlanClic";
  }
  return a.nom_client_manuel?.trim() || null;
}

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

  // Les trois lectures sont indépendantes : elles partent ensemble.
  const [{ data: amendes }, { data: vehicules }, { data: reservations }] =
    await Promise.all([
      supabase
        .from("amendes")
        .select(
          "id, date_amende, numero_immatriculation, reservation_id, nom_client_manuel, telephone_client_manuel, vehicules(marque, modele), reservations(source, nom_client_manuel, profiles(prenom, nom))"
        )
        .eq("proprietaire_id", user!.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("vehicules")
        .select("id, marque, modele, immatriculation, ville")
        .eq("proprietaire_id", user!.id)
        .is("deleted_at", null)
        .order("marque", { ascending: true }),
      // Seules les réservations susceptibles de couvrir une amende : les
      // statuts annulée / refusée / en attente n'ont jamais mis le véhicule
      // entre les mains d'un client.
      supabase
        .from("reservations")
        .select(
          "id, vehicule_id, date_debut, date_fin, statut, source, nom_client_manuel, telephone_client_manuel, profiles(prenom, nom, telephone)"
        )
        .eq("proprietaire_id", user!.id)
        .in("statut", ["confirmee", "terminee"]),
    ]);

  const listeAmendes = (amendes ?? []) as unknown as AmendeListe[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Amendes
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Choisissez le véhicule et la date : le locataire concerné est
          retrouvé automatiquement.
        </p>
      </div>

      {!vehicules || vehicules.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucun véhicule"
          description="Ajoutez d'abord un véhicule à votre flotte pour pouvoir signaler une amende."
        />
      ) : (
        <FormulaireAmende
          vehicules={vehicules}
          reservations={(reservations ?? []) as unknown as ReservationAmende[]}
          erreur={params.erreur}
        />
      )}

      {listeAmendes.length === 0 ? (
        <EmptyState
          icon={TriangleAlert}
          title="Aucune amende enregistrée"
          description="Les amendes que vous signalez apparaîtront ici, avec le locataire identifié automatiquement."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {listeAmendes.map((a, i) => {
            const locataire = nomLocataire(a);
            const vehicule = a.vehicules
              ? `${a.vehicules.marque} ${a.vehicules.modele}`
              : null;

            return (
              <div
                key={a.id}
                className={`flex items-center justify-between gap-3 px-5 py-4 ${
                  i !== 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {vehicule ?? a.numero_immatriculation}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {vehicule ? `${a.numero_immatriculation} · ` : ""}
                    {a.date_amende}
                  </p>
                </div>

                {locataire ? (
                  <Badge variant={a.reservation_id ? "success" : "info"}>
                    {locataire}
                  </Badge>
                ) : (
                  <Badge variant="neutral">Locataire non identifié</Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
