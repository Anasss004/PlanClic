import { ClipboardList, Car, Calendar, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ActionsReservation from "@/components/proprietaire/ActionsReservation";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { construireLienWhatsApp } from "@/lib/whatsapp";

const STATUTS: Record<
  string,
  { label: string; variant: "warning" | "success" | "danger" | "info" | "neutral"; barre: string }
> = {
  en_attente: { label: "En attente", variant: "warning", barre: "bg-[#feca5e]" },
  confirmee: { label: "Confirmée", variant: "success", barre: "bg-[#4fba7a]" },
  refusee: { label: "Refusée", variant: "danger", barre: "bg-[#ba1a1a]" },
  annulee: { label: "Annulée", variant: "neutral", barre: "bg-gray-300" },
  terminee: { label: "Terminée", variant: "info", barre: "bg-[#6bb8e0]" },
};

export default async function ReservationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, date_debut, date_fin, statut, prix_total, source, nom_client_manuel, telephone_client_manuel, vehicule_id, client_id, vehicules(marque, modele, carburant, transmission, photos), profiles(prenom, nom, telephone)")
    .eq("proprietaire_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">Réservations</h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          {reservations?.length ?? 0} réservation(s) au total
        </p>
      </div>

      {!reservations || reservations.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune réservation"
          description="Les demandes de réservation de vos véhicules apparaîtront ici."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reservations.map((r) => {
            const statut = STATUTS[r.statut] ?? { label: r.statut, variant: "neutral" as const, barre: "bg-gray-300" };
            const vehicule = Array.isArray(r.vehicules) ? r.vehicules[0] : r.vehicules;
            const profilClient = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            const nomClient = r.source === "manuel" ? r.nom_client_manuel : `${profilClient?.prenom ?? ""} ${profilClient?.nom ?? ""}`;
            const telephoneClient = r.source === "manuel" ? r.telephone_client_manuel : profilClient?.telephone;

            const messageWhatsApp =
              r.statut === "en_attente"
                ? `Bonjour ${nomClient}, j'ai bien reçu votre demande de réservation pour ${vehicule?.marque} ${vehicule?.modele} ` +
                  `du ${r.date_debut} au ${r.date_fin}. Avant de confirmer, pouvez-vous m'envoyer une photo de votre CIN ou passeport ? Merci !`
                : `Bonjour ${nomClient}, votre réservation pour ${vehicule?.marque} ${vehicule?.modele} ` +
                  `du ${r.date_debut} au ${r.date_fin} est confirmée. À bientôt !`;

            return (
              <div
                key={r.id}
                className="relative overflow-hidden rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_20px_rgba(15,76,129,0.05)]"
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${statut.barre}`} />

                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-mono text-xs text-dash-text-secondary">
                      #{r.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-lg font-semibold text-dash-text">{nomClient}</p>
                  </div>
                  <Badge variant={statut.variant}>{statut.label}</Badge>
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dash-border bg-[#eeeeef]">
                    {vehicule?.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vehicule.photos[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Car size={22} strokeWidth={1.5} className="text-dash-dark/30" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-dash-text">
                      {vehicule?.marque} {vehicule?.modele}
                    </p>
                    <p className="truncate text-xs text-dash-text-secondary">
                      {vehicule?.transmission === "automatique" ? "Automatique" : "Manuelle"} • {vehicule?.carburant}
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex items-start gap-2 text-sm text-dash-text">
                  <Calendar size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-dash-text-secondary" />
                  <span>
                    {r.date_debut} → {r.date_fin}
                  </span>
                </div>

                {(r.statut === "en_attente" || r.statut === "confirmee") && telephoneClient && (
                  <a
                    href={construireLienWhatsApp(telephoneClient, messageWhatsApp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
                  >
                    <MessageCircle size={15} strokeWidth={2} />
                    {r.statut === "en_attente"
                      ? "Demander CIN/passeport sur WhatsApp"
                      : "Contacter sur WhatsApp"}
                  </a>
                )}

                <div className="flex items-center justify-between border-t border-dash-border pt-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-dash-text-secondary">Total</p>
                    <p className="text-lg font-semibold text-dash-dark">
                      {(r.prix_total ?? 0).toLocaleString("fr-FR")} MAD
                    </p>
                  </div>
                  <ActionsReservation reservationId={r.id} statut={r.statut} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
