import { FileText } from "lucide-react";
import { uploaderDocument } from "@/app/actions/client";
import Badge from "@/components/ui/Badge";
import FileUpload from "@/components/ui/FileUpload";

const TYPES = [
  { key: "cin", label: "Carte d'identité nationale" },
  { key: "permis", label: "Permis de conduire" },
];

const LABELS_STATUT: Record<string, { label: string; variant: "warning" | "success" | "danger" }> = {
  en_attente: { label: "En attente de vérification", variant: "warning" },
  valide: { label: "Validé", variant: "success" },
  rejete: { label: "Rejeté", variant: "danger" },
};

export default function MesDocuments({ documents }: { documents: any[] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">
          Ajouter un document
        </h2>
        <p className="mb-4 text-xs text-gray-500">
          Envoyez votre CIN et permis à l&apos;avance pour accélérer vos
          prochaines réservations.
        </p>

        <form action={uploaderDocument} className="space-y-3">
          <select
            name="type_document"
            required
            className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-dark sm:w-auto"
          >
            {TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          <FileUpload name="fichier" accept="application/pdf,image/*" required theme="brand" />
          <button
            type="submit"
            className="rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95"
          >
            Envoyer
          </button>
        </form>
      </div>

      {documents.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-6 text-sm text-gray-500">
          <FileText size={18} strokeWidth={1.75} className="text-gray-400" />
          Aucun document envoyé pour l&apos;instant.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {documents.map((d, i) => {
            const statut = LABELS_STATUT[d.statut] ?? { label: d.statut, variant: "warning" as const };
            const typeLabel = TYPES.find((t) => t.key === d.type_document)?.label ?? d.type_document;
            return (
              <div
                key={d.id}
                className={`flex items-center justify-between px-5 py-4 ${
                  i !== 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{typeLabel}</p>
                <Badge variant={statut.variant}>{statut.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
