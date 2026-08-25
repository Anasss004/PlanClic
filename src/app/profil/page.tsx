import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProfilTabs from "@/components/client/ProfilTabs";

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; erreur?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/connexion");

  if (profile.role === "proprietaire") {
    redirect("/proprietaire/dashboard");
  }

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, date_debut, date_fin, statut, prix_total, vehicules(marque, modele), proprietaires(nom_entreprise)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const { data: documents } = await supabase
    .from("documents")
    .select("id, type_document, statut, created_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Mon profil
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos informations, vos réservations et vos documents.
          </p>
        </div>

        <ProfilTabs
          profile={profile}
          reservations={reservations ?? []}
          documents={documents ?? []}
          ongletInitial={params.onglet}
          erreur={params.erreur}
          message={params.message}
        />
      </main>
      <Footer />
    </>
  );
}
