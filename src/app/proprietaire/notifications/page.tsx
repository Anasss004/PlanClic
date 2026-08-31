import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import { formaterDate, formaterPeriode } from "@/lib/dates";
import EmptyState from "@/components/ui/EmptyState";
import FluxNotifications, {
  type ElementFlux,
} from "@/components/proprietaire/FluxNotifications";

const LABELS_DOC: Record<string, string> = {
  assurance: "L'assurance",
  controle_technique: "Le contrôle technique",
  vignette: "La vignette",
};

export default async function NotificationsProprietairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id: pid, impersonation } = await resoudreProprietaireId(user!.id);

  const dans30j = new Date();
  dans30j.setDate(dans30j.getDate() + 30);
  const dans30jIso = dans30j.toISOString().slice(0, 10);

  const [
    { data: notifications },
    { data: demandes },
    { data: docs },
    { data: proprietaire },
  ] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, titre, message, categorie, lu_le, created_at")
      .eq("destinataire_id", pid)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("reservations")
      .select("id, created_at, date_debut, date_fin, nom_client_manuel, source, vehicules(marque, modele), profiles(prenom, nom)")
      .eq("proprietaire_id", pid)
      .eq("statut", "en_attente")
      .order("created_at", { ascending: false }),
    supabase
      .from("documents_vehicule")
      .select("id, type, date_expiration, created_at, vehicule_id, vehicules(marque, modele)")
      .eq("proprietaire_id", pid)
      .lte("date_expiration", dans30jIso)
      .order("date_expiration", { ascending: true }),
    supabase
      .from("proprietaires")
      .select("statut_verification, verifie_le")
      .eq("id", pid)
      .single(),
  ]);

  const elements: ElementFlux[] = [];

  for (const n of notifications ?? []) {
    elements.push({
      id: n.id,
      type: (n.categorie as ElementFlux["type"]) ?? "systeme",
      titre: n.titre,
      message: n.message,
      date: n.created_at,
      lu: n.lu_le ? true : false,
    });
  }

  for (const d of demandes ?? []) {
    const v = Array.isArray(d.vehicules) ? d.vehicules[0] : d.vehicules;
    const p = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
    const client =
      d.source === "manuel" ? d.nom_client_manuel : `${p?.prenom ?? ""} ${p?.nom ?? ""}`.trim();
    elements.push({
      id: d.id,
      type: "demande",
      titre: "Demande de réservation en attente",
      message: `${client || "Un client"} · ${v?.marque ?? ""} ${v?.modele ?? ""} · ${formaterPeriode(d.date_debut, d.date_fin)}`,
      date: d.created_at,
      href: "/proprietaire/reservations",
      lu: null,
    });
  }

  for (const d of docs ?? []) {
    const v = Array.isArray(d.vehicules) ? d.vehicules[0] : d.vehicules;
    const expire = d.date_expiration < new Date().toISOString().slice(0, 10);
    elements.push({
      id: d.id,
      type: "document",
      titre: expire ? "Document expiré" : "Document à renouveler bientôt",
      message: `${LABELS_DOC[d.type] ?? d.type} de ${v?.marque ?? ""} ${v?.modele ?? ""} ${expire ? "a expiré" : "expire"} le ${formaterDate(d.date_expiration)}.`,
      date: d.created_at ?? d.date_expiration,
      href: `/proprietaire/vehicules/${d.vehicule_id}`,
      lu: null,
    });
  }

  if (proprietaire?.statut_verification === "verifie" && proprietaire.verifie_le) {
    const ilYaMoins60j =
      Date.now() - new Date(proprietaire.verifie_le).getTime() < 60 * 86400000;
    if (ilYaMoins60j) {
      elements.push({
        id: "verification",
        type: "verification",
        titre: "Compte vérifié",
        message: `Votre compte a été validé le ${formaterDate(proprietaire.verifie_le)}. Vous pouvez publier des véhicules et recevoir des réservations.`,
        date: proprietaire.verifie_le,
        lu: null,
      });
    }
  }

  elements.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-[32px] font-bold tracking-tight text-dash-dark">
          <Bell size={26} strokeWidth={1.75} />
          Notifications
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Demandes à traiter, documents à renouveler, annonces PlanClic.
        </p>
      </div>

      {elements.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Rien à signaler"
          description="Les demandes de réservation, alertes de documents et annonces de l'équipe apparaîtront ici."
        />
      ) : (
        <FluxNotifications elements={elements} lectureSeule={Boolean(impersonation)} />
      )}
    </div>
  );
}
