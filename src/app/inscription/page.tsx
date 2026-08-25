"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, Building2 } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { inscrire } from "@/app/actions/auth";

type Role = "client" | "proprietaire";

const ROLES: {
  key: Role;
  icon: typeof Car;
  titre: string;
  description: string;
}[] = [
  {
    key: "client",
    icon: Car,
    titre: "Je veux louer un véhicule",
    description: "Trouvez et réservez voitures, motos et utilitaires en quelques clics.",
  },
  {
    key: "proprietaire",
    icon: Building2,
    titre: "J'ai une agence de location",
    description: "Publiez vos véhicules et gérez vos réservations facilement.",
  },
];

export default function InscriptionPage() {
  const [role, setRole] = useState<Role | null>(null);

  return (
    <AuthLayout
      title="Rejoignez PlanClic"
      subtitle="Louez ou proposez des véhicules partout au Maroc, en toute confiance."
    >
      <h1 className="mb-1 text-2xl font-bold text-brand-dark">Créer un compte</h1>
      <p className="mb-6 text-sm text-[#6a6a6a]">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-brand-dark underline">
          Se connecter
        </Link>
      </p>

      {!role ? (
        <div className="space-y-3">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              className="group flex w-full items-start gap-4 rounded-2xl border border-[#e2e2e2] p-4 text-left transition-all duration-200 hover:border-brand-dark hover:shadow-sm active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light/40 text-brand-dark transition-colors duration-200 group-hover:bg-brand-dark group-hover:text-white">
                <r.icon size={18} strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-sm font-bold text-brand-dark">
                  {r.titre}
                </span>
                <span className="mt-0.5 block text-xs text-[#6a6a6a]">
                  {r.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <form action={inscrire} className="space-y-4">
          <input type="hidden" name="role" value={role} />

          <button
            type="button"
            onClick={() => setRole(null)}
            className="mb-1 text-xs font-semibold text-[#6a6a6a] hover:text-brand-dark"
          >
            ← Changer de profil
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-brand-light/30 px-3 py-2 text-sm text-brand-dark">
            {(() => {
              const RoleIcon = ROLES.find((r) => r.key === role)?.icon;
              return RoleIcon ? <RoleIcon size={16} strokeWidth={1.75} /> : null;
            })()}
            <span className="font-semibold">
              {role === "client" ? "Compte client" : "Compte propriétaire"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-dark">
                Prénom
              </label>
              <input
                name="prenom"
                required
                className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-dark">
                Nom
              </label>
              <input
                name="nom"
                required
                className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Téléphone
            </label>
            <input
              name="telephone"
              required
              type="tel"
              placeholder="06 XX XX XX XX"
              className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="w-full rounded-full border border-[#b9b9b9] px-4 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-dark"
              placeholder="8 caractères minimum"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-brand-accent py-2.5 text-sm font-semibold text-brand-dark shadow transition hover:brightness-95"
          >
            {role === "proprietaire" ? "Continuer vers mon profil pro" : "Créer mon compte"}
          </button>

          {role === "proprietaire" && (
            <p className="text-center text-xs text-[#6a6a6a]">
              L&apos;étape suivante te demandera les informations de ton agence.
            </p>
          )}
        </form>
      )}
    </AuthLayout>
  );
}
