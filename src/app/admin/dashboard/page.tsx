import { Users, Building2, Car, ClipboardList, Wallet, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/ui/StatCard";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { count: nbClients } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "client");

  const { count: nbProprietaires } = await supabase
    .from("proprietaires")
    .select("*", { count: "exact", head: true });

  const { count: nbEnAttente } = await supabase
    .from("proprietaires")
    .select("*", { count: "exact", head: true })
    .eq("statut_verification", "en_attente");

  const { count: nbVehicules } = await supabase
    .from("vehicules")
    .select("*", { count: "exact", head: true });

  const { count: nbReservations } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true });

  const { data: terminees } = await supabase
    .from("reservations")
    .select("prix_total")
    .eq("statut", "terminee");

  const caPlateforme =
    terminees?.reduce((s, r) => s + (r.prix_total ?? 0), 0) ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Vue d&apos;ensemble
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Activité globale de la plateforme PlanClic.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Clients inscrits" value={nbClients ?? 0} />
        <StatCard icon={Building2} label="Propriétaires" value={nbProprietaires ?? 0} />
        <StatCard
          icon={ShieldCheck}
          label="Comptes en attente"
          value={nbEnAttente ?? 0}
          hint={nbEnAttente ? "Nécessite ton attention" : undefined}
        />
        <StatCard icon={Car} label="Véhicules publiés" value={nbVehicules ?? 0} />
        <StatCard icon={ClipboardList} label="Réservations" value={nbReservations ?? 0} />
        <StatCard
          icon={Wallet}
          label="CA plateforme (total)"
          value={`${caPlateforme.toLocaleString("fr-FR")} MAD`}
        />
      </div>

      {(nbEnAttente ?? 0) > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>{nbEnAttente}</strong> compte(s) propriétaire en attente de
          vérification.{" "}
          <a href="/admin/verifications" className="underline">
            Traiter maintenant
          </a>
        </div>
      )}
    </div>
  );
}
