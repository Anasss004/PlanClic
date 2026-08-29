"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const THEMES = {
  brand: {
    actif: "bg-brand-dark text-white",
    texte: "text-brand-dark",
    border: "border-[#b9b9b9] focus-within:border-brand-dark",
    hover: "hover:bg-brand-light/40",
  },
  dash: {
    actif: "bg-dash-sidebar text-white",
    texte: "text-dash-dark",
    border: "border-dash-border focus-within:border-dash-dark",
    hover: "hover:bg-dash-accent/15",
  },
} as const;

export default function DatePicker({
  name,
  defaultValue,
  value,
  onChange,
  min,
  required,
  placeholder = "jj/mm/aaaa",
  theme = "brand",
  className = "",
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (iso: string) => void;
  min?: string;
  required?: boolean;
  placeholder?: string;
  theme?: keyof typeof THEMES;
  className?: string;
}) {
  const controle = value !== undefined;
  const [valeurInterne, setValeurInterne] = useState(defaultValue ?? "");
  const valeur = controle ? value! : valeurInterne;

  const [ouvert, setOuvert] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [moisAffiche, setMoisAffiche] = useState(() => {
    const d = valeur ? new Date(valeur) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const boutonRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);
  const c = THEMES[theme];

  // Calcule la position du panneau par rapport au bouton, à l'ouverture.
  useLayoutEffect(() => {
    if (!ouvert || !boutonRef.current) return;
    const rect = boutonRef.current.getBoundingClientRect();
    const largeurPanneau = 288; // w-72
    let left = rect.left;
    // Évite de déborder à droite de l'écran
    if (left + largeurPanneau > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - largeurPanneau - 8);
    }
    setPosition({ top: rect.bottom + 8, left, width: rect.width });
  }, [ouvert]);

  // Ferme si on clique en dehors (bouton ou panneau), ou si on scroll/resize
  // pour éviter un panneau mal positionné.
  useEffect(() => {
    function fermerSiExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (
        boutonRef.current && !boutonRef.current.contains(cible) &&
        panneauRef.current && !panneauRef.current.contains(cible)
      ) {
        setOuvert(false);
      }
    }
    function fermer() {
      setOuvert(false);
    }
    document.addEventListener("mousedown", fermerSiExterieur);
    window.addEventListener("scroll", fermer, true);
    window.addEventListener("resize", fermer);
    return () => {
      document.removeEventListener("mousedown", fermerSiExterieur);
      window.removeEventListener("scroll", fermer, true);
      window.removeEventListener("resize", fermer);
    };
  }, []);

  function definir(iso: string) {
    if (!controle) setValeurInterne(iso);
    onChange?.(iso);
    setOuvert(false);
  }

  const premierJourMois = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1);
  const nbJoursMois = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 0).getDate();
  const decalage = (premierJourMois.getDay() + 6) % 7;
  const cases: (number | null)[] = Array(decalage).fill(null);
  for (let j = 1; j <= nbJoursMois; j++) cases.push(j);

  function iso(jour: number) {
    const d = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), jour);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const texteAffiche = valeur
    ? new Date(valeur + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : placeholder;

  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={valeur} required={required} />}
      <button
        ref={boutonRef}
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-full border ${c.border} bg-white px-4 py-2.5 text-left text-sm outline-none transition-shadow ${
          valeur ? c.texte : "text-gray-400"
        }`}
      >
        <Calendar size={15} strokeWidth={1.75} className="shrink-0 opacity-60" />
        <span className="truncate">{texteAffiche}</span>
      </button>

      {ouvert && position && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panneauRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-[100] w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() - 1, 1))}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <p className={`text-sm font-semibold capitalize ${c.texte}`}>
                {MOIS[moisAffiche.getMonth()]} {moisAffiche.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() => setMoisAffiche(new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1))}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
              {JOURS.map((j, i) => (
                <span key={i}>{j}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cases.map((jour, i) => {
                if (jour === null) return <span key={i} />;
                const dateIso = iso(jour);
                const estDesactive = !!min && dateIso < min;
                const estSelectionne = dateIso === valeur;
                return (
                  <button
                    type="button"
                    key={i}
                    disabled={estDesactive}
                    onClick={() => definir(dateIso)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition ${
                      estSelectionne
                        ? c.actif
                        : estDesactive
                        ? "cursor-not-allowed text-gray-300"
                        : `text-gray-700 ${c.hover}`
                    }`}
                  >
                    {jour}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
