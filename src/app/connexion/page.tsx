import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import { seConnecter } from "@/app/actions/auth";

const ERREURS: Record<string, string> = {
  "identifiants-invalides": "Email ou mot de passe incorrect.",
  "email-non-confirme": "Confirme ton adresse email avant de te connecter (vérifie ta boîte mail).",
  "trop-de-tentatives": "Trop de tentatives. Réessaie dans quelques minutes.",
};

const MESSAGES: Record<string, string> = {
  "verifiez-votre-email": "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.",
  "mot-de-passe-modifie": "Mot de passe modifié avec succès. Connecte-toi avec ton nouveau mot de passe.",
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; message?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const erreur = params.erreur ? ERREURS[params.erreur] : null;
  const message = params.message ? MESSAGES[params.message] : null;

  return (
    <AuthLayout
      title="Heureux de vous revoir"
      subtitle="Retrouvez vos réservations et gérez vos locations en un clic."
    >
      <h1 className="mb-1 text-2xl font-bold text-brand-dark">Connexion</h1>
      <p className="mb-6 text-sm text-[#6a6a6a]">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-brand-dark underline">
          Créer un compte
        </Link>
      </p>

      {message && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          {message}
        </p>
      )}
      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {erreur}
        </p>
      )}

      <form action={seConnecter} className="space-y-4">
        {params.redirect && (
          <input type="hidden" name="redirect" value={params.redirect} />
        )}
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

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-semibold text-brand-dark">
              Mot de passe
            </label>
            <Link href="/mot-de-passe-oublie" className="text-xs text-[#6a6a6a] hover:underline">
              Oublié ?
            </Link>
          </div>
          <input
            type="password"
            name="password"
            required
            className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95"
        >
          Se connecter
        </button>
      </form>
    </AuthLayout>
  );
}
