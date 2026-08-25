import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Utilise cette fonction dans les Server Components, Server Actions et Route Handlers.
// Ne jamais réutiliser la même instance entre plusieurs requêtes (toujours en recréer une).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll peut être appelé depuis un Server Component (lecture seule) —
            // sans souci si tu as un middleware qui rafraîchit les sessions.
          }
        },
      },
    }
  );
}
