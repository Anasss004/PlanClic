"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Building2, User, Car, ClipboardList } from "lucide-react";
import {
  rechercheGlobaleAdmin,
  type ResultatRecherche,
} from "@/app/actions/admin";
import { useToast } from "@/components/ui/Toast";

const ICONES = {
  agence: Building2,
  utilisateur: User,
  vehicule: Car,
  reservation: ClipboardList,
} as const;

const LABELS_CAT: Record<ResultatRecherche["categorie"], string> = {
  agence: "Agence",
  utilisateur: "Utilisateur",
  vehicule: "Véhicule",
  reservation: "Réservation",
};

export default function RechercheGlobale() {
  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = terme.trim();
    if (t.length < 2) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const r = await rechercheGlobaleAdmin(t);
          setResultats(r);
          setOuvert(true);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Recherche impossible.");
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [terme, toast]);

  useEffect(() => {
    function onClickExterieur(e: MouseEvent) {
      if (
        conteneurRef.current &&
        !conteneurRef.current.contains(e.target as Node)
      ) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", onClickExterieur);
    return () => document.removeEventListener("mousedown", onClickExterieur);
  }, []);

  function aller(lien: string) {
    setOuvert(false);
    setTerme("");
    setResultats([]);
    router.push(lien);
  }

  return (
    <div ref={conteneurRef} className="relative mb-6">
      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 focus-within:bg-white/15">
        {isPending ? (
          <Loader2 size={15} className="shrink-0 animate-spin text-dash-muted" />
        ) : (
          <Search size={15} strokeWidth={2} className="shrink-0 text-dash-muted" />
        )}
        <input
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
          onFocus={() => resultats.length > 0 && setOuvert(true)}
          placeholder="Rechercher…"
          className="w-full bg-transparent text-sm text-white placeholder:text-dash-muted/70 focus:outline-none"
          aria-label="Recherche globale"
        />
      </div>

      {ouvert && terme.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-lg border border-dash-border bg-white py-1 shadow-xl">
          {resultats.length === 0 ? (
            <p className="px-3 py-3 text-xs text-dash-text-secondary">
              {isPending ? "Recherche…" : "Aucun résultat."}
            </p>
          ) : (
            resultats.map((r) => {
              const Icone = ICONES[r.categorie];
              return (
                <button
                  key={`${r.categorie}-${r.ref_id}`}
                  onClick={() => aller(r.lien)}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition hover:bg-gray-50"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-dash-accent/15">
                    <Icone size={14} strokeWidth={1.75} className="text-dash-dark" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-dash-text">
                      {r.titre}
                    </span>
                    <span className="block truncate text-xs text-dash-text-secondary">
                      {LABELS_CAT[r.categorie]} · {r.sous_titre}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
