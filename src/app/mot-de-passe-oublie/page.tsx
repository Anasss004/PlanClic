import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { demanderReinitialisationMotDePasse } from "@/app/actions/auth";

export default async function MotDePasseOubliePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const sp = await searchParams;

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Pas de souci, ça arrive à tout le monde. On t'envoie un lien pour en choisir un nouveau."
    >
      <h1 className="mb-1 text-2xl font-bold text-brand-dark">
        Réinitialiser le mot de passe
      </h1>
      <p className="mb-6 text-sm text-[#6a6a6a]">
        <Link href="/connexion" className="font-semibold text-brand-dark underline">
          Retour à la connexion
        </Link>
      </p>

      {sp.message === "envoye" ? (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Si un compte existe avec cet email, un lien de réinitialisation vient
          de t&apos;être envoyé. Vérifie ta boîte mail (et les spams).
        </p>
      ) : (
        <form action={demanderReinitialisationMotDePasse} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
              placeholder="vous@exemple.com"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95"
          >
            Envoyer le lien de réinitialisation
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
