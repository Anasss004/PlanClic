import Link from "next/link";
import {
  Car,
  Clock,
  Wallet,
  Plus,
  ClipboardList,
  TriangleAlert,
  ArrowRight,
  FileWarning,
  FilePlus2,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import { formaterDate, formaterPeriode } from "@/lib/dates";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import ChecklistOnboarding from "@/components/proprietaire/ChecklistOnboarding";
import OperationsDuJour, { OperationItem } from "@/components/proprietaire/OperationsDuJour";

// Somme des prix_total des réservations terminées dont created_at
// tombe dans le mois indiqué (0 = mois courant, -1 = mois précédent).
function caDuMois(
  reservations: { statut: string; prix_total: number | null; created_at: string }[],
  decalageMois: number
) {
  const ref = new Date();
  ref.setMonth(ref.getMonth() + decalageMois);
  return reservations
    .filter((r) => {
      if (r.statut !== "terminee") return false;
      const d = new Date(r.created_at);
      return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
    })
    .reduce((s, r) => s + (r.prix_total ?? 0), 0);
}

const LABELS_STATUT: Record<string, { label: string; variant: "warning" | "success" | "danger" | "info" | "neutral" }> = {
  en_attente: { label: "En attente", variant: "warning" },
  confirmee: { label: "Confirmée", variant: "success" },
  refusee: { label: "Refusée", variant: "danger" },
  annulee: { label: "Annulée", variant: "neutral" },
  terminee: { label: "Terminée", variant: "info" },
};

export default async function DashboardProprietairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id: pid } = await resoudreProprietaireId(user!.id);

  const aujourdhui = new Date().toISOString().slice(0, 10);

  const dansTrenteJours = new Date();
  dansTrenteJours.setDate(dansTrenteJours.getDate() + 30);

  // Ces sept requêtes ne dépendent que de `pid` : aucune n'a besoin du
  // résultat d'une autre. Elles étaient enchaînées une par une (sept
  // allers-retours en série) et partent désormais ensemble.
  const [
    { data: proprietaire },
    { count: nbVehicules },
    // Toutes les réservations de l'agence (pour les compteurs + les
    // vraies tendances mois / mois précédent).
    { data: toutesReservations },
    // Opérations du jour (départs, retours, retards).
    { data: reservationsOperations },
    { data: documentsAlerte },
    { data: reservationsRecentes },
    { data: reservationsAVenir },
  ] = await Promise.all([
    supabase
      .from("proprietaires")
      .select("statut_verification")
      .eq("id", pid)
      .single(),
    supabase
      .from("vehicules")
      .select("*", { count: "exact", head: true })
      .eq("proprietaire_id", pid),
    supabase
      .from("reservations")
      .select("statut, prix_total, created_at")
      .eq("proprietaire_id", pid),
    supabase
      .from("reservations")
      .select(`
      id,
      vehicule_id,
      date_debut,
      date_fin,
      heure_debut,
      heure_fin,
      lieu_debut,
      lieu_fin,
      statut,
      source,
      nom_client_manuel,
      telephone_client_manuel,
      prix_total,
      montant_paye,
      vehicules(id, marque, modele, immatriculation, kilometrage_actuel),
      profiles(prenom, nom, telephone)
    `)
      .eq("proprietaire_id", pid)
      .eq("statut", "confirmee"),
    supabase
      .from("documents_vehicule")
      .select("id, type, date_expiration, vehicule_id, vehicules(marque, modele)")
      .eq("proprietaire_id", pid)
      .lte("date_expiration", dansTrenteJours.toISOString().slice(0, 10))
      .order("date_expiration", { ascending: true }),
    supabase
      .from("reservations")
      .select("id, date_debut, date_fin, statut, created_at, vehicules(marque, modele), profiles(prenom, nom)")
      .eq("proprietaire_id", pid)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("reservations")
      .select("id, date_debut, date_fin, vehicules(marque, modele), profiles(prenom, nom)")
      .eq("proprietaire_id", pid)
      .eq("statut", "confirmee")
      .gte("date_debut", aujourdhui)
      .order("date_debut", { ascending: true })
      .limit(5),
  ]);

  const verifie = proprietaire?.statut_verification === "verifie";

  const resa = toutesReservations ?? [];
  const nbEnAttente = resa.filter((r) => r.statut === "en_attente").length;
  const nbReservationsTotal = resa.length;
  const caTotal = resa
    .filter((r) => r.statut === "terminee")
    .reduce((s, r) => s + (r.prix_total ?? 0), 0);

  // Tendance CA : uniquement si le mois précédent a réellement des
  // données (jamais de pourcentage basé sur une période vide).
  const caMoisActuel = caDuMois(resa, 0);
  const caMoisPrecedent = caDuMois(resa, -1);
  const tendanceCa =
    caMoisPrecedent > 0
      ? Math.round(((caMoisActuel - caMoisPrecedent) / caMoisPrecedent) * 100)
      : null;

  const ops = reservationsOperations ?? [];

  const mapItem = (r: (typeof ops)[number]): OperationItem => {
    const vehicule = Array.isArray(r.vehicules) ? r.vehicules[0] : r.vehicules;
    const profil = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;

    const nomClient =
      r.source === "manuel"
        ? r.nom_client_manuel || "Client hors-ligne"
        : profil
        ? `${profil.prenom ?? ""} ${profil.nom ?? ""}`.trim() || "Client PlanClic"
        : "Client";

    const telephoneClient =
      r.source === "manuel"
        ? r.telephone_client_manuel
        : profil?.telephone ?? null;

    return {
      id: r.id,
      vehiculeId: r.vehicule_id || vehicule?.id || null,
      kilometrageDepart: vehicule?.kilometrage_actuel ?? null,
      dateDebut: r.date_debut,
      dateFin: r.date_fin,
      heureDebut: r.heure_debut,
      heureFin: r.heure_fin,
      lieuDebut: r.lieu_debut,
      lieuFin: r.lieu_fin,
      statut: r.statut,
      source: r.source,
      nomClient,
      telephoneClient,
      marqueVehicule: vehicule?.marque ?? "Véhicule",
      modeleVehicule: vehicule?.modele ?? "",
      immatriculationVehicule: vehicule?.immatriculation ?? null,
      prixTotal: r.prix_total,
      montantPaye: r.montant_paye,
    };
  };

  const departsDuJour = ops.filter((r) => r.date_debut === aujourdhui).map(mapItem);
  const retoursDuJour = ops.filter((r) => r.date_fin === aujourdhui).map(mapItem);
  const retardsDuJour = ops.filter((r) => r.date_fin < aujourdhui).map(mapItem);

  // Nombre de locations actives sur la route aujourd'hui (cautions en cours)
  const nbLocationsActives = ops.filter(
    (r) => r.date_debut <= aujourdhui && r.date_fin >= aujourdhui
  ).length;

  const LABELS_DOCUMENT: Record<string, string> = {
    assurance: "Assurance",
    controle_technique: "Contrôle technique",
    vignette: "Vignette",
  };

  const aucuneActivite =
    (nbVehicules ?? 0) === 0 && nbReservationsTotal === 0;

  return (
    <div className="font-[family-name:var(--font-jakarta)] space-y-8">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark max-sm:text-[24px]">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Vue d&apos;ensemble et centre d&apos;opérations de votre agence.
        </p>
      </div>

      {/* Accroche principale — enregistrer une location reçue hors ligne */}
      <div className="flex flex-col gap-4 rounded-2xl border border-dash-accent/40 bg-dash-accent/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-bold text-dash-dark">
            Une location reçue par téléphone, Instagram ou en agence ?
          </p>
          <p className="mt-0.5 text-sm text-dash-text-secondary">
            Enregistrez-la ici : les dates sont bloquées et le contrat est généré automatiquement.
          </p>
        </div>
        <Link
          href="/proprietaire/bloquer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-dash-accent px-5 py-3 text-sm font-bold text-dash-text shadow-md transition hover:brightness-95"
        >
          <FilePlus2 size={17} strokeWidth={2.5} />
          Enregistrer une nouvelle location
        </Link>
      </div>

      {/* Checklist d'onboarding (disparait quand tout est fait ou masquée) */}
      <ChecklistOnboarding
        compteVerifie={verifie}
        premierVehicule={(nbVehicules ?? 0) > 0}
        premiereLocation={nbReservationsTotal > 0}
      />

      {/* Cartes statistiques principales */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Revenus (MAD)"
          value={caTotal.toLocaleString("fr-FR")}
          variant="blue"
          trend={
            tendanceCa === null
              ? undefined
              : {
                  direction: tendanceCa >= 0 ? "up" : "down",
                  label: `${tendanceCa >= 0 ? "+" : ""}${tendanceCa}% vs mois dernier`,
                }
          }
        />
        <StatCard
          icon={ShieldCheck}
          label="Cautions en cours"
          value={nbLocationsActives}
          variant="gold"
          hint="Vehicules actuellement en circulation"
        />
        <StatCard
          icon={Clock}
          label="Demandes en attente"
          value={nbEnAttente ?? 0}
          variant="red"
        />
        <StatCard
          icon={Car}
          label="Véhicules publiés"
          value={nbVehicules ?? 0}
          variant="gray"
        />
      </div>

      {/* Centre d'opérations du jour (départs / retours / retards) */}
      {!aucuneActivite && (
        <OperationsDuJour
          departs={departsDuJour}
          retours={retoursDuJour}
          retards={retardsDuJour}
        />
      )}

      {/* Alertes d'expiration */}
      {documentsAlerte && documentsAlerte.length > 0 && (
        <div className="rounded-xl border border-[#feca5e] bg-[#fff8e8] p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#755400]">
            <FileWarning size={16} strokeWidth={1.75} />
            {documentsAlerte.length} document(s) à renouveler bientôt
          </p>
          <ul className="space-y-1 text-sm text-[#755400]">
            {documentsAlerte.slice(0, 5).map((d) => {
              const expire = d.date_expiration < aujourdhui;
              return (
                <li key={d.id}>
                  <Link
                    href={`/proprietaire/vehicules/${d.vehicule_id}`}
                    className="underline hover:no-underline"
                  >
                    {/* @ts-expect-error - relation typing simplifié */}
                    {d.vehicules?.marque} {d.vehicules?.modele}
                  </Link>{" "}
                  — {LABELS_DOCUMENT[d.type]} {expire ? "expiré" : "expire"} le {formaterDate(d.date_expiration)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Actions rapides */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-dash-dark">Actions rapides</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ActionRapide
            href="/proprietaire/bloquer"
            icon={FilePlus2}
            label="Nouvelle location"
            primary
          />
          <ActionRapide href="/proprietaire/reservations" icon={ClipboardList} label="Voir les réservations" />
          <ActionRapide href="/proprietaire/vehicules" icon={Car} label="Voir la flotte" />
          <ActionRapide href="/proprietaire/amendes" icon={TriangleAlert} label="Consulter les amendes" />
          <ActionRapide
            href="/proprietaire/vehicules/nouveau"
            icon={Plus}
            label="Ajouter un véhicule"
            disabled={!verifie}
            disabledHint="Disponible une fois votre compte vérifié"
          />
        </div>
      </div>

      {aucuneActivite ? (
        <div>
          <EmptyState
            icon={ClipboardList}
            title="Aucune activité pour l'instant"
            description="Enregistrez une location reçue par téléphone, Instagram ou en agence — ou ajoutez d'abord un véhicule si votre flotte est vide."
            action={
              <div className="flex flex-col items-center gap-2">
                <Link
                  href="/proprietaire/bloquer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-dash-accent px-5 py-2.5 text-sm font-bold text-dash-text shadow transition hover:brightness-95"
                >
                  <FilePlus2 size={16} strokeWidth={2.5} />
                  Enregistrer ma première location
                </Link>
                {verifie && (
                  <Link
                    href="/proprietaire/vehicules/nouveau"
                    className="text-xs font-medium text-dash-text-secondary underline underline-offset-2 hover:text-dash-dark"
                  >
                    Ajouter un véhicule
                  </Link>
                )}
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[rgba(193,199,203,0.3)] bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            <h2 className="mb-4 text-sm font-semibold text-dash-dark">Activité récente</h2>
            {!reservationsRecentes || reservationsRecentes.length === 0 ? (
              <p className="text-sm text-dash-text-secondary">Aucune activité récente.</p>
            ) : (
              <ul className="space-y-3">
                {reservationsRecentes.map((r) => {
                  const statut = LABELS_STATUT[r.statut];
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-dash-text">
                          {/* @ts-expect-error - relation typing simplifié */}
                          {r.vehicules?.marque} {r.vehicules?.modele}
                        </p>
                        <p className="truncate text-xs text-dash-text-secondary">
                          {/* @ts-expect-error - relation typing simplifié */}
                          {r.profiles?.prenom} {r.profiles?.nom}
                        </p>
                      </div>
                      <Badge variant={statut?.variant ?? "neutral"}>{statut?.label ?? r.statut}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[rgba(193,199,203,0.3)] bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            <h2 className="mb-4 text-sm font-semibold text-dash-dark">Réservations à venir</h2>
            {!reservationsAVenir || reservationsAVenir.length === 0 ? (
              <p className="text-sm text-dash-text-secondary">Aucune réservation confirmée à venir.</p>
            ) : (
              <ul className="space-y-3">
                {reservationsAVenir.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-dash-text">
                        {/* @ts-expect-error - relation typing simplifié */}
                        {r.vehicules?.marque} {r.vehicules?.modele}
                      </p>
                      <p className="truncate text-xs text-dash-text-secondary">
                        {/* @ts-expect-error - relation typing simplifié */}
                        {r.profiles?.prenom} {r.profiles?.nom}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-dash-text-secondary">
                      {formaterPeriode(r.date_debut, r.date_fin)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionRapide({
  href,
  icon: Icon,
  label,
  disabled,
  disabledHint,
  primary,
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  disabled?: boolean;
  disabledHint?: string;
  primary?: boolean;
}) {
  if (disabled) {
    return (
      <div
        title={disabledHint}
        className="flex cursor-not-allowed items-center gap-2.5 rounded-lg border border-dash-border bg-gray-50 px-4 py-3 text-sm text-gray-400"
      >
        <Icon size={16} strokeWidth={1.75} />
        {label}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`card-lift group flex items-center justify-between gap-2.5 rounded-xl border px-4 py-3.5 text-xs font-bold transition-all ${
        primary
          ? "border-dash-accent/80 bg-dash-accent/20 text-dash-dark hover:brightness-95 shadow-2xs"
          : "border-slate-200 bg-white text-dash-dark hover:border-dash-dark/40 shadow-2xs"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon size={16} strokeWidth={2} className="text-dash-dark" />
        {label}
      </span>
      <ArrowRight size={14} strokeWidth={2} className="opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}


