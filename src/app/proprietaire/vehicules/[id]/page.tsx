import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  Wrench,
  FileWarning,
  CalendarClock,
  Plus,
  Car,
  Fuel,
  Gauge,
  Users,
  Circle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Badge from "@/components/ui/Badge";
import DatePicker from "@/components/ui/DatePicker";
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
    return <p className="text-sm text-dash-text-secondary">Véhicule introuvable.</p>;
  }

  const { data: reservationsTerminees } = await supabase
    .from("reservations")
    .select("prix_total")
    .eq("vehicule_id", id)
    .eq("statut", "terminee");
  const revenuBrut = reservationsTerminees?.reduce((s, r) => s + (r.prix_total ?? 0), 0) ?? 0;

  const { data: maintenances } = await supabase
    .from("maintenance")
    .select("*")
    .eq("vehicule_id", id)
    .is("deleted_at", null)
    .order("date_intervention", { ascending: false });
  const coutMaintenance = maintenances?.reduce((s, m) => s + (m.cout ?? 0), 0) ?? 0;
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

  // Taux d'occupation 30 derniers jours (pour la barre de progression)
  const il30jours = new Date();
  il30jours.setDate(il30jours.getDate() - 30);
  const { data: reservationsRecentes } = await supabase
    .from("reservations")
    .select("date_debut, date_fin")
    .eq("vehicule_id", id)
    .in("statut", ["confirmee", "terminee"])
    .gte("date_fin", il30jours.toISOString().slice(0, 10));
  let joursOccupes = 0;
  (reservationsRecentes ?? []).forEach((r) => {
    const debut = new Date(Math.max(new Date(r.date_debut).getTime(), il30jours.getTime()));
    const fin = new Date(Math.min(new Date(r.date_fin).getTime(), new Date().getTime()));
    joursOccupes += Math.max(0, Math.round((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)));
  });
  const tauxOccupation = Math.min(100, Math.round((joursOccupes / 30) * 100));

  const dansTrenteJours = new Date();
  dansTrenteJours.setDate(dansTrenteJours.getDate() + 30);
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/proprietaire/vehicules"
          className="flex items-center gap-1.5 text-sm text-dash-text-secondary hover:text-dash-dark"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Retour à la flotte
        </Link>
        <Link
          href={`/proprietaire/vehicules/${id}/modifier`}
          className="rounded-lg border border-dash-border px-4 py-2 text-sm font-medium text-dash-text-secondary hover:bg-gray-50"
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

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Colonne principale : hero + specs */}
        <div>
          <div className="relative h-[320px] overflow-hidden rounded-xl bg-[#eeeeef]">
            {vehicule.photos?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vehicule.photos[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Car size={48} strokeWidth={1.25} className="text-dash-dark/30" />
              </div>
            )}
            <span
              className={`absolute right-6 top-6 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-sm ${
                vehicule.statut === "actif"
                  ? "border-dash-accent/30 bg-dash-accent/20 text-[#7b5900]"
                  : "border-gray-300 bg-white/70 text-gray-500"
              }`}
            >
              {vehicule.statut === "actif" ? "Disponible" : "Inactif"}
            </span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6">
              <h1 className="text-3xl font-bold text-white">
                {vehicule.marque} {vehicule.modele}
              </h1>
              <p className="mt-1 font-mono text-sm text-white/80">{vehicule.immatriculation}</p>
            </div>
          </div>

          {/* Specs bento */}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SpecBox icon={Gauge} label="Transmission" value={vehicule.transmission === "automatique" ? "Automatique" : "Manuelle"} />
            <SpecBox icon={Fuel} label="Carburant" value={vehicule.carburant ?? "—"} />
            <SpecBox icon={Users} label="Places" value={vehicule.places ?? "—"} />
            <SpecBox icon={Circle} label="Couleur" value={vehicule.couleur ?? "—"} />
          </div>

          {/* Calendrier */}
          <div className="mt-6 rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dash-dark">
              <CalendarClock size={18} strokeWidth={1.75} />
              Disponibilité
            </h2>
            <CalendrierVehicule periodes={periodesCalendrier} />
          </div>

          {/* Bloquer le véhicule */}
          <div className="mt-6 rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            <h2 className="mb-1 text-lg font-semibold text-dash-dark">Bloquer ce véhicule</h2>
            <p className="mb-4 text-sm text-dash-text-secondary">
              Réservation reçue par un autre moyen (téléphone, Instagram...) ? Bloque les dates ici.
            </p>
            <form action={bloquerVehicule} className="grid gap-3 sm:grid-cols-5">
              <input type="hidden" name="vehicule_id" value={id} />
              <DatePicker name="date_debut" required theme="dash" />
              <DatePicker name="date_fin" required theme="dash" />
              <input name="nom_client" placeholder="Nom du client" required className="rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark" />
              <input name="telephone_client" placeholder="Téléphone (optionnel)" className="rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark" />
              <button type="submit" className="rounded-lg bg-dash-sidebar px-4 py-2 text-sm font-semibold text-dash-muted hover:opacity-90">
                Bloquer
              </button>
            </form>
            {blocagesManuels.length > 0 && (
              <div className="mt-4 space-y-2">
                {blocagesManuels.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg bg-[#fff8e8] px-4 py-2.5 text-sm">
                    <span className="text-[#755400]">
                      {b.nom_client_manuel} · {b.date_debut} → {b.date_fin}
                    </span>
                    <AnnulerBlocageButton reservationId={b.id} vehiculeId={id} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historique de maintenance — timeline verticale */}
          <div className="mt-6 rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dash-dark">
              <Wrench size={18} strokeWidth={1.75} />
              Historique de Maintenance
            </h2>

            <form action={ajouterMaintenance} className="mb-6 grid gap-2 rounded-lg border border-dash-border p-4 sm:grid-cols-5">
              <input type="hidden" name="vehicule_id" value={id} />
              <select name="type" required className="rounded-lg border border-dash-border px-3 py-2 text-xs">
                {Object.entries(LABELS_MAINTENANCE).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <DatePicker name="date_intervention" required theme="dash" />
              <input type="number" name="kilometrage" placeholder="Km" className="rounded-lg border border-dash-border px-3 py-2 text-xs" />
              <input type="number" step="0.01" name="cout" placeholder="Coût MAD" className="rounded-lg border border-dash-border px-3 py-2 text-xs" />
              <button type="submit" className="flex items-center justify-center gap-1 rounded-lg bg-dash-accent px-3 py-2 text-xs font-semibold text-dash-text">
                <Plus size={13} strokeWidth={2} /> Ajouter
              </button>
              <input name="description" placeholder="Détail (optionnel)" className="col-span-full rounded-lg border border-dash-border px-3 py-2 text-xs" />
            </form>

            {!maintenances || maintenances.length === 0 ? (
              <p className="text-sm text-dash-text-secondary">Aucune intervention enregistrée.</p>
            ) : (
              <div className="relative border-l-2 border-dash-border pl-6">
                {maintenances.map((m) => (
                  <div key={m.id} className="relative mb-6 last:mb-0">
                    <span className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-dash-accent" />
                    <p className="text-xs font-medium text-dash-text-secondary">{m.date_intervention}</p>
                    <div className="mt-1 rounded-lg border border-dash-border bg-[#faf9fa] p-4">
                      <p className="font-semibold text-dash-text">{LABELS_MAINTENANCE[m.type]}</p>
                      {m.description && <p className="mt-1 text-sm text-dash-text-secondary">{m.description}</p>}
                      <div className="mt-2 flex gap-2">
                        {m.cout != null && <Badge variant="info">{m.cout} MAD</Badge>}
                        {m.kilometrage != null && <Badge variant="neutral">{m.kilometrage} km</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Tarification & rentabilité */}
          <div className="rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            <h2 className="mb-4 text-lg font-semibold text-dash-dark">Tarification & Rentabilité</h2>

            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-dash-text-secondary">Prix journalier</span>
              <span className="text-xl font-bold text-dash-dark">{vehicule.prix_jour} MAD</span>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-dash-text-secondary">Profit net (total)</span>
              <span className="text-lg font-semibold text-[#006c4a]">{profitNet.toLocaleString("fr-FR")} MAD</span>
            </div>

            <div className="border-t border-dash-border pt-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-dash-text-secondary">Taux d&apos;occupation</span>
                <span className="font-semibold text-dash-dark">{tauxOccupation}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-dash-accent" style={{ width: `${tauxOccupation}%` }} />
              </div>
              <p className="mt-1 text-xs text-dash-text-secondary">30 derniers jours</p>
            </div>
          </div>

          {/* Documents / expirations */}
          <div className="rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-dash-dark">
              <FileWarning size={18} strokeWidth={1.75} />
              Assurance & Documents
            </h2>

            <form action={ajouterDocumentVehicule} className="mb-4 flex gap-2">
              <input type="hidden" name="vehicule_id" value={id} />
              <select name="type" required className="flex-1 rounded-lg border border-dash-border px-3 py-2 text-xs">
                {Object.entries(LABELS_DOCUMENT).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <DatePicker name="date_expiration" required theme="dash" />
              <button type="submit" className="shrink-0 rounded-lg bg-dash-accent px-3 py-2 text-xs font-semibold text-dash-text">
                <Plus size={13} strokeWidth={2} />
              </button>
            </form>

            {!documents || documents.length === 0 ? (
              <p className="text-sm text-dash-text-secondary">Aucun document enregistré.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => {
                  const bientotExpire = d.date_expiration <= dansTrenteJours.toISOString().slice(0, 10);
                  const expire = d.date_expiration < aujourdhui;
                  return (
                    <div key={d.id} className="flex items-center justify-between border-t border-dash-border pt-2 text-sm first:border-0 first:pt-0">
                      <span className="text-dash-text">
                        {LABELS_DOCUMENT[d.type]} <span className="text-xs text-dash-text-secondary">· exp. {d.date_expiration}</span>
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
    </div>
  );
}

function SpecBox({ icon: Icon, label, value }: { icon: typeof Fuel; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-dash-border bg-white p-4 text-center shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
      <Icon size={22} strokeWidth={1.5} className="mx-auto mb-2 text-dash-dark" />
      <p className="text-xs font-medium uppercase tracking-wide text-dash-text-secondary">{label}</p>
      <p className="mt-1 text-lg font-bold capitalize text-dash-dark">{value}</p>
    </div>
  );
}
