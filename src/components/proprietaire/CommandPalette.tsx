"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FilePlus2,
  Car,
  ClipboardList,
  CalendarRange,
  BarChart3,
  TriangleAlert,
  Settings,
  X,
  ArrowRight,
} from "lucide-react";

interface CommandPaletteProps {
  ouvert?: boolean;
  onFermer?: () => void;
}

const ACTIONS_RAPIDES = [
  {
    titre: "Nouvelle location (Blocage manuel)",
    description: "Enregistrer une réservation reçue hors-ligne",
    href: "/proprietaire/bloquer",
    icon: FilePlus2,
    badge: "Action",
  },
  {
    titre: "Ajouter un véhicule",
    description: "Ajouter une nouvelle voiture à la flotte",
    href: "/proprietaire/vehicules/nouveau",
    icon: Car,
    badge: "Flotte",
  },
  {
    titre: "Consulter la flotte de véhicules",
    description: "Voir tous les véhicules, documents et tarifs",
    href: "/proprietaire/vehicules",
    icon: Car,
    badge: "Navigation",
  },
  {
    titre: "Toutes les réservations",
    description: "Voir l'historique et statut des réservations",
    href: "/proprietaire/reservations",
    icon: ClipboardList,
    badge: "Navigation",
  },
  {
    titre: "Calendrier & Planning",
    description: "Vue planning Gantt de la flotte",
    href: "/proprietaire/calendrier",
    icon: CalendarRange,
    badge: "Planning",
  },
  {
    titre: "Statistiques & Revenus",
    description: "Consulter les chiffres d'affaires et taux d'occupation",
    href: "/proprietaire/statistiques",
    icon: BarChart3,
    badge: "Rapports",
  },
  {
    titre: "Gestion des amendes",
    description: "Consulter et traiter les infractions routières",
    href: "/proprietaire/amendes",
    icon: TriangleAlert,
    badge: "Sécurité",
  },
  {
    titre: "Paramètres de l'agence",
    description: "Mon profil, entreprise et conditions de location",
    href: "/proprietaire/parametres",
    icon: Settings,
    badge: "Compte",
  },
];

export default function CommandPalette({
  ouvert: propOuvert,
  onFermer,
}: CommandPaletteProps) {
  const [ouvertInternement, setOuvertInternement] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [indexSelectionne, setIndexSelectionne] = useState(0);
  const router = useRouter();

  const estOuvert = propOuvert !== undefined ? propOuvert : ouvertInternement;

  const fermer = useCallback(() => {
    if (onFermer) {
      onFermer();
    } else {
      setOuvertInternement(false);
    }
    setRecherche("");
    setIndexSelectionne(0);
  }, [onFermer]);

  const ouvrir = useCallback(() => {
    setOuvertInternement(true);
  }, []);

  // Écoute des raccourcis clavier Cmd+K / Ctrl+K et Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (estOuvert) {
          fermer();
        } else {
          ouvrir();
        }
      } else if (e.key === "Escape" && estOuvert) {
        e.preventDefault();
        fermer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [estOuvert, fermer, ouvrir]);

  // Écoute de l'événement personnalisé window custom "open-command-palette"
  useEffect(() => {
    const handleCustomOpen = () => setOuvertInternement(true);
    window.addEventListener("open-command-palette", handleCustomOpen);
    return () => window.removeEventListener("open-command-palette", handleCustomOpen);
  }, []);

  const resultatsFiltres = ACTIONS_RAPIDES.filter((action) => {
    if (!recherche.trim()) return true;
    const query = recherche.toLowerCase();
    return (
      action.titre.toLowerCase().includes(query) ||
      action.description.toLowerCase().includes(query) ||
      action.badge.toLowerCase().includes(query)
    );
  });

  const executerAction = (href: string) => {
    fermer();
    router.push(href);
  };

  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndexSelectionne((prev) =>
        prev < resultatsFiltres.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndexSelectionne((prev) =>
        prev > 0 ? prev - 1 : resultatsFiltres.length - 1
      );
    } else if (e.key === "Enter" && resultatsFiltres[indexSelectionne]) {
      e.preventDefault();
      executerAction(resultatsFiltres[indexSelectionne].href);
    }
  };

  if (!estOuvert) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-16 sm:pt-24 backdrop-blur-sm transition-opacity"
      onClick={fermer}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownNav}
      >
        {/* Champ de recherche */}
        <div className="flex items-center border-b border-gray-100 px-4 py-3.5">
          <Search size={18} className="mr-3 text-dash-muted shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Rechercher une action, une page ou taper une commande (ex: location, flotte)..."
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setIndexSelectionne(0);
            }}
            className="w-full bg-transparent text-sm font-medium text-dash-dark outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={fermer}
            className="ml-2 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-dash-dark"
          >
            <X size={16} />
          </button>
        </div>

        {/* Liste des commandes / suggestions */}
        <div className="max-h-80 overflow-y-auto p-2">
          {resultatsFiltres.length === 0 ? (
            <div className="py-8 text-center text-xs text-dash-text-secondary">
              Aucun résultat trouvé pour &quot;{recherche}&quot;.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-dash-muted">
                Actions & Navigation rapides
              </div>
              {resultatsFiltres.map((item, idx) => {
                const estActive = idx === indexSelectionne;
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => executerAction(item.href)}
                    onMouseEnter={() => setIndexSelectionne(idx)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                      estActive
                        ? "bg-dash-accent/15 text-dash-dark"
                        : "text-dash-text hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          estActive
                            ? "bg-dash-accent text-dash-dark"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon size={16} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-dash-dark">
                          {item.titre}
                        </p>
                        <p className="text-[11px] text-dash-text-secondary truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        {item.badge}
                      </span>
                      <ArrowRight
                        size={14}
                        className={`transition ${
                          estActive ? "opacity-100 text-dash-dark" : "opacity-0"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pied de page du menu Cmd+K */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-4 py-2 text-[11px] text-dash-text-secondary">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600 shadow-2xs">
                ↑↓
              </kbd>{" "}
              Naviguer
            </span>
            <span>
              <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600 shadow-2xs">
                ↵
              </kbd>{" "}
              Sélectionner
            </span>
          </div>
          <span>
            <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600 shadow-2xs">
              ESC
            </kbd>{" "}
            Fermer
          </span>
        </div>
      </div>
    </div>
  );
}
