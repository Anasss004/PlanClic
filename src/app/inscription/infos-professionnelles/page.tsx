import { MessageCircle, ChevronDown } from "lucide-react";
import { completerProfilPro } from "@/app/actions/proprietaire";
import FileUpload from "@/components/ui/FileUpload";
import { lienWhatsAppAdmin } from "@/lib/whatsapp";

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

  const messageWhatsApp =
    "Bonjour, je viens de m'inscrire sur PlanClic en tant que propriétaire. " +
    "Je vous envoie ci-joint mon Registre de Commerce et ma pièce d'identité pour vérification. Merci !";

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

        {/* Documents — méthode recommandée : WhatsApp (temporaire) */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <MessageCircle size={16} strokeWidth={2} />
            Méthode recommandée : envoyer tes documents par WhatsApp
          </p>
          <p className="mb-3 text-xs text-emerald-700">
            Pour l&apos;instant, la façon la plus simple et la plus rapide de
            nous transmettre ton Registre de Commerce et ta pièce
            d&apos;identité est de nous les envoyer directement sur WhatsApp —
            notre équipe les traite manuellement pour la vérification.
          </p>
          <a
            href={lienWhatsAppAdmin(messageWhatsApp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
          >
            <MessageCircle size={16} strokeWidth={2} />
            Envoyer mes documents par WhatsApp
          </a>
        </div>

        {/* Upload classique — repliable, optionnel */}
        <details className="rounded-2xl border border-dashed border-[#b9b9b9] p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-brand-dark">
            Ou envoyer les fichiers directement ici (optionnel)
            <ChevronDown size={16} strokeWidth={2} />
          </summary>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-dark">
                Document du Registre de Commerce
              </label>
              <p className="mb-2 text-xs text-[#6a6a6a]">
                PDF ou photo lisible. Ce document est stocké de façon privée et
                n&apos;est jamais accessible publiquement.
              </p>
              <FileUpload name="document_rc" accept="application/pdf,image/*" theme="brand" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-dark">
                Pièce d&apos;identité du gérant
              </label>
              <p className="mb-2 text-xs text-[#6a6a6a]">
                Recto/verso dans un seul fichier si possible.
              </p>
              <FileUpload name="document_id" accept="application/pdf,image/*" theme="brand" />
            </div>
          </div>
        </details>

        <p className="text-center text-xs text-[#6a6a6a]">
          Dans les deux cas, envoie ton dossier avant de valider — ton compte
          reste en attente jusqu&apos;à réception de tes documents.
        </p>

        <button
          type="submit"
          className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95"
        >
          Valider mes informations
        </button>
      </form>
    </div>
  );
}
