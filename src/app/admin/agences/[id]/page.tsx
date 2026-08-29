import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Wallet,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Car,
  FileText,
  History,
  Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigerStaff } from "@/lib/admin/auth";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import SelecteurPlan from "@/components/admin/SelecteurPlan";
import { VoirDocument } from "@/components/admin/ActionsVerification";
import {
  BoutonActifAgence,
  BoutonMessageAgence,
} from "@/components/admin/ActionsAgence";

const LABELS_TYPE_DOC: Record<string, string> = {
  registre_commerce: "Registre de Commerce",
  id_gerant: "Pièce d'identité du gérant",
  cin: "CIN",
  permis: "Permis",
};

const LABELS_STATUT_RESA: Record<
  string,
  { label: string; variant: "warning" | "success" | "danger" | "info" | "neutral" }
> = {
  en_attente: { label: "En attente", variant: "warning" },
  confirmee: { label: "Confirmée", variant: "success" },
  refusee: { label: "Refusée", variant: "danger" },
  annulee: { label: "Annulée", variant: "neutral" },
  terminee: { label: "Terminée", variant: "info" },
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function FicheAgencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigerStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: agence } = await supabase
    .from("proprietaires")
    .select(
      "id, nom_entreprise, specialite, ville, adresse, registre_commerce, statut_verification, verifie_le, created_at, deleted_at"
    )
    .eq("id", id)
    .single();

  if (!agence) notFound();

  const { data: profil } = await supabase
    .from("profiles")
    .select("prenom, nom, email, telephone, created_at")
    .eq("id", id)
    .single();

  const { data: historiquePlans } = await supabase
    .from("abonnements")
    .select("id, plan_id, statut, date_debut, date_fin, created_at, plans(nom, prix)")
    .eq("proprietaire_id", id)
    .order("created_at", { ascending: false });

  const abonnementActif = (historiquePlans ?? []).find((a) => a.statut === "actif");
  const planActif = Array.isArray(abonnementActif?.plans)
    ? abonnementActif?.plans[0]
    : abonnementActif?.plans;

  const { data: plansDisponibles } = await supabase
    .from("plans")
    .select("id, nom")
    .eq("actif", true)
    .order("prix", { ascending: true });

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id, marque, modele, immatriculation, ville, prix_jour, statut, deleted_at")
    .eq("proprietaire_id", id)
    .order("created_at", { ascending: false });

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, statut, source, date_debut, date_fin, prix_total, created_at, vehicules(marque, modele)")
    .eq("proprietaire_id", id)
    .order("created_at", { ascending: false });

  const resaList = reservations ?? [];
  const demandes = resaList.filter((r) => r.source !== "manuel");
  const nbConfirmeesOuTerminees = demandes.filter((r) =>
    ["confirmee", "terminee"].includes(r.statut)
  ).length;
  const nbAnnuleesRefusees = demandes.filter((r) =>
    ["annulee", "refusee"].includes(r.statut)
  ).length;
  const nbDemandesTraitees = nbConfirmeesOuTerminees + nbAnnuleesRefusees;
  const tauxAcceptation = nbDemandesTraitees
    ? Math.round((nbConfirmeesOuTerminees / nbDemandesTraitees) * 100)
    : null;
  const tauxAnnulation = nbDemandesTraitees
    ? Math.round((nbAnnuleesRefusees / nbDemandesTraitees) * 100)
    : null;
  const caGenere = resaList
    .filter((r) => r.statut === "terminee")
    .reduce((s, r) => s + (r.prix_total ?? 0), 0);

  const { data: documents } = await supabase
    .from("documents")
    .select("id, type_document, storage_path, statut, created_at")
    .eq("owner_id", id)
    .in("type_document", ["registre_commerce", "id_gerant"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: journal } = await supabase
    .from("audit_logs")
    .select("id, action, resource_type, actor_role, metadata, created_at")
    .or(`resource_id.eq.${id},actor_id.eq.${id}`)
    .order("created_at", { ascending: false })
    .limit(25);

  const actif = !agence.deleted_at;

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <Link
        href="/admin/utilisateurs"
        className="mb-6 flex w-fit items-center gap-1.5 text-sm text-dash-text-secondary hover:text-dash-dark"
      >
        <ArrowLeft size={15} strokeWidth={1.75} />
        Retour
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-dash-accent/20">
              <Building2 size={20} strokeWidth={1.75} className="text-dash-dark" />
            </div>
            <div>
              <h1 className="text-[28px] font-bold leading-tight tracking-tight text-dash-dark">
                {agence.nom_entreprise}
              </h1>
              <p className="text-sm text-dash-text-secondary">
                {profil?.prenom} {profil?.nom} · Inscrit le {formatDate(agence.created_at)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              variant={
                agence.statut_verification === "verifie"
                  ? "success"
                  : agence.statut_verification === "rejete"
                  ? "danger"
                  : "warning"
              }
            >
              {agence.statut_verification === "verifie"
                ? "Vérifié"
                : agence.statut_verification === "rejete"
                ? "Rejeté"
                : "En attente"}
            </Badge>
            {!actif && <Badge variant="danger">Compte désactivé</Badge>}
            {planActif && <Badge variant="brand">{planActif.nom}</Badge>}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-dash-border bg-white p-4 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
        <span className="text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
          Actions
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dash-text-secondary">Plan :</span>
          <SelecteurPlan
            proprietaireId={id}
            planActuelId={abonnementActif?.plan_id ?? undefined}
            plans={plansDisponibles ?? []}
          />
        </div>
        <BoutonActifAgence proprietaireId={id} actif={actif} />
        <BoutonMessageAgence proprietaireId={id} />
      </div>

      {/* Statistiques */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="CA généré" value={`${caGenere.toLocaleString("fr-FR")} MAD`} />
        <StatCard
          icon={ClipboardList}
          label="Réservations"
          value={resaList.length}
          variant="blue"
        />
        <StatCard
          icon={CheckCircle2}
          label="Taux d'acceptation"
          value={tauxAcceptation === null ? "—" : `${tauxAcceptation}%`}
          variant="gray"
        />
        <StatCard
          icon={XCircle}
          label="Taux d'annulation"
          value={tauxAnnulation === null ? "—" : `${tauxAnnulation}%`}
          variant="red"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Infos générales */}
        <div className="rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
          <h2 className="mb-4 text-sm font-semibold text-dash-dark">Informations générales</h2>
          <dl className="space-y-2.5 text-sm">
            <Ligne label="Gérant" valeur={`${profil?.prenom ?? ""} ${profil?.nom ?? ""}`.trim() || "—"} />
            <Ligne label="Email" valeur={profil?.email ?? "—"} />
            <Ligne label="Téléphone" valeur={profil?.telephone ?? "—"} />
            <Ligne label="Ville" valeur={agence.ville} />
            <Ligne label="Adresse" valeur={agence.adresse ?? "—"} />
            <Ligne label="Registre de commerce" valeur={agence.registre_commerce} />
            <Ligne
              label="Spécialité"
              valeur={
                agence.specialite === "motos" ? "Motos" : "Voitures / Utilitaires"
              }
            />
            <Ligne label="Vérifié le" valeur={formatDate(agence.verifie_le)} />
          </dl>
        </div>

        {/* Plan + historique */}
        <div className="rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-dash-dark">
            <Package size={15} strokeWidth={1.75} />
            Plan &amp; historique
          </h2>
          {!historiquePlans || historiquePlans.length === 0 ? (
            <p className="text-sm text-dash-text-secondary">Aucun abonnement enregistré.</p>
          ) : (
            <ul className="space-y-2.5">
              {historiquePlans.map((a) => {
                const plan = Array.isArray(a.plans) ? a.plans[0] : a.plans;
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between border-b border-dash-border pb-2.5 text-sm last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-dash-text">{plan?.nom ?? "Plan supprimé"}</p>
                      <p className="text-xs text-dash-text-secondary">
                        Depuis le {formatDate(a.date_debut)}
                        {a.date_fin ? ` → ${formatDate(a.date_fin)}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant={
                        a.statut === "actif"
                          ? "success"
                          : a.statut === "annule"
                          ? "neutral"
                          : "warning"
                      }
                    >
                      {a.statut}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Véhicules */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-dash-dark">
          <Car size={15} strokeWidth={1.75} />
          Véhicules ({vehicules?.length ?? 0})
        </h2>
        {!vehicules || vehicules.length === 0 ? (
          <EmptyState icon={Car} title="Aucun véhicule" description="Cette agence n'a publié aucun véhicule." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-dash-border bg-white shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            {vehicules.map((v, i) => (
              <div
                key={v.id}
                className={`flex items-center justify-between px-5 py-3.5 text-sm ${
                  i !== 0 ? "border-t border-dash-border" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-dash-text">
                    {v.marque} {v.modele}
                  </p>
                  <p className="text-xs text-dash-text-secondary">
                    {v.immatriculation} · {v.ville} · {v.prix_jour} MAD/j
                  </p>
                </div>
                <Badge
                  variant={
                    v.deleted_at ? "neutral" : v.statut === "actif" ? "success" : "warning"
                  }
                >
                  {v.deleted_at ? "Supprimé" : v.statut === "actif" ? "Actif" : "Inactif"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Réservations */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-dash-dark">
          <ClipboardList size={15} strokeWidth={1.75} />
          Réservations récentes
        </h2>
        {resaList.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Aucune réservation" description="Aucune réservation pour cette agence." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-dash-border bg-white shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dash-border bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
                  <th className="px-5 py-3">Véhicule</th>
                  <th className="px-5 py-3">Période</th>
                  <th className="px-5 py-3">Montant</th>
                  <th className="px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {resaList.slice(0, 15).map((r) => {
                  const veh = Array.isArray(r.vehicules) ? r.vehicules[0] : r.vehicules;
                  const st = LABELS_STATUT_RESA[r.statut];
                  return (
                    <tr key={r.id} className="border-b border-dash-border last:border-0">
                      <td className="px-5 py-3 font-medium text-dash-text">
                        {veh?.marque} {veh?.modele}
                        {r.source === "manuel" && (
                          <span className="ml-1 text-xs text-dash-text-secondary">(blocage)</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-dash-text-secondary">
                        {formatDate(r.date_debut)} → {formatDate(r.date_fin)}
                      </td>
                      <td className="px-5 py-3 text-dash-text-secondary">
                        {r.prix_total ? `${r.prix_total.toLocaleString("fr-FR")} MAD` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={st?.variant ?? "neutral"}>{st?.label ?? r.statut}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Documents */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-dash-dark">
          <FileText size={15} strokeWidth={1.75} />
          Documents
        </h2>
        {!documents || documents.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun document" description="Aucun document d'agence enregistré (RC, pièce d'identité du gérant)." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {documents.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-dash-border bg-white p-4 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-dash-text">
                    {LABELS_TYPE_DOC[d.type_document] ?? d.type_document}
                  </p>
                  <Badge
                    variant={
                      d.statut === "valide"
                        ? "success"
                        : d.statut === "rejete"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {d.statut}
                  </Badge>
                </div>
                <VoirDocument storagePath={d.storage_path} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Journal d'activité */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-dash-dark">
          <History size={15} strokeWidth={1.75} />
          Journal d&apos;activité
        </h2>
        {!journal || journal.length === 0 ? (
          <EmptyState icon={History} title="Aucune trace" description="Aucune action journalisée concernant cette agence." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-dash-border bg-white shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
            {journal.map((l, i) => (
              <div
                key={l.id}
                className={`flex items-center justify-between px-5 py-3 text-sm ${
                  i !== 0 ? "border-t border-dash-border" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-dash-text">{l.action}</p>
                  <p className="text-xs text-dash-text-secondary">
                    {l.resource_type}
                    {l.actor_role ? ` · par ${l.actor_role}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-dash-text-secondary">
                  {new Date(l.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-dash-text-secondary">{label}</dt>
      <dd className="text-right font-medium text-dash-text">{valeur}</dd>
    </div>
  );
}
