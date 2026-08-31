// Ouverture d'un lien obtenu de façon asynchrone (URL signée, lien
// wa.me construit après un appel serveur…) sans déclencher le blocage
// de pop-up du navigateur.
//
// Safari — et Chrome dans certains cas — exigent que `window.open()`
// soit appelé de façon strictement synchrone dans le gestionnaire de
// clic pour être considéré comme une action utilisateur. Dès qu'un
// `await` le précède, l'ouverture est bloquée.
//
// Pattern à suivre partout :
//   1. `const f = window.open("", "_blank")` SYNCHRONE dans le onClick
//      (avant tout await / startTransition) ;
//   2. une fois l'URL prête : `redirigerFenetre(f, url)` ;
//   3. en cas d'erreur : `f?.close()` puis toast habituel.

export function redirigerFenetre(fenetre: Window | null, url: string): void {
  if (fenetre && !fenetre.closed) {
    // Évite le reverse-tabnabbing sur la fenêtre qu'on vient d'ouvrir.
    try {
      fenetre.opener = null;
    } catch {
      // certains navigateurs interdisent la réassignation de `opener`
    }
    fenetre.location.href = url;
    return;
  }
  // La fenêtre vide a été bloquée : dernière tentative d'ouverture directe.
  window.open(url, "_blank", "noopener,noreferrer");
}
