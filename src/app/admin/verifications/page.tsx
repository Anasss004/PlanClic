import { ShieldCheck, FileText, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import ActionsVerificationProprietaire, { VoirDocument } from "@/components/admin/ActionsVerification";
import ActionsDocument from "@/components/admin/ActionsDocument";

const LABELS_TYPE_DOCUMENT: Record<string, string> = {
  cin: "Carte d'Identité (CIN)",
  permis: "Permis de conduire",
  registre_commerce: "Registre de Commerce",
  id_gerant: "Pièce d'identité du gérant",
};

export default async function VerificationsPage() {
  const supabase = await createClient();

  const { data: proprietairesEnAttente } = await supabase
    .from("proprietaires")
    .select("id, nom_entreprise, ville, registre_commerce, created_at")
    .eq("statut_verification", "en_attente")
    .order("created_at", { ascending: true });

  const idsProprietaires = (proprietairesEnAttente ?? []).map((p) => p.id);
  const { data: profilsProprietaires } = idsProprietaires.length
    ? await supabase.from("profiles").select("id, prenom, nom, email").in("id", idsProprietaires)
    : { data: [] };
  const profilParId = new Map((profilsProprietaires ?? []).map((p) => [p.id, p]));

  const { data: documentsEnAttente } = await supabase
    .from("documents")
    .select("id, type_document, storage_path, created_at, owner_id")
    .eq("statut", "en_attente")
    .order("created_at", { ascending: true });

  const idsProprietairesDoc = [...new Set((documentsEnAttente ?? []).map((d) => d.owner_id))];
  const { data: profilsDocuments } = idsProprietairesDoc.length
    ? await supabase.from("profiles").select("id, prenom, nom").in("id", idsProprietairesDoc)
    : { data: [] };
  const profilDocParId = new Map((profilsDocuments ?? []).map((p) => [p.id, p]));

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">Vérifications</h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Comptes propriétaires et documents en attente de validation.
        </p>
      </div>

      {/* Comptes propriétaires */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-dash-dark">
          Comptes propriétaires ({proprietairesEnAttente?.length ?? 0})
        </h2>

        {!proprietairesEnAttente || proprietairesEnAttente.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Rien à vérifier" description="Tous les comptes propriétaires ont été traités." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {proprietairesEnAttente.map((p) => {
              const profil = profilParId.get(p.id);
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-dash-border bg-white shadow-[0px_4px_20px_rgba(15,76,129,0.05)]"
                >
                  <div className="flex items-center justify-between border-b border-dash-border bg-[#faf9fa] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-dash-accent/20">
                        <User size={16} strokeWidth={1.75} className="text-dash-dark" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-dash-text">{p.nom_entreprise}</p>
                        <p className="text-xs text-dash-text-secondary">{profil?.prenom} {profil?.nom}</p>
                      </div>
                    </div>
                    <Badge variant="warning">En attente</Badge>
                  </div>
                  <div className="space-y-1 px-4 py-3 text-xs text-dash-text-secondary">
                    <p>{profil?.email}</p>
                    <p>{p.ville} · RC {p.registre_commerce}</p>
                  </div>
                  <div className="border-t border-dash-border px-4 py-3">
                    <ActionsVerificationProprietaire proprietaireId={p.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Documents */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-dash-dark">
          Documents ({documentsEnAttente?.length ?? 0})
        </h2>

        {!documentsEnAttente || documentsEnAttente.length === 0 ? (
          <EmptyState icon={FileText} title="Rien à vérifier" description="Tous les documents ont été traités." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documentsEnAttente.map((d) => {
              const profil = profilDocParId.get(d.owner_id);
              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-dash-border bg-white shadow-[0px_4px_20px_rgba(15,76,129,0.05)]"
                >
                  <div className="flex items-center justify-between border-b border-dash-border bg-[#faf9fa] px-4 py-3">
                    <p className="text-sm font-semibold text-dash-text">
                      {LABELS_TYPE_DOCUMENT[d.type_document] ?? d.type_document}
                    </p>
                    <Badge variant="warning">En attente</Badge>
                  </div>
                  <div className="px-4 py-4">
                    <p className="mb-3 text-xs text-dash-text-secondary">
                      {profil?.prenom} {profil?.nom}
                    </p>
                    <VoirDocument storagePath={d.storage_path} />
                  </div>
                  <div className="border-t border-dash-border px-4 py-3">
                    <ActionsDocument documentId={d.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
