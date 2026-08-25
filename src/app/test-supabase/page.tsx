import { createClient } from "@/lib/supabase/server";

export default async function TestSupabasePage() {
  const supabase = await createClient();

  // Cette requête va échouer proprement (table inexistante) tant que tu n'as
  // pas créé de tables — c'est normal. Ce test vérifie juste que la CONNEXION
  // à Supabase fonctionne (pas d'erreur de clé API / URL).
  const { error } = await supabase.from("_test_connection").select("*").limit(1);

  const isConnected =
    !error || error.code === "42P01" || error.code === "PGRST205"; // "table does not exist" = connexion OK

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Test de connexion Supabase</h1>
      {isConnected ? (
        <p className="text-green-600">
          ✅ Connexion réussie ! Tes clés Supabase sont valides.
        </p>
      ) : (
        <div className="text-red-600">
          <p>❌ Connexion échouée.</p>
          <p className="text-sm mt-2">Erreur : {error?.message}</p>
          <p className="text-sm mt-4 text-gray-600">
            Vérifie que ton fichier .env.local contient les bonnes valeurs
            NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        </div>
      )}
    </main>
  );
}
