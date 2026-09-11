"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import PanneauFlottant from "@/components/ui/PanneauFlottant";

export type OptionRecherchable = {
  valeur: string;
  /** Ligne principale, ex. "Dacia Logan". */
  libelle: string;
  /** Ligne secondaire, ex. "45619-D-26 · Marrakech". */
  details?: string;
  /** Texte supplémentaire pris en compte par la recherche sans être affiché. */
  motsCles?: string;
};

/**
 * Liste déroulante avec filtrage au clavier.
 *
 * La valeur retenue est postée via un <input type="hidden">, donc le composant
 * s'utilise dans un formulaire classique (Server Action) sans état supplémentaire.
 *
 * Le panneau passe par PanneauFlottant : rendu dans un portail, il ne peut être
 * rogné par aucun conteneur en overflow hidden, et il bascule au-dessus du champ
 * s'il manque la place en dessous.
 */
export default function SelecteurRecherchable({
  name,
  options,
  valeur,
  onChange,
  placeholder = "Rechercher…",
  placeholderVide = "Aucun résultat",
  required = false,
  className = "",
}: {
  name: string;
  options: OptionRecherchable[];
  valeur: string;
  onChange: (valeur: string) => void;
  placeholder?: string;
  placeholderVide?: string;
  required?: boolean;
  className?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [indexActif, setIndexActif] = useState(0);

  const champRef = useRef<HTMLDivElement>(null);
  const saisieRef = useRef<HTMLInputElement>(null);
  const idListe = useId();

  const selectionnee = useMemo(
    () => options.find((o) => o.valeur === valeur) ?? null,
    [options, valeur]
  );

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return options;
    // Chaque mot saisi doit apparaître quelque part : "logan 456" trouve
    // "Dacia Logan — 45619-D-26" sans imposer l'ordre.
    const mots = q.split(/\s+/);
    return options.filter((o) => {
      const foin = `${o.libelle} ${o.details ?? ""} ${o.motsCles ?? ""}`.toLowerCase();
      return mots.every((m) => foin.includes(m));
    });
  }, [options, recherche]);

  // Le champ de recherche est monté alors que le panneau est encore en
  // visibility:hidden, le temps d'être mesuré et positionné — un focus() à ce
  // moment-là serait sans effet. Cet effet s'exécute après la peinture, une
  // fois le panneau visible.
  useEffect(() => {
    if (!ouvert) return;
    saisieRef.current?.focus();
  }, [ouvert]);

  function ouvrir() {
    setOuvert(true);
    setRecherche("");
    setIndexActif(Math.max(0, filtrees.findIndex((o) => o.valeur === valeur)));
  }

  function choisir(option: OptionRecherchable) {
    onChange(option.valeur);
    setOuvert(false);
    setRecherche("");
  }

  function auClavier(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndexActif((i) => Math.min(i + 1, filtrees.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndexActif((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtrees[indexActif];
      if (option) choisir(option);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOuvert(false);
    }
  }

  return (
    <div className={`relative ${className}`} ref={champRef}>
      <input type="hidden" name={name} value={valeur} required={required} />

      <button
        type="button"
        onClick={() => (ouvert ? setOuvert(false) : ouvrir())}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-left text-sm outline-none transition focus:border-brand-dark"
      >
        <span className={`flex-1 truncate ${selectionnee ? "text-gray-900" : "text-gray-400"}`}>
          {selectionnee ? (
            <>
              {selectionnee.libelle}
              {selectionnee.details && (
                <span className="text-gray-500"> — {selectionnee.details}</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={`shrink-0 text-gray-400 transition ${ouvert ? "rotate-180" : ""}`}
        />
      </button>

      <PanneauFlottant
        ouvert={ouvert}
        ancreRef={champRef}
        onFermer={() => setOuvert(false)}
        placement="bas"
        alignement="etire"
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
      >
        <div>
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search size={14} strokeWidth={2} className="shrink-0 text-gray-400" />
            <input
              ref={saisieRef}
              type="text"
              role="combobox"
              aria-expanded={ouvert}
              aria-controls={idListe}
              aria-autocomplete="list"
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setIndexActif(0);
              }}
              onKeyDown={auClavier}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          <ul id={idListe} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtrees.length === 0 ? (
              <li className="px-3 py-3 text-xs text-gray-400">{placeholderVide}</li>
            ) : (
              filtrees.map((o, i) => {
                const actif = i === indexActif;
                const choisie = o.valeur === valeur;
                return (
                  <li key={o.valeur} role="option" aria-selected={choisie}>
                    <button
                      type="button"
                      onMouseEnter={() => setIndexActif(i)}
                      onClick={() => choisir(o)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left transition ${
                        actif ? "bg-brand-light/30" : ""
                      }`}
                    >
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className={`mt-0.5 shrink-0 ${
                          choisie ? "text-brand-dark" : "text-transparent"
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-900">
                          {o.libelle}
                        </span>
                        {o.details && (
                          <span className="block truncate text-xs text-gray-500">
                            {o.details}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </PanneauFlottant>
    </div>
  );
}
