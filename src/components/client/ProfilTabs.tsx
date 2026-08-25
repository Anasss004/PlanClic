"use client";

import { useState } from "react";
import { User, ClipboardList, FileText } from "lucide-react";
import InfosPersonnelles from "./InfosPersonnelles";
import MesReservations from "./MesReservations";
import MesDocuments from "./MesDocuments";

type Onglet = "profil" | "reservations" | "documents";

const ONGLETS: { key: Onglet; label: string; icon: typeof User }[] = [
  { key: "profil", label: "Vue d'ensemble", icon: User },
  { key: "reservations", label: "Mes réservations", icon: ClipboardList },
  { key: "documents", label: "Mes documents", icon: FileText },
];

export default function ProfilTabs({
  profile,
  reservations,
  documents,
  ongletInitial,
  erreur,
  message,
}: {
  profile: any;
  reservations: any[];
  documents: any[];
  ongletInitial?: string;
  erreur?: string;
  message?: string;
}) {
  const [onglet, setOnglet] = useState<Onglet>(
    (ongletInitial as Onglet) ?? "profil"
  );

  return (
    <div>
      {message && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          {message === "profil-mis-a-jour"
            ? "Profil mis à jour avec succès."
            : message === "document-envoye"
            ? "Document envoyé. Il sera vérifié par notre équipe."
            : message}
        </p>
      )}
      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          Une erreur est survenue. Réessaie.
        </p>
      )}

      {/* Barre d'onglets */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {ONGLETS.map((o) => (
          <button
            key={o.key}
            onClick={() => setOnglet(o.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              onglet === o.key
                ? "border-brand-dark text-brand-dark"
                : "border-transparent text-gray-500 hover:text-brand-dark"
            }`}
          >
            <o.icon size={16} strokeWidth={1.75} />
            {o.label}
          </button>
        ))}
      </div>

      {onglet === "profil" && <InfosPersonnelles profile={profile} />}
      {onglet === "reservations" && <MesReservations reservations={reservations} />}
      {onglet === "documents" && <MesDocuments documents={documents} />}
    </div>
  );
}
