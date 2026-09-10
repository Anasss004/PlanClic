"use client";

import dynamic from "next/dynamic";

// La palette de commandes est montée dans le layout, donc présente sur toutes
// les pages de l'espace propriétaire, alors qu'elle ne sert qu'après un ⌘K.
// Elle est ici chargée dans un chunk séparé, hors du bundle principal, et
// exclue du rendu serveur (elle n'affiche rien tant qu'elle est fermée).
//
// `ssr: false` n'est utilisable que depuis un Composant Client : ce fichier
// existe uniquement pour servir de frontière, le layout étant un Server
// Component.
//
// Le composant reste monté (fermé) plutôt que d'être monté au premier ⌘K :
// il possède lui-même les écouteurs clavier et l'écouteur de l'événement
// "open-command-palette" émis par le header. Les déplacer dans ce wrapper
// permettrait de différer aussi le téléchargement du chunk, au prix d'un
// dédoublement de la logique d'ouverture/fermeture — non fait ici pour ne
// pas toucher au comportement.
const CommandPalette = dynamic(
  () => import("@/components/proprietaire/CommandPalette"),
  { ssr: false }
);

export default function CommandPaletteLazy() {
  return <CommandPalette />;
}
