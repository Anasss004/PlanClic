import Link from "next/link";
import {
  Users,
  Building2,
  Car,
  ClipboardList,
  Wallet,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigerStaff } from "@/lib/admin/auth";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import MiniBarChart, { type PointGraphe } from "@/components/admin/MiniBarChart";

const MOIS_COURT = [
  "jan", "fév", "mar", "avr", "mai", "juin",
  "juil", "aoû", "sep", "oct", "nov", "déc",
];

function Carte({
  titre,
  icon: Icon,
  children,
}: {
  titre: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-dash-dark">
        <Icon size={15} strokeWidth={1.75} />
        {titre}
      </h2>
      {children}
    </div>
  );
}

export default async function AdminDashboardPage() {
  await exigerStaff();
  const supabase = await createClient();

  const [
    { count: nbClients },
    { count: nbProprietaires },
    { count: nbEnAttente },
    { count: nbVehicules },
    { data: reservations },
    { data: abonnements },
    { data: proprietaires },
    { data: vehicules },
    { data: inscriptionsRecentes },
    { data: journal },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    supabase.from("proprietaires").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("proprietaires").select("*", { count: "exact", head: true }).eq("statut_verification", "en_attente"),
    supabase.from("vehicules").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("reservations")
      .select("statut, source, prix_total, created_at, proprietaire_id, vehicule_id"),
    supabase.from("abonnements").select("plan_id, statut, plans(nom)").eq("statut", "actif"),
    supabase.from("proprietaires").select("id, nom_entreprise"),
    supabase.from("vehicules").select("id, marque, modele"),
    supabase
      .from("profiles")
      .select("prenom, nom, role, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("audit_logs")
      .select("id, action, resource_type, actor_role, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const resa = reservations ?? [];
  const nomAgence = new Map((proprietaires ?? []).map((p) => [p.id, p.nom_entreprise]));
  const nomVehicule = new Map(
    (vehicules ?? []).map((v) => [v.id, `${v.marque} ${v.modele}`])
  );

  const caTotal = resa
    .filter((r) => r.statut === "terminee")
    .reduce((s, r) => s + (r.prix_total ?? 0), 0);

  // --- Évolution sur 6 mois (CA terminé + nombre de réservations créées)
  const maintenant = new Date();
  const buckets: PointGraphe[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const dansLeMois = (iso: string) => {
      const x = new Date(iso);
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
    };
    const caMois = resa
      .filter((r) => r.statut === "terminee" && dansLeMois(r.created_at))
      .reduce((s, r) => s + (r.prix_total ?? 0), 0);
    const nbMois = resa.filter((r) => dansLeMois(r.created_at)).length;
    buckets.push({
      label: MOIS_COURT[d.getMonth()],
      valeur: Math.round(caMois),
      valeur2: nbMois,
    });
  }

  // --- Répartition des agences par plan
  const parPlan = new Map<string, number>();
  (abonnements ?? []).forEach((a) => {
    const plan = Array.isArray(a.plans) ? a.plans[0] : a.plans;
    const nom = plan?.nom ?? "Sans plan";
    parPlan.set(nom, (parPlan.get(nom) ?? 0) + 1);
  });
  const repartitionPlans = Array.from(parPlan.entries()).sort((a, b) => b[1] - a[1]);
  const totalAbos = repartitionPlans.reduce((s, [, n]) => s + n, 0) || 1;

  // --- Entonnoir de conversion (demandes PlanClic)
  const demandes = resa.filter((r) => r.source !== "manuel");
  const nbDemandes = demandes.length;
  const nbConfirmees = demandes.filter((r) =>
    ["confirmee", "terminee"].includes(r.statut)
  ).length;
  const nbTerminees = demandes.filter((r) => r.statut === "terminee").length;
  const pct = (n: number) => (nbDemandes ? Math.round((n / nbDemandes) * 100) : 0);

  // --- Top 5 agences par revenu
  const revenuAgence = new Map<string, number>();
  resa
    .filter((r) => r.statut === "terminee")
    .forEach((r) => {
      revenuAgence.set(
        r.proprietaire_id,
        (revenuAgence.get(r.proprietaire_id) ?? 0) + (r.prix_total ?? 0)
      );
    });
  const topAgences = Array.from(revenuAgence.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // --- Top 5 véhicules les plus loués
  const locationsVehicule = new Map<string, number>();
  resa
    .filter((r) => ["confirmee", "terminee"].includes(r.statut))
    .forEach((r) => {
      locationsVehicule.set(
        r.vehicule_id,
        (locationsVehicule.get(r.vehicule_id) ?? 0) + 1
      );
    });
  const topVehicules = Array.from(locationsVehicule.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">
          Vue d&apos;ensemble
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Activité globale de la plateforme PlanClic.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Clients inscrits" value={nbClients ?? 0} variant="blue" />
        <StatCard icon={Building2} label="Agences actives" value={nbProprietaires ?? 0} variant="gray" />
        <StatCard
          icon={ShieldCheck}
          label="Comptes en attente"
          value={nbEnAttente ?? 0}
          hint={nbEnAttente ? "Nécessite ton attention" : undefined}
          variant="gold"
        />
        <StatCard icon={Car} label="Véhicules publiés" value={nbVehicules ?? 0} variant="gray" />
        <StatCard icon={ClipboardList} label="Réservations" value={resa.length} variant="blue" />
        <StatCard
          icon={Wallet}
          label="CA plateforme (total)"
          value={`${caTotal.toLocaleString("fr-FR")} MAD`}
        />
      </div>

      {(nbEnAttente ?? 0) > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>{nbEnAttente}</strong> compte(s) propriétaire en attente de
          vérification.{" "}
          <Link href="/admin/verifications" className="underline">
            Traiter maintenant
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Carte titre="Évolution — 6 derniers mois" icon={TrendingUp}>
          <MiniBarChart
            points={buckets}
            legende="CA terminé (MAD)"
            legende2="Réservations créées"
          />
        </Carte>

        <Carte titre="Agences par plan" icon={Building2}>
          {repartitionPlans.length === 0 ? (
            <p className="text-sm text-dash-text-secondary">Aucun abonnement actif.</p>
          ) : (
            <ul className="space-y-3">
              {repartitionPlans.map(([nom, n]) => (
                <li key={nom}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-dash-text">{nom}</span>
                    <span className="text-dash-text-secondary">
                      {n} ({Math.round((n / totalAbos) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-dash-accent"
                      style={{ width: `${(n / totalAbos) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        <Carte titre="Conversion des demandes" icon={Activity}>
          <div className="space-y-3">
            <EtapeEntonnoir label="Demandes reçues" valeur={nbDemandes} pourcent={100} />
            <EtapeEntonnoir
              label="Confirmées"
              valeur={nbConfirmees}
              pourcent={pct(nbConfirmees)}
            />
            <EtapeEntonnoir
              label="Terminées"
              valeur={nbTerminees}
              pourcent={pct(nbTerminees)}
            />
          </div>
        </Carte>

        <Carte titre="Top 5 agences par revenu" icon={Trophy}>
          {topAgences.length === 0 ? (
            <p className="text-sm text-dash-text-secondary">Aucun revenu enregistré.</p>
          ) : (
            <ol className="space-y-2">
              {topAgences.map(([id, ca], i) => (
                <li key={id} className="flex items-center justify-between text-sm">
                  <Link
                    href={`/admin/agences/${id}`}
                    className="flex items-center gap-2 font-medium text-dash-text hover:underline"
                  >
                    <span className="text-dash-text-secondary">{i + 1}.</span>
                    {nomAgence.get(id) ?? "Agence"}
                  </Link>
                  <span className="text-dash-text-secondary">
                    {ca.toLocaleString("fr-FR")} MAD
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Carte>

        <Carte titre="Top 5 véhicules les plus loués" icon={Car}>
          {topVehicules.length === 0 ? (
            <p className="text-sm text-dash-text-secondary">Aucune location enregistrée.</p>
          ) : (
            <ol className="space-y-2">
              {topVehicules.map(([id, n], i) => (
                <li key={id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-dash-text">
                    <span className="text-dash-text-secondary">{i + 1}.</span>
                    {nomVehicule.get(id) ?? "Véhicule"}
                  </span>
                  <Badge variant="neutral">{n} location{n > 1 ? "s" : ""}</Badge>
                </li>
              ))}
            </ol>
          )}
        </Carte>

        <Carte titre="Activité récente" icon={Activity}>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
                Dernières inscriptions
              </p>
              <ul className="space-y-1.5">
                {(inscriptionsRecentes ?? []).slice(0, 4).map((u, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-dash-text">
                      {u.prenom} {u.nom}
                    </span>
                    <Badge variant="neutral">{u.role}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
                Journal système
              </p>
              <ul className="space-y-1.5">
                {(journal ?? []).slice(0, 6).map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate text-dash-text">{l.action}</span>
                    <span className="shrink-0 text-xs text-dash-text-secondary">
                      {new Date(l.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Carte>
      </div>
    </div>
  );
}

function EtapeEntonnoir({
  label,
  valeur,
  pourcent,
}: {
  label: string;
  valeur: number;
  pourcent: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-dash-text">{label}</span>
        <span className="text-dash-text-secondary">
          {valeur} · {pourcent}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-dash-sidebar"
          style={{ width: `${Math.max(2, pourcent)}%` }}
        />
      </div>
    </div>
  );
}
