import { completerProfilPro } from "@/app/actions/proprietaire";

const ERREURS: Record<string, string> = {
  "upload-rc": "Impossible d'envoyer le document du Registre de Commerce. Réessaie.",
  "upload-id": "Impossible d'envoyer la pièce d'identité. Réessaie.",
  "creation-profil": "Impossible de créer ton profil professionnel. Vérifie tes informations.",
};

export default async function InfosProfessionnellesPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const params = await searchParams;
  const erreur = params.erreur ? ERREURS[params.erreur] : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <p className="mb-1 font-[family-name:var(--font-bagel)] text-2xl text-brand-dark">
        Une dernière étape
      </p>
      <p className="mb-6 text-sm text-[#6a6a6a]">
        Ces informations sont vérifiées manuellement par notre équipe avant
        l&apos;activation de ton compte — comptez généralement 24 à 48h.
      </p>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {erreur}
        </p>
      )}

      <form action={completerProfilPro} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-brand-dark">
            Nom de l&apos;entreprise / agence
          </label>
          <input
            name="nom_entreprise"
            required
            className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-brand-dark">
            Spécialité
          </label>
          <select
            name="specialite"
            required
            className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
          >
            <option value="voitures_utilitaires">Voitures & utilitaires</option>
            <option value="motos">Motos</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Ville
            </label>
            <input
              name="ville"
              required
              className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Registre de Commerce (n°)
            </label>
            <input
              name="registre_commerce"
              required
              className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-brand-dark">
            Adresse
          </label>
          <input
            name="adresse"
            className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
          />
        </div>

        <div className="rounded-2xl border border-dashed border-[#b9b9b9] p-4">
          <label className="mb-1 block text-sm font-semibold text-brand-dark">
            Document du Registre de Commerce
          </label>
          <p className="mb-2 text-xs text-[#6a6a6a]">
            PDF ou photo lisible. Ce document est stocké de façon privée et
            n&apos;est jamais accessible publiquement.
          </p>
          <input
            type="file"
            name="document_rc"
            accept="application/pdf,image/*"
            required
            className="w-full text-sm"
          />
        </div>

        <div className="rounded-2xl border border-dashed border-[#b9b9b9] p-4">
          <label className="mb-1 block text-sm font-semibold text-brand-dark">
            Pièce d&apos;identité du gérant
          </label>
          <p className="mb-2 text-xs text-[#6a6a6a]">
            Recto/verso dans un seul fichier si possible.
          </p>
          <input
            type="file"
            name="document_id"
            accept="application/pdf,image/*"
            required
            className="w-full text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95"
        >
          Envoyer pour vérification
        </button>
      </form>
    </div>
  );
}
