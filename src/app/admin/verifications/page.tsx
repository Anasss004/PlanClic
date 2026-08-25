import { ShieldCheck, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import ActionsVerificationProprietaire, { VoirDocument } from "@/components/admin/ActionsVerification";
import ActionsDocument from "@/components/admin/ActionsDocument";

export default async function VerificationsPage() {
  const supabase = await createClient();

  const { data: proprietairesEnAttente, error: erreurProprietaires } = await supabase
    .from("proprietaires")
    .select("id, nom_entreprise, ville, registre_commerce, created_at")
    .eq("statut_verification", "en_attente")
    .order("created_at", { ascending: true });

  if (erreurProprietaires) {
    console.error("Erreur chargement propriétaires en attente:", erreurProprietaires.message);
  }

  // Requête séparée pour les profils (évite l'ambiguïté PostgREST :
  // "proprietaires" a deux liens vers "profiles", id et verifie_par).
  const idsProprietaires = proprietairesEnAttente?.map((p) => p.id) ?? [];
  const { data: profilsProprietaires } = idsProprietaires.length
    ? await supabase
        .from("profiles")
        .select("id, prenom, nom, email")
        .in("id", idsProprietaires)
    : { data: [] };

  const profilParId = new Map(
    (profilsProprietaires ?? []).map((p) => [p.id, p])
  );

  const { data: documentsEnAttente, error: erreurDocuments } = await supabase
    .from("documents")
    .select("id, type_document, storage_path, created_at, owner_id, profiles(prenom, nom)")
    .eq("statut", "en_attente")
    .order("created_at", { ascending: true });

  if (erreurDocuments) {
    console.error("Erreur chargement documents en attente:", erreurDocuments.message);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Vérifications
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Comptes propriétaires et documents en attente de validation.
        </p>
      </div>

      {/* Comptes propriétaires */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Comptes propriétaires ({proprietairesEnAttente?.length ?? 0})
        </h2>

        {!proprietairesEnAttente || proprietairesEnAttente.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Rien à vérifier"
            description="Tous les comptes propriétaires ont été traités."
          />
        ) : (
          <div className="space-y-3">
            {proprietairesEnAttente.map((p) => {
              const profil = profilParId.get(p.id);
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {p.nom_entreprise}
                      </p>
                      <p className="text-xs text-gray-500">
                        {profil?.prenom} {profil?.nom} · {profil?.email} · {p.ville}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        RC : {p.registre_commerce}
                      </p>
                    </div>
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
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Documents ({documentsEnAttente?.length ?? 0})
        </h2>

        {!documentsEnAttente || documentsEnAttente.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Rien à vérifier"
            description="Tous les documents ont été traités."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {documentsEnAttente.map((d, i) => (
              <div
                key={d.id}
                className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                  i !== 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {d.type_document.replace("_", " ")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {/* @ts-expect-error - relation typing simplifié */}
                    {d.profiles?.prenom} {d.profiles?.nom}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <VoirDocument storagePath={d.storage_path} />
                  <ActionsDocument documentId={d.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
