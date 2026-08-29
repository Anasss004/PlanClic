import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ⚠️ Ce module ne doit JAMAIS être importé depuis un composant client.
// Il n'est référencé que par des Server Actions ("use server") et des
// Server Components de l'espace /admin. La clé service_role n'étant pas
// préfixée NEXT_PUBLIC_, un import client provoquerait de toute façon
// une erreur de build (variable absente côté navigateur).

// ============================================================
// Client Supabase "service_role" — accès TOTAL à la base, contourne
// le RLS. À N'UTILISER QUE côté serveur, dans des Server Actions déjà
// protégées par une vérification de rôle (voir src/lib/admin/auth.ts),
// et UNIQUEMENT pour les opérations impossibles autrement :
//   * création d'un utilisateur Auth (auth.admin.createUser) ;
//   * génération d'un lien de définition de mot de passe.
//
// Toute écriture métier (proprietaires, vehicules, abonnements...)
// doit continuer à passer par une fonction SECURITY DEFINER qui
// revérifie le rôle — jamais par ce client.
//
// La clé vient de SUPABASE_SERVICE_ROLE_KEY (jamais préfixée NEXT_PUBLIC_,
// donc jamais envoyée au navigateur).
// ============================================================

export class ServiceRoleIndisponibleError extends Error {
  constructor() {
    super(
      "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée. Cette fonctionnalité " +
        "(création de compte par l'admin) nécessite d'ajouter la clé service_role " +
        "dans .env.local — voir .env.local.example."
    );
    this.name = "ServiceRoleIndisponibleError";
  }
}

export function serviceRoleDisponible(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new ServiceRoleIndisponibleError();
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
