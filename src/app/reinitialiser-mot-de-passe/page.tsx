"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import { createClient } from "@/lib/supabase/client";

export default function ReinitialiserMotDePassePage() {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setEnCours(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCours(false);

    if (error) {
      setErreur("Le lien a peut-être expiré. Redemande une réinitialisation.");
      return;
    }

    router.push("/connexion?message=mot-de-passe-modifie");
  }

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Choisis un mot de passe solide pour protéger ton compte."
    >
      <h1 className="mb-6 text-2xl font-bold text-brand-dark">
        Définir un nouveau mot de passe
      </h1>

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{erreur}</p>
      )}

      <form onSubmit={soumettre} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-brand-dark">
            Nouveau mot de passe
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
            placeholder="8 caractères minimum"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-brand-dark">
            Confirmer le mot de passe
          </label>
          <input
            type="password"
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
          />
        </div>

        <button
          type="submit"
          disabled={enCours}
          className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95 disabled:opacity-60"
        >
          {enCours ? "Enregistrement..." : "Enregistrer le nouveau mot de passe"}
        </button>
      </form>
    </AuthLayout>
  );
}
