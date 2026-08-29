import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { exigerStaff } from "@/lib/admin/auth";

const EXPORTS = [
  {
    type: "utilisateurs",
    titre: "Utilisateurs",
    description: "Tous les comptes (nom, email, téléphone, rôle, date d'inscription).",
  },
  {
    type: "reservations",
    titre: "Réservations",
    description: "Toutes les réservations avec agence, véhicule, dates, statut et montant.",
  },
  {
    type: "revenus",
    titre: "Revenus par agence",
    description: "CA généré et nombre de réservations terminées, agrégés par agence.",
  },
];

export default async function ExportsPage() {
  await exigerStaff();

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-[32px] font-bold tracking-tight text-dash-dark">
          <FileSpreadsheet size={26} strokeWidth={1.75} />
          Exports
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Pour la comptabilité ou le reporting externe. Chaque téléchargement
          est journalisé.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((e) => (
          <div
            key={e.type}
            className="flex flex-col rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]"
          >
            <p className="text-lg font-bold text-dash-dark">{e.titre}</p>
            <p className="mt-1 flex-1 text-xs text-dash-text-secondary">
              {e.description}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`/admin/exports/${e.type}`}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-dash-sidebar px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <Download size={14} />
                Télécharger CSV
              </a>
              <a
                href={`/admin/exports/${e.type}?format=html`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dash-border px-4 py-2 text-sm font-medium text-dash-text-secondary hover:bg-gray-50"
              >
                <Printer size={14} />
                Version imprimable (PDF)
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-dash-text-secondary">
        « Version imprimable » ouvre un tableau mis en page : utilisez
        l&apos;impression du navigateur (Cmd/Ctrl + P) puis « Enregistrer au
        format PDF ». Un vrai générateur PDF côté serveur pourra être ajouté
        plus tard (dépendance à une librairie type <code>@react-pdf/renderer</code>).
      </p>
    </div>
  );
}
