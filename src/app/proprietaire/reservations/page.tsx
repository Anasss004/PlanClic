import Link from "next/link";
import { ClipboardList, Car, Calendar, MessageCircle, Globe, Phone, FilePlus2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import ActionsReservation from "@/components/proprietaire/ActionsReservation";
import ContratLocation from "@/components/proprietaire/ContratLocation";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { construireLienWhatsApp } from "@/lib/whatsapp";

// Priorité d'affichage : ce qui demande une action passe en premier,
// quelle que soit la source (en ligne ou manuelle).
const PRIORITE_STATUT: Record<string, number> = {
  en_attente: 0,
  confirmee: 1,
  terminee: 2,
  refusee: 3,
  annulee: 4,
};

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
    .select("id, date_debut, date_fin, statut, prix_total, source, nom_client_manuel, telephone_client_manuel, contrat_url, photos_etat_vehicule, vehicule_id, client_id, created_at, vehicules(marque, modele, carburant, transmission, photos), profiles(prenom, nom, telephone)")
    .eq("proprietaire_id", pid)
    .order("created_at", { ascending: false });

  // Un seul système : on trie toutes les réservations ensemble (en
  // ligne + manuelles), les demandes à traiter d'abord.
  const reservationsTriees = [...(reservations ?? [])].sort((a, b) => {
    const pa = PRIORITE_STATUT[a.statut] ?? 9;
    const pb = PRIORITE_STATUT[b.statut] ?? 9;
    if (pa !== pb) return pa - pb;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  const nbEnAttente = reservationsTriees.filter((r) => r.statut === "en_attente").length;

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">Réservations</h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          {reservationsTriees.length} réservation(s) au total
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

      {reservationsTriees.length === 0 ? (
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reservationsTriees.map((r) => {
            const statut = STATUTS[r.statut] ?? { label: r.statut, variant: "neutral" as const, barre: "bg-gray-300" };
            const vehicule = Array.isArray(r.vehicules) ? r.vehicules[0] : r.vehicules;
            const profilClient = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            const nomClient = r.source === "manuel" ? r.nom_client_manuel : `${profilClient?.prenom ?? ""} ${profilClient?.nom ?? ""}`;
            const telephoneClient = r.source === "manuel" ? r.telephone_client_manuel : profilClient?.telephone;

            const messageWhatsApp =
              r.statut === "en_attente"
                ? `Bonjour ${nomClient}, j'ai bien reçu votre demande de réservation pour ${vehicule?.marque} ${vehicule?.modele} ` +
                  `du ${r.date_debut} au ${r.date_fin}. Avant de confirmer, pouvez-vous m'envoyer une photo de votre CIN ou passeport ? Merci !`
                : r.statut === "confirmee"
                ? `Bonjour ${nomClient}, votre réservation pour ${vehicule?.marque} ${vehicule?.modele} ` +
                  `du ${r.date_debut} au ${r.date_fin} est confirmée. À bientôt !`
                : `Bonjour ${nomClient}, au sujet de votre location ${vehicule?.marque} ${vehicule?.modele} ` +
                  `du ${r.date_debut} au ${r.date_fin} :`;

            return (
              <div
                key={r.id}
                className="relative overflow-hidden rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_20px_rgba(15,76,129,0.05)]"
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${statut.barre}`} />

                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs text-dash-text-secondary">
                        #{r.id.slice(0, 8).toUpperCase()}
                      </p>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-dash-text-secondary">
                        {r.source === "manuel" ? (
                          <>
                            <Phone size={11} strokeWidth={2} /> Manuelle
                          </>
                        ) : (
                          <>
                            <Globe size={11} strokeWidth={2} /> En ligne
                          </>
                        )}
                      </span>
                    </div>
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

                {telephoneClient && r.statut !== "refusee" && r.statut !== "annulee" && (
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

                {r.source === "manuel" && !impersonation && r.statut !== "annulee" && (
                  <ContratLocation
                    reservationId={r.id}
                    contratGenere={!!r.contrat_url}
                    nbPhotos={r.photos_etat_vehicule?.length ?? 0}
                  />
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
