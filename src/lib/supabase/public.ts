import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Client Supabase "public", sans cookies ni session.
//
// Le client de lib/supabase/server.ts lit les cookies de la requête, ce qui
// le rend inutilisable à l'intérieur d'unstable_cache : une fonction mise en
// cache ne peut pas dépendre de la requête courante (Next lève une erreur si
// cookies() y est appelé, et ce serait de toute façon incorrect — le résultat
// mis en cache est partagé entre tous les visiteurs).
//
// Ce client s'authentifie avec la clé anon et ne porte aucune session. Il ne
// sert QUE pour les vues publiques déjà ouvertes à `anon` par la migration
// 09_grants_recherche_publique.sql : vehicules_recherche et
// proprietaires_public. Ces vues filtrent elles-mêmes ce qui doit rester
// privé (véhicules actifs d'agences vérifiées, immatriculation exclue), donc
// le résultat est identique à celui qu'obtenait le client authentifié.
// ============================================================

export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
