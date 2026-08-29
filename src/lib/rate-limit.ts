import "server-only";

// ⚠️ LIMITE IMPORTANTE À CONNAÎTRE :
// Ce limiteur est en mémoire (Map), donc réinitialisé à chaque
// redéploiement et NON partagé entre plusieurs instances serverless
// Vercel — sur un vrai pic de trafic, chaque instance a son propre
// compteur. C'est une protection "mieux que rien" contre un abus
// basique en développement/petite échelle, PAS une protection anti-
// brute-force robuste en production.
//
// Pour une vraie protection en production, remplacer par Upstash
// Redis + @upstash/ratelimit (recommandé par Vercel), ou activer le
// rate limiting natif de Supabase Auth (Dashboard > Authentication >
// Rate Limits) qui, lui, est déjà actif côté serveur Supabase et ne
// dépend pas de ce fichier.

const tentatives = new Map<string, { compte: number; expiration: number }>();

export function limiterDebit(
  cle: string,
  maxTentatives: number,
  fenetreMs: number
): { autorise: boolean; attenteMs?: number } {
  const maintenant = Date.now();
  const entree = tentatives.get(cle);

  if (!entree || entree.expiration < maintenant) {
    tentatives.set(cle, { compte: 1, expiration: maintenant + fenetreMs });
    return { autorise: true };
  }

  if (entree.compte >= maxTentatives) {
    return { autorise: false, attenteMs: entree.expiration - maintenant };
  }

  entree.compte += 1;
  return { autorise: true };
}
