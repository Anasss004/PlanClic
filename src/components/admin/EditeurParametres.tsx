"use client";

import { useState, useTransition } from "react";
import { Plus, Save, X } from "lucide-react";
import { definirParametrePlateforme } from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

type Ligne = {
  cle: string;
  valeur: unknown;
  est_public: boolean;
  description: string | null;
  updated_at: string;
};

const champ =
  "w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark";

export default function EditeurParametres({ lignes }: { lignes: Ligne[] }) {
  return (
    <div className="space-y-5">
      {lignes.map((l) => (
        <Carte key={l.cle} ligne={l} />
      ))}
    </div>
  );
}

function Carte({ ligne }: { ligne: Ligne }) {
  const estListe = Array.isArray(ligne.valeur);

  return (
    <div className="rounded-xl border border-dash-border bg-white p-5 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-dash-dark">{ligne.cle}</p>
          {ligne.description && (
            <p className="mt-0.5 text-xs text-dash-text-secondary">
              {ligne.description}
            </p>
          )}
        </div>
        <p className="shrink-0 text-xs text-dash-text-secondary">
          maj {new Date(ligne.updated_at).toLocaleDateString("fr-FR")}
        </p>
      </div>

      {estListe ? (
        <EditeurListe cle={ligne.cle} valeurInitiale={ligne.valeur as string[]} />
      ) : (
        <EditeurTexte cle={ligne.cle} valeurInitiale={String(ligne.valeur ?? "")} />
      )}
    </div>
  );
}

function EditeurTexte({
  cle,
  valeurInitiale,
}: {
  cle: string;
  valeurInitiale: string;
}) {
  const [valeur, setValeur] = useState(valeurInitiale);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const modifie = valeur !== valeurInitiale;

  function enregistrer() {
    startTransition(async () => {
      try {
        await definirParametrePlateforme(cle, valeur);
        toast.success("Paramètre enregistré.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <input
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        className={champ}
      />
      <button
        onClick={enregistrer}
        disabled={isPending || !modifie}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-dash-sidebar px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        <Save size={14} />
        Enregistrer
      </button>
    </div>
  );
}

function EditeurListe({
  cle,
  valeurInitiale,
}: {
  cle: string;
  valeurInitiale: string[];
}) {
  const [items, setItems] = useState<string[]>(valeurInitiale);
  const [nouveau, setNouveau] = useState("");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const modifie = JSON.stringify(items) !== JSON.stringify(valeurInitiale);

  function ajouter() {
    const v = nouveau.trim();
    if (!v || items.includes(v)) return;
    setItems([...items, v]);
    setNouveau("");
  }

  function enregistrer() {
    startTransition(async () => {
      try {
        await definirParametrePlateforme(cle, items);
        toast.success("Liste enregistrée.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {items.map((it) => (
          <span
            key={it}
            className="flex items-center gap-1.5 rounded-full bg-dash-accent/15 px-3 py-1 text-xs font-medium text-dash-text"
          >
            {it}
            <button
              onClick={() => setItems(items.filter((x) => x !== it))}
              className="text-dash-text-secondary hover:text-rose-600"
              aria-label={`Retirer ${it}`}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-dash-text-secondary">Liste vide.</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={nouveau}
          onChange={(e) => setNouveau(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ajouter();
            }
          }}
          placeholder="Ajouter…"
          className={champ}
        />
        <button
          onClick={ajouter}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-dash-border px-3 py-2 text-sm font-medium text-dash-text-secondary hover:bg-gray-50"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={enregistrer}
          disabled={isPending || !modifie}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-dash-sidebar px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          <Save size={14} />
          Enregistrer
        </button>
      </div>
    </div>
  );
}
