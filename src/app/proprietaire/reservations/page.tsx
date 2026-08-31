import Link from "next/link";
import { ClipboardList, FilePlus2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import EmptyState from "@/components/ui/EmptyState";
import ListeReservations, {
  type ReservationListe,
} from "@/components/proprietaire/ListeReservations";

const MESSAGES: Record<string, string> = {
  "location-creee": "Location enregistrée et contrat généré.",
  "location-creee-sans-contrat":
    "Location enregistrée. Le contrat n'a pas pu être généré — utilise « Générer le contrat » ci-dessous.",
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id: pid, impersonation } = await resoudreProprietaireId(user!.id);

  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      "id, date_debut, date_fin, heure_debut, lieu_debut, heure_fin, lieu_fin, statut, prix_total, source, nom_client_manuel, telephone_client_manuel, contrat_url, photos_etat_vehicule, created_at, vehicules(marque, modele, carburant, transmission, photos), profiles(prenom, nom, telephone)"
    )
    .eq("proprietaire_id", pid)
    .order("created_at", { ascending: false });

  const liste = (reservations ?? []).map((r) => ({
    ...r,
    vehicules: Array.isArray(r.vehicules) ? r.vehicules[0] : r.vehicules,
    profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
  })) as ReservationListe[];

  const nbEnAttente = liste.filter((r) => r.statut === "en_attente").length;

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">Réservations</h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          {liste.length} réservation(s) au total
          {nbEnAttente > 0 && (
            <span className="ml-2 font-semibold text-[#755400]">
              · {nbEnAttente} en attente de réponse
            </span>
          )}
        </p>
      </div>

      {sp.message && MESSAGES[sp.message] && (
        <p className="mb-6 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {MESSAGES[sp.message]}
        </p>
      )}

      {liste.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune réservation"
          description="Enregistrez une location reçue hors ligne, ou attendez une demande via le site — les deux apparaîtront ici."
          action={
            <Link
              href="/proprietaire/bloquer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-dash-accent px-5 py-2.5 text-sm font-bold text-dash-text shadow transition hover:brightness-95"
            >
              <FilePlus2 size={16} strokeWidth={2.5} />
              Enregistrer ma première location
            </Link>
          }
        />
      ) : (
        <ListeReservations reservations={liste} impersonation={Boolean(impersonation)} />
      )}
    </div>
  );
}
