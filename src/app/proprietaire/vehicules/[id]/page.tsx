import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  TrendingDown,
  TrendingUp,
  Wrench,
  FileWarning,
  CalendarClock,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Badge from "@/components/ui/Badge";
import CalendrierVehicule from "@/components/proprietaire/CalendrierVehicule";
import AnnulerBlocageButton from "@/components/proprietaire/AnnulerBlocageButton";
import {
  ajouterMaintenance,
  ajouterDocumentVehicule,
  bloquerVehicule,
} from "@/app/actions/proprietaire";

const LABELS_MAINTENANCE: Record<string, string> = {
  vidange: "Vidange",
  carburant: "Carburant",
  reparation: "Réparation",
  pneus: "Pneus",
  assurance: "Assurance",
  autre: "Autre",
};

const LABELS_DOCUMENT: Record<string, string> = {
  assurance: "Assurance",
  controle_technique: "Contrôle technique",
  vignette: "Vignette",
};

export default async function VehiculeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; message?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: vehicule } = await supabase
    .from("vehicules")
    .select("*")
    .eq("id", id)
    .single();

  if (!vehicule) {
    return (
      <div>
        <p className="text-sm text-gray-500">Véhicule introuvable.</p>
      </div>
    );
  }

  const { data: reservationsTerminees } = await supabase
    .from("reservations")
    .select("prix_total")
    .eq("vehicule_id", id)
    .eq("statut", "terminee");

  const revenuBrut =
    reservationsTerminees?.reduce((s, r) => s + (r.prix_total ?? 0), 0) ?? 0;

  const { data: maintenances } = await supabase
    .from("maintenance")
    .select("*")
    .eq("vehicule_id", id)
    .is("deleted_at", null)
    .order("date_intervention", { ascending: false });

  const coutMaintenance =
    maintenances?.reduce((s, m) => s + (m.cout ?? 0), 0) ?? 0;
  const profitNet = revenuBrut - coutMaintenance;

  const { data: documents } = await supabase
    .from("documents_vehicule")
    .select("*")
    .eq("vehicule_id", id)
    .order("date_expiration", { ascending: true });

  const { data: reservationsActives } = await supabase
    .from("reservations")
    .select("id, date_debut, date_fin, statut, source, nom_client_manuel, profiles(prenom, nom)")
    .eq("vehicule_id", id)
    .in("statut", ["confirmee"])
    .order("date_debut", { ascending: true });

  const periodesCalendrier = (reservationsActives ?? []).map((r) => ({
    debut: r.date_debut,
    fin: r.date_fin,
    type: (r.source === "manuel" ? "blocage" : "reservation") as "blocage" | "reservation",
  }));

  const blocagesManuels = (reservationsActives ?? []).filter((r) => r.source === "manuel");

  const dansTrenteJours = new Date();
  dansTrenteJours.setDate(dansTrenteJours.getDate() + 30);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Link
        href="/proprietaire/vehicules"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-dark"
      >
        <ArrowLeft size={15} strokeWidth={1.75} />
        Retour aux véhicules
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {vehicule.marque} {vehicule.modele}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {vehicule.ville} · {vehicule.immatriculation}
          </p>
        </div>
        <Link
          href={`/proprietaire/vehicules/${id}/modifier`}
          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Modifier
        </Link>
      </div>

      {sp.message && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          Action effectuée avec succès.
        </p>
      )}
      {sp.erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          Une erreur est survenue.
        </p>
      )}

      {/* Rentabilité */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light/40">
            <TrendingUp size={18} strokeWidth={1.75} className="text-brand-dark" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-gray-900">
            {revenuBrut.toLocaleString("fr-FR")} MAD
          </p>
          <p className="mt-0.5 text-sm text-gray-500">Revenu brut généré</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light/40">
            <TrendingDown size={18} strokeWidth={1.75} className="text-brand-dark" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-gray-900">
            {coutMaintenance.toLocaleString("fr-FR")} MAD
          </p>
          <p className="mt-0.5 text-sm text-gray-500">Coût d&apos;entretien</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light/40">
            <Wallet size={18} strokeWidth={1.75} className="text-brand-dark" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-gray-900">
            {profitNet.toLocaleString("fr-FR")} MAD
          </p>
          <p className="mt-0.5 text-sm text-gray-500">Profit net</p>
        </div>
      </div>

      {/* Calendrier */}
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <CalendarClock size={16} strokeWidth={1.75} />
          Disponibilité
        </h2>
        <CalendrierVehicule periodes={periodesCalendrier} />
      </div>

      {/* Bloquer le véhicule */}
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">
          Bloquer ce véhicule
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          Si tu as reçu une réservation par un autre moyen (téléphone, Instagram...),
          bloque les dates ici pour qu&apos;elles n&apos;apparaissent plus disponibles sur PlanClic.
        </p>

        <form action={bloquerVehicule} className="grid gap-3 sm:grid-cols-5">
          <input type="hidden" name="vehicule_id" value={id} />
          <input
            type="date"
            name="date_debut"
            required
            className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-dark"
          />
          <input
            type="date"
            name="date_fin"
            required
            className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-dark"
          />
          <input
            name="nom_client"
            placeholder="Nom du client"
            required
            className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-dark"
          />
          <input
            name="telephone_client"
            placeholder="Téléphone (optionnel)"
            className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-dark"
          />
          <button
            type="submit"
            className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Bloquer
          </button>
        </form>

        {blocagesManuels.length > 0 && (
          <div className="mt-4 space-y-2">
            {blocagesManuels.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 text-sm"
              >
                <span className="text-amber-800">
                  {b.nom_client_manuel} · {b.date_debut} → {b.date_fin}
                </span>
                <AnnulerBlocageButton reservationId={b.id} vehiculeId={id} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Maintenance */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Wrench size={16} strokeWidth={1.75} />
            Maintenance
          </h2>

          <form action={ajouterMaintenance} className="mb-4 space-y-2">
            <input type="hidden" name="vehicule_id" value={id} />
            <div className="grid grid-cols-2 gap-2">
              <select
                name="type"
                required
                className="rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none"
              >
                {Object.entries(LABELS_MAINTENANCE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="date_intervention"
                required
                className="rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                name="kilometrage"
                placeholder="Kilométrage"
                className="rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none"
              />
              <input
                type="number"
                step="0.01"
                name="cout"
                placeholder="Coût (MAD)"
                className="rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none"
              />
            </div>
            <input
              name="description"
              placeholder="Détail (optionnel)"
              className="w-full rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none"
            />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-accent py-2 text-xs font-semibold text-brand-dark"
            >
              <Plus size={13} strokeWidth={2} />
              Ajouter
            </button>
          </form>

          {!maintenances || maintenances.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune intervention enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {maintenances.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border-t border-gray-50 pt-2 text-xs"
                >
                  <span className="text-gray-700">
                    {LABELS_MAINTENANCE[m.type]} · {m.date_intervention}
                  </span>
                  {m.cout != null && (
                    <span className="font-medium text-gray-900">{m.cout} MAD</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents / expirations */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FileWarning size={16} strokeWidth={1.75} />
            Assurance & documents
          </h2>

          <form action={ajouterDocumentVehicule} className="mb-4 flex gap-2">
            <input type="hidden" name="vehicule_id" value={id} />
            <select
              name="type"
              required
              className="flex-1 rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none"
            >
              {Object.entries(LABELS_DOCUMENT).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="date_expiration"
              required
              className="rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-brand-accent px-3 py-2 text-xs font-semibold text-brand-dark"
            >
              <Plus size={13} strokeWidth={2} />
            </button>
          </form>

          {!documents || documents.length === 0 ? (
            <p className="text-xs text-gray-400">Aucun document enregistré.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((d) => {
                const bientotExpire = d.date_expiration <= dansTrenteJours.toISOString().slice(0, 10);
                const expire = d.date_expiration < aujourdhui;
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between border-t border-gray-50 pt-2 text-xs"
                  >
                    <span className="text-gray-700">
                      {LABELS_DOCUMENT[d.type]} · expire le {d.date_expiration}
                    </span>
                    <Badge variant={expire ? "danger" : bientotExpire ? "warning" : "success"}>
                      {expire ? "Expiré" : bientotExpire ? "Bientôt" : "OK"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
