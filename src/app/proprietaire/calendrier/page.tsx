import Link from "next/link";
import { CalendarRange, SlidersHorizontal, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import { formaterPeriode, formaterHeure } from "@/lib/dates";
import EmptyState from "@/components/ui/EmptyState";

const CATEGORIES = [
  { value: "", label: "Tous les véhicules" },
  { value: "economique", label: "Économique" },
  { value: "berline_luxe", label: "Berline Luxe" },
  { value: "suv_4x4", label: "SUV & 4x4" },
] as const;

const LABELS_MAINTENANCE: Record<string, string> = {
  vidange: "Vidange",
  carburant: "Carburant",
  reparation: "Réparation",
  pneus: "Pneus",
  assurance: "Assurance",
  autre: "Révision",
};

const JOURS_WEEKEND = [5, 6]; // index dans le tableau `jours` : samedi, dimanche (semaine commençant lundi)

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; categorie?: string }>;
}) {
  const sp = await searchParams;
  const vue = sp.vue === "mois" ? "mois" : "semaine";
  const nbJours = vue === "mois" ? 30 : 7;
  const categorieActive = sp.categorie ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id: pid } = await resoudreProprietaireId(user!.id);

  let requeteVehicules = supabase
    .from("vehicules")
    .select("id, marque, modele, immatriculation, categorie")
    .eq("proprietaire_id", pid)
    .is("deleted_at", null);
  if (categorieActive) requeteVehicules = requeteVehicules.eq("categorie", categorieActive);
  const { data: vehicules } = await requeteVehicules.order("marque", { ascending: true });

  // Lundi de la semaine en cours comme point de départ
  const aujourdhui = new Date();
  const jourSemaine = (aujourdhui.getDay() + 6) % 7; // lundi = 0
  const lundi = new Date(aujourdhui);
  lundi.setDate(aujourdhui.getDate() - jourSemaine);

  const jours = Array.from({ length: nbJours }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + i);
    return d;
  });

  const dateDebutFenetre = jours[0].toISOString().slice(0, 10);
  const dateFinFenetre = jours[jours.length - 1].toISOString().slice(0, 10);
  const idsVehicules = (vehicules ?? []).map((v) => v.id);

  const { data: reservations } = idsVehicules.length
    ? await supabase
        .from("reservations")
        .select("id, vehicule_id, date_debut, date_fin, heure_debut, lieu_debut, heure_fin, lieu_fin, statut, source, nom_client_manuel, profiles(prenom, nom)")
        .in("vehicule_id", idsVehicules)
        .in("statut", ["confirmee", "en_attente"])
        .lte("date_debut", dateFinFenetre)
        .gte("date_fin", dateDebutFenetre)
    : { data: [] };

  const { data: maintenances } = idsVehicules.length
    ? await supabase
        .from("maintenance")
        .select("id, vehicule_id, type, date_intervention")
        .in("vehicule_id", idsVehicules)
        .is("deleted_at", null)
        .gte("date_intervention", dateDebutFenetre)
        .lte("date_intervention", dateFinFenetre)
    : { data: [] };

  function construireUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams({ vue, categorie: categorieActive, ...overrides });
    Object.keys(params).forEach((k) => { if (!params.get(k)) params.delete(k); });
    return `/proprietaire/calendrier?${params.toString()}`;
  }

  function position(dateDebut: string, dateFin: string) {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const premierJour = jours[0];
    const dernierJour = jours[jours.length - 1];
    const debutVisible = debut < premierJour ? premierJour : debut;
    const finVisible = fin > dernierJour ? dernierJour : fin;
    const colStart = Math.round((debutVisible.getTime() - premierJour.getTime()) / 86400000) + 1;
    const colEnd = Math.round((finVisible.getTime() - premierJour.getTime()) / 86400000) + 2;
    return { gridColumnStart: colStart, gridColumnEnd: colEnd };
  }

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      {/* En-tête */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">
            Calendrier des Réservations
          </h1>
          <p className="mt-1 text-sm text-dash-text-secondary">
            Gérez l&apos;allocation de votre flotte en temps réel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-dash-border bg-white">
            <Link
              href={construireUrl({ vue: "mois" })}
              className={`px-4 py-2 text-sm font-medium transition ${
                vue === "mois" ? "bg-white text-dash-dark shadow-sm" : "text-dash-text-secondary hover:bg-gray-50"
              }`}
            >
              Mois
            </Link>
            <Link
              href={construireUrl({ vue: "semaine" })}
              className={`px-4 py-2 text-sm font-medium transition ${
                vue === "semaine" ? "bg-white text-dash-dark shadow-sm" : "text-dash-text-secondary hover:bg-gray-50"
              }`}
            >
              Semaine
            </Link>
          </div>
          <button
            type="button"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-dash-border bg-white text-dash-text-secondary hover:bg-gray-50"
            aria-label="Filtres"
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Filtres catégorie + légende */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dash-border bg-white p-2">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={construireUrl({ categorie: c.value })}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                categorieActive === c.value
                  ? "bg-dash-sidebar text-white"
                  : "bg-gray-50 text-dash-text-secondary hover:bg-gray-100"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 pr-2 text-sm text-dash-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-dash-sidebar" /> Confirmé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-dash-accent" /> En cours
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-400" /> Maintenance
          </span>
        </div>
      </div>

      {!vehicules || vehicules.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Aucun véhicule"
          description="Ajoutez des véhicules pour voir apparaître leur calendrier de disponibilité."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dash-border bg-white">
          <div style={{ minWidth: `${180 + nbJours * 90}px` }}>
            {/* En-tête des jours */}
            <div
              className="grid border-b border-dash-border"
              style={{ gridTemplateColumns: `180px repeat(${nbJours}, 1fr)` }}
            >
              <div className="flex items-center border-r border-dash-border bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
                Véhicule
              </div>
              {jours.map((j, i) => {
                const estWeekend = JOURS_WEEKEND.includes(i % 7);
                const estAujourdhui = j.toDateString() === aujourdhui.toDateString();
                return (
                  <div
                    key={i}
                    className={`relative border-r border-dash-border py-3 text-center ${
                      estAujourdhui ? "bg-sky-50" : "bg-gray-50"
                    }`}
                  >
                    <p className={`text-xs font-medium uppercase ${estWeekend ? "text-rose-500" : "text-dash-text-secondary"}`}>
                      {j.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                    </p>
                    <p className={`text-lg font-bold ${estWeekend ? "text-rose-500" : "text-dash-dark"}`}>
                      {j.getDate()}
                    </p>
                    {estAujourdhui && (
                      <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-rose-400" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lignes véhicules */}
            {vehicules.map((v) => {
              const resasVehicule = (reservations ?? []).filter((r) => r.vehicule_id === v.id);
              const maintenancesVehicule = (maintenances ?? []).filter((m) => m.vehicule_id === v.id);

              return (
                <div
                  key={v.id}
                  className="grid border-b border-dash-border last:border-b-0"
                  style={{ gridTemplateColumns: `180px repeat(${nbJours}, 1fr)` }}
                >
                  <div className="border-r border-dash-border px-4 py-5">
                    <p className="text-sm font-bold text-dash-text">
                      {v.marque} {v.modele}
                    </p>
                    <p className="font-mono text-xs text-dash-text-secondary">{v.immatriculation}</p>
                  </div>

                  <div
                    className="relative col-span-full grid items-center py-3"
                    style={{ gridColumn: `2 / span ${nbJours}`, gridTemplateColumns: `repeat(${nbJours}, 1fr)` }}
                  >
                    {resasVehicule.map((r) => {
                      const pos = position(r.date_debut, r.date_fin);
                      const profil = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                      const nom = r.source === "manuel" ? r.nom_client_manuel : `${profil?.prenom ?? ""} ${profil?.nom ?? ""}`;
                      const estConfirmee = r.statut === "confirmee";
                      const detail = [
                        `${nom} · ${formaterPeriode(r.date_debut, r.date_fin)}`,
                        r.heure_debut || r.heure_fin
                          ? `Départ ${formaterHeure(r.heure_debut) || "?"} → retour ${formaterHeure(r.heure_fin) || "?"}`
                          : null,
                        r.lieu_debut ? `Lieu : ${r.lieu_debut}` : null,
                        r.lieu_fin && r.lieu_fin !== r.lieu_debut ? `Retour : ${r.lieu_fin}` : null,
                      ]
                        .filter(Boolean)
                        .join("\n");
                      return (
                        <div
                          key={r.id}
                          style={pos}
                          className={`mx-1 flex items-center gap-1.5 truncate rounded-lg px-3 py-2.5 text-xs font-semibold ${
                            estConfirmee ? "bg-dash-sidebar text-white" : "bg-dash-accent text-dash-dark"
                          }`}
                          title={detail}
                        >
                          {r.heure_debut && (
                            <span className="shrink-0 opacity-80">{formaterHeure(r.heure_debut)}</span>
                          )}
                          <span className="truncate">{nom}</span>
                        </div>
                      );
                    })}

                    {maintenancesVehicule.map((m) => {
                      const pos = position(m.date_intervention, m.date_intervention);
                      return (
                        <div
                          key={m.id}
                          style={pos}
                          className="mx-1 flex items-center justify-center gap-1.5 truncate rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-500"
                        >
                          <Wrench size={12} strokeWidth={2} />
                          {LABELS_MAINTENANCE[m.type] ?? "Révision"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Lignes vides pour respirer visuellement, comme sur la maquette */}
            <div className="h-24" />
          </div>
        </div>
      )}
    </div>
  );
}
