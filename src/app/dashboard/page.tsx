import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  // Grâce à RLS, cette requête ne peut retourner QUE le profil de
  // l'utilisateur connecté — c'est le comportement attendu, pas un bug.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Mon compte</h1>
      {profile ? (
        <div className="space-y-2">
          <p>Nom : {profile.prenom} {profile.nom}</p>
          <p>Email : {profile.email}</p>
          <p>Rôle : {profile.role}</p>
        </div>
      ) : (
        <p className="text-red-600">
          Profil introuvable — vérifie que le trigger handle_new_user()
          a bien été exécuté (fichier 06_auth_trigger.sql).
        </p>
      )}

      <form action={seDeconnecter} className="mt-6">
        <button type="submit" className="underline text-sm">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
