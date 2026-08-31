"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Circle, X, Rocket } from "lucide-react";

const CLE_MASQUE = "pc_checklist_onboarding_masquee";

type Etape = { fait: boolean; label: string; href: string; cta: string };

export default function ChecklistOnboarding({
  compteVerifie,
  premierVehicule,
  premiereLocation,
}: {
  compteVerifie: boolean;
  premierVehicule: boolean;
  premiereLocation: boolean;
}) {
  const [masquee, setMasquee] = useState(true); // évite le flash avant lecture localStorage

  useEffect(() => {
    try {
      setMasquee(localStorage.getItem(CLE_MASQUE) === "1");
    } catch {
      setMasquee(false);
    }
  }, []);

  const etapes: Etape[] = [
    {
      fait: compteVerifie,
      label: "Compte vérifié",
      href: "/proprietaire/parametres",
      cta: "Voir le statut",
    },
    {
      fait: premierVehicule,
      label: "Premier véhicule ajouté",
      href: "/proprietaire/vehicules/nouveau",
      cta: "Ajouter un véhicule",
    },
    {
      fait: premiereLocation,
      label: "Première location enregistrée",
      href: "/proprietaire/bloquer",
      cta: "Nouvelle location",
    },
  ];

  const toutFait = etapes.every((e) => e.fait);
  if (toutFait || masquee) return null;

  const prochaine = etapes.find((e) => !e.fait);

  function masquer() {
    try {
      localStorage.setItem(CLE_MASQUE, "1");
    } catch {
      /* ignore */
    }
    setMasquee(true);
  }

  return (
    <div className="mb-8 rounded-2xl border border-dash-border bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
      <div className="mb-3 flex items-start justify-between">
        <p className="flex items-center gap-2 text-base font-bold text-dash-dark">
          <Rocket size={17} strokeWidth={2} className="text-dash-accent" />
          Bien démarrer sur PlanClic
        </p>
        <button
          onClick={masquer}
          className="text-xs text-dash-text-secondary hover:text-dash-dark"
          aria-label="Masquer la checklist"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      <ul className="space-y-2">
        {etapes.map((e) => (
          <li key={e.label} className="flex items-center gap-2.5 text-sm">
            {e.fait ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a6f4c5]">
                <Check size={12} strokeWidth={3} className="text-[#006c4a]" />
              </span>
            ) : (
              <Circle size={20} strokeWidth={1.5} className="text-dash-border" />
            )}
            <span className={e.fait ? "text-dash-text-secondary line-through" : "font-medium text-dash-text"}>
              {e.label}
            </span>
          </li>
        ))}
      </ul>

      {prochaine && (
        <Link
          href={prochaine.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-dash-accent px-4 py-2 text-sm font-bold text-dash-text transition hover:brightness-95"
        >
          {prochaine.cta}
        </Link>
      )}
    </div>
  );
}
