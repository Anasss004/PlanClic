"use client";

import { useState } from "react";
import { X, MapPin } from "lucide-react";

export default function PanneauCarte({ ville }: { ville?: string }) {
  const [ferme, setFerme] = useState(false);

  if (ferme) return null;

  return (
    <div className="relative hidden overflow-hidden rounded-2xl border border-black/5 bg-brand-light/30 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.15)] lg:block">
      <button
        onClick={() => setFerme(true)}
        aria-label="Fermer la carte"
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-white text-gray-600 shadow transition hover:text-gray-900"
      >
        <X size={16} strokeWidth={2} />
      </button>

      <div className="flex h-full min-h-[500px] flex-col items-center justify-center gap-2 p-8 text-center">
        <MapPin size={28} strokeWidth={1.5} className="text-brand-dark/50" />
        {ville && (
          <p className="font-[family-name:var(--font-bagel)] text-2xl text-brand-dark/70">
            {ville}
          </p>
        )}
        <p className="text-xs text-brand-dark/40">
          Carte interactive — bientôt disponible
        </p>
      </div>
    </div>
  );
}
