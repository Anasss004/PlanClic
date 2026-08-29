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
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

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

  const { data: proprietaire } = await supabase
    .from("proprietaires")
    .select("statut_verification")
    .eq("id", pid)
    .single();

  const verifie = proprietaire?.statut_verification === "verifie";

  const { count: nbVehicules } = await supabase
    .from("vehicules")
    .select("*", { count: "exact", head: true })
    .eq("proprietaire_id", pid);

  const { count: nbEnAttente } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("proprietaire_id", pid)
    .eq("statut", "en_attente");

  const { data: terminees } = await supabase
    .from("reservations")
    .select("prix_total")
    .eq("proprietaire_id", pid)
    .eq("statut", "terminee");

  const caTotal = terminees?.reduce((s, r) => s + (r.prix_total ?? 0), 0) ?? 0;

  const dansTrenteJours = new Date();
  dansTrenteJours.setDate(dansTrenteJours.getDate() + 30);

  const { data: documentsAlerte } = await supabase
    .from("documents_vehicule")
    .select("id, type, date_expiration, vehicule_id, vehicules(marque, modele)")
    .eq("proprietaire_id", pid)
    .lte("date_expiration", dansTrenteJours.toISOString().slice(0, 10))
    .order("date_expiration", { ascending: true });

  const LABELS_DOCUMENT: Record<string, string> = {
    assurance: "Assurance",
    controle_technique: "Contrôle technique",
    vignette: "Vignette",
  };

  const { data: reservationsRecentes } = await supabase
    .from("reservations")
    .select("id, date_debut, date_fin, statut, created_at, vehicules(marque, modele), profiles(prenom, nom)")
    .eq("proprietaire_id", pid)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: reservationsAVenir } = await supabase
    .from("reservations")
    .select("id, date_debut, date_fin, vehicules(marque, modele), profiles(prenom, nom)")
    .eq("proprietaire_id", pid)
    .eq("statut", "confirmee")
    .gte("date_debut", new Date().toISOString().slice(0, 10))
    .order("date_debut", { ascending: true })
    .limit(5);

  const aucuneActivite = (nbVehicules ?? 0) === 0 && (reservationsRecentes?.length ?? 0) === 0;

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Vue d&apos;ensemble de votre activité sur PlanClic.
        </p>
      </div>

      {/* Cartes statistiques */}
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Revenus (MAD)"
          value={caTotal.toLocaleString("fr-FR")}
          variant="blue"
        />
        <StatCard
          icon={Clock}
          label="Demandes en attente"
          value={nbEnAttente ?? 0}
          variant="gold"
        />
        <StatCard
          icon={Car}
          label="Véhicules publiés"
          value={nbVehicules ?? 0}
          variant="gray"
        />
      </div>

      {/* Alertes d'expiration */}
      {documentsAlerte && documentsAlerte.length > 0 && (
        <div className="mt-6 rounded-xl border border-[#feca5e] bg-[#fff8e8] p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#755400]">
            <FileWarning size={16} strokeWidth={1.75} />
            {documentsAlerte.length} document(s) à renouveler bientôt
          </p>
          <ul className="space-y-1 text-sm text-[#755400]">
            {documentsAlerte.slice(0, 5).map((d) => {
              const expire = d.date_expiration < new Date().toISOString().slice(0, 10);
              return (
                <li key={d.id}>
                  <Link
                    href={`/proprietaire/vehicules/${d.vehicule_id}`}
                    className="underline hover:no-underline"
                  >
                    {/* @ts-expect-error - relation typing simplifié */}
                    {d.vehicules?.marque} {d.vehicules?.modele}
                  </Link>{" "}
                  — {LABELS_DOCUMENT[d.type]} {expire ? "expiré" : "expire"} le {d.date_expiration}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Actions rapides */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-dash-dark">Actions rapides</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <ActionRapide
            href="/proprietaire/vehicules/nouveau"
            icon={Plus}
            label="Ajouter un véhicule"
            disabled={!verifie}
            disabledHint="Disponible une fois votre compte vérifié"
          />
          <ActionRapide href="/proprietaire/reservations" icon={ClipboardList} label="Voir les réservations" />
          <ActionRapide href="/proprietaire/vehicules" icon={Car} label="Voir la flotte" />
          <ActionRapide href="/proprietaire/amendes" icon={TriangleAlert} label="Consulter les amendes" />
        </div>
      </div>

      {aucuneActivite ? (
        <div className="mt-8">
          <EmptyState
            icon={Car}
            title="Aucune activité pour l'instant"
            description="Ajoutez votre premier véhicule pour commencer à recevoir des demandes de réservation."
            action={
              verifie ? (
                <Link
                  href="/proprietaire/vehicules/nouveau"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-dash-accent px-5 py-2 text-sm font-semibold text-dash-text"
                >
                  <Plus size={16} strokeWidth={2} />
                  Ajouter un véhicule
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
                      {r.date_debut} → {r.date_fin}
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
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  disabled?: boolean;
  disabledHint?: string;
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
      className="group flex items-center justify-between gap-2.5 rounded-lg border border-dash-border bg-white px-4 py-3 text-sm font-medium text-dash-text-secondary shadow-[0px_4px_10px_rgba(43,76,91,0.05)] transition hover:border-dash-dark/30 hover:text-dash-dark"
    >
      <span className="flex items-center gap-2.5">
        <Icon size={16} strokeWidth={1.75} />
        {label}
      </span>
      <ArrowRight size={14} strokeWidth={1.75} className="opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}
