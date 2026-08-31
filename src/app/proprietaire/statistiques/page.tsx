import Link from "next/link";
import { Wallet, Gauge, ClipboardList, Wrench, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import StatCard from "@/components/ui/StatCard";

export default async function StatistiquesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id: pid } = await resoudreProprietaireId(user!.id);

  // Restriction selon le plan : les statistiques avancées ne sont
  // pas incluses dans tous les plans.
  const { data: plan } = await supabase.rpc("plan_actuel", { p_proprietaire_id: pid });
  const accesAutorise = plan?.[0]?.acces_statistiques ?? false;

  if (!accesAutorise) {
    return (
      <div className="font-[family-name:var(--font-jakarta)]">
        <div className="mb-8">
          <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">
            Statistiques & Rapports
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dash-border bg-white px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-dash-accent/20">
            <Lock size={22} strokeWidth={1.75} className="text-dash-dark" />
          </div>
          <p className="mb-1 text-sm font-semibold text-dash-text">
            Fonctionnalité non incluse dans ton plan actuel
          </p>
          <p className="mb-5 max-w-sm text-sm text-dash-text-secondary">
            Les statistiques avancées (revenus, taux d&apos;occupation, tendances)
            sont réservées aux plans supérieurs.
          </p>
          <Link
            href="/proprietaire/parametres"
            className="rounded-lg bg-dash-accent px-5 py-2.5 text-sm font-semibold text-dash-text shadow transition hover:brightness-95"
          >
            Voir mon plan
          </Link>
        </div>
      </div>
    );
  }

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id")
    .eq("proprietaire_id", pid)
    .is("deleted_at", null);

  const nbVehicules = vehicules?.length ?? 0;

  const { data: toutesReservations } = await supabase
    .from("reservations")
    .select("statut, prix_total, date_debut, date_fin, created_at")
    .eq("proprietaire_id", pid);

  const reservationsTerminees = (toutesReservations ?? []).filter((r) => r.statut === "terminee");
  const caTotal = reservationsTerminees.reduce((s, r) => s + (r.prix_total ?? 0), 0);
  const nbReservationsTotal = toutesReservations?.length ?? 0;

  // Taux d'occupation sur les 30 derniers jours : jours réservés (confirmée/terminée)
  // rapportés au nombre total de jours-véhicules disponibles sur la période.
  const il30jours = new Date();
  il30jours.setDate(il30jours.getDate() - 30);
  const aujourdhui = new Date();

  let joursReserves = 0;
  (toutesReservations ?? [])
    .filter((r) => r.statut === "confirmee" || r.statut === "terminee")
    .forEach((r) => {
      const debut = new Date(Math.max(new Date(r.date_debut).getTime(), il30jours.getTime()));
      const fin = new Date(Math.min(new Date(r.date_fin).getTime(), aujourdhui.getTime()));
      const jours = Math.max(0, Math.round((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)));
      joursReserves += jours;
    });
  const joursDisponiblesTotal = nbVehicules * 30;
  const tauxOccupation = joursDisponiblesTotal > 0 ? Math.round((joursReserves / joursDisponiblesTotal) * 100) : 0;

  const { count: documentsARenouveler } = await supabase
    .from("documents_vehicule")
    .select("*", { count: "exact", head: true })
    .eq("proprietaire_id", pid)
    .lte("date_expiration", new Date(aujourdhui.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

  // Revenu par mois (6 derniers mois)
  const moisLabels: string[] = [];
  const revenuParMois: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    moisLabels.push(label);
    const total = reservationsTerminees
      .filter((r) => {
        const rd = new Date(r.created_at);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      })
      .reduce((s, r) => s + (r.prix_total ?? 0), 0);
    revenuParMois.push(total);
  }
  const maxRevenu = Math.max(...revenuParMois, 1);

  // Tendance CA mois courant vs mois précédent — affichée uniquement
  // si le mois précédent a réellement des données.
  const caMoisActuel = revenuParMois[5];
  const caMoisPrecedent = revenuParMois[4];
  const tendanceCa =
    caMoisPrecedent > 0
      ? Math.round(((caMoisActuel - caMoisPrecedent) / caMoisPrecedent) * 100)
      : null;

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">
          Statistiques & Rapports
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Performance de votre activité sur PlanClic.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Chiffre d'affaires"
          value={`${caTotal.toLocaleString("fr-FR")} MAD`}
          variant="blue"
          trend={
            tendanceCa === null
              ? undefined
              : {
                  direction: tendanceCa >= 0 ? "up" : "down",
                  label: `${tendanceCa >= 0 ? "+" : ""}${tendanceCa}% ce mois-ci`,
                }
          }
        />
        <StatCard icon={Gauge} label="Taux d'utilisation" value={`${tauxOccupation}%`} variant="gold" hint="30 derniers jours" />
        <StatCard icon={ClipboardList} label="Réservations totales" value={nbReservationsTotal} variant="gray" />
        <StatCard icon={Wrench} label="Documents à renouveler" value={documentsARenouveler ?? 0} variant="red" />
      </div>

      <div className="mt-8 rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
        <h2 className="mb-1 text-lg font-semibold text-dash-dark">Revenu mensuel</h2>
        <p className="mb-6 text-sm text-dash-text-secondary">6 derniers mois (réservations terminées)</p>

        <div className="flex h-48 items-end gap-4">
          {revenuParMois.map((valeur, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-dash-accent transition-all"
                  style={{ height: `${(valeur / maxRevenu) * 100}%`, minHeight: valeur > 0 ? "4px" : "0" }}
                  title={`${valeur.toLocaleString("fr-FR")} MAD`}
                />
              </div>
              <p className="text-xs capitalize text-dash-text-secondary">{moisLabels[i]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
