"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ============================================================
// Panneau de menu rendu dans un portail, positionné par rapport à un
// élément déclencheur.
//
// POURQUOI UN PORTAIL
// Un panneau en `position: absolute` est rogné par le premier ancêtre dont
// l'overflow n'est pas `visible`, quel que soit son z-index. Les cartes de
// réservation portent `overflow-hidden` (nécessaire à leurs coins arrondis),
// ce qui tronquait les menus déroulants qu'elles contiennent.
//
// Un portail sort le panneau de la hiérarchie DOM de la carte : plus aucun
// ancêtre ne peut le rogner. Cela règle du même coup l'empilement — la classe
// .card-lift applique un `transform` au survol, ce qui crée un contexte
// d'empilement et enfermait le z-index du panneau à l'intérieur de la carte,
// donc potentiellement sous la carte suivante.
//
// C'est le même mécanisme que celui déjà utilisé par ui/DatePicker.
// ============================================================

export default function PanneauFlottant({
  ouvert,
  ancreRef,
  onFermer,
  className = "",
  placement = "haut",
  alignement = "droite",
  children,
}: {
  ouvert: boolean;
  ancreRef: React.RefObject<HTMLElement | null>;
  onFermer: () => void;
  className?: string;
  /** Côté d'ouverture privilégié. Bascule automatiquement s'il manque la
   *  place, pour que le panneau reste toujours entièrement visible. */
  placement?: "haut" | "bas";
  /** Bord aligné sur le déclencheur. "etire" fait correspondre la largeur du
   *  panneau à celle du déclencheur (cas d'un champ de formulaire). */
  alignement?: "droite" | "gauche" | "etire";
  children: React.ReactNode;
}) {
  const panneauRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    largeur?: number;
  } | null>(null);

  // Le panneau est d'abord rendu invisible, mesuré, puis positionné. En
  // useLayoutEffect, cela se produit avant la peinture : aucun scintillement.
  useLayoutEffect(() => {
    // Pas de réinitialisation à la fermeture : le panneau est démonté, et à la
    // réouverture cet effet recalcule la position avant la peinture. Une
    // position périmée n'est donc jamais affichée.
    if (!ouvert) return;
    const ancre = ancreRef.current;
    const panneau = panneauRef.current;
    if (!ancre || !panneau) return;

    const a = ancre.getBoundingClientRect();
    const p = panneau.getBoundingClientRect();

    const largeur = alignement === "etire" ? a.width : p.width;

    // Bord aligné sur le déclencheur, puis borné pour ne jamais sortir de
    // l'écran (utile en mobile).
    const brut = alignement === "droite" ? a.right - largeur : a.left;
    const left = Math.max(
      8,
      Math.min(brut, window.innerWidth - largeur - 8)
    );

    // On respecte le placement demandé tant qu'il y a la place, et on bascule
    // de l'autre côté sinon — le panneau reste ainsi toujours entièrement
    // visible.
    const placeAuDessus = a.top - 6 - p.height >= 8;
    const placeEnDessous = a.bottom + 6 + p.height <= window.innerHeight - 8;
    const versLeHaut =
      placement === "haut" ? placeAuDessus || !placeEnDessous : !placeEnDessous && placeAuDessus;

    setPosition({
      left,
      largeur: alignement === "etire" ? a.width : undefined,
      ...(versLeHaut
        ? { bottom: window.innerHeight - a.top + 6 }
        : { top: a.bottom + 6 }),
    });
  }, [ouvert, ancreRef, placement, alignement]);

  // Fermeture au clic extérieur. Le panneau vivant désormais hors de la
  // hiérarchie du déclencheur, il faut tester les deux éléments — sans quoi
  // un clic sur une entrée du menu serait considéré comme extérieur et
  // démonterait le panneau avant que l'action ne se déclenche.
  useEffect(() => {
    if (!ouvert) return;
    function auClic(e: MouseEvent) {
      const cible = e.target as Node;
      if (
        !ancreRef.current?.contains(cible) &&
        !panneauRef.current?.contains(cible)
      ) {
        onFermer();
      }
    }
    document.addEventListener("mousedown", auClic);
    return () => document.removeEventListener("mousedown", auClic);
  }, [ouvert, ancreRef, onFermer]);

  // Position fixe : elle ne suit pas le défilement. On ferme, comme le fait
  // déjà DatePicker, plutôt que de recalculer en continu.
  useEffect(() => {
    if (!ouvert) return;
    const fermer = () => onFermer();
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("scroll", fermer, true);
    window.addEventListener("resize", fermer);
    window.addEventListener("keydown", auClavier);
    return () => {
      window.removeEventListener("scroll", fermer, true);
      window.removeEventListener("resize", fermer);
      window.removeEventListener("keydown", auClavier);
    };
  }, [ouvert, onFermer]);

  if (!ouvert || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panneauRef}
      style={{
        position: "fixed",
        left: position?.left ?? 0,
        top: position?.top,
        bottom: position?.bottom,
        width: position?.largeur,
        visibility: position ? "visible" : "hidden",
      }}
      className={`z-50 ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}
