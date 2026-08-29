import Link from "next/link";

const SOCIALS = ["Instagram", "Facebook", "X", "TikTok", "LinkedIn"];

export default function Footer() {
  return (
    <footer className="mt-16 bg-brand-light/50">
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="mb-4 w-fit rounded-xl bg-brand-accent px-4 py-2 font-[family-name:var(--font-bagel)] text-2xl text-brand-dark">
              PlanClic
            </p>
            <div className="flex gap-3">
              {SOCIALS.map((s) => (
                <span
                  key={s}
                  className="cursor-pointer text-sm text-brand-dark transition-opacity duration-200 hover:opacity-60"
                  aria-label={s}
                >
                  ●
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-brand-dark">
              Navigation Rapide
            </p>
            <ul className="space-y-1 text-sm text-brand-dark">
              <li className="w-fit cursor-pointer transition-colors hover:text-brand-dark/70">Louer une voiture</li>
              <li className="w-fit cursor-pointer transition-colors hover:text-brand-dark/70">Louer une moto</li>
              <li className="w-fit cursor-pointer transition-colors hover:text-brand-dark/70">Blog</li>
              <li className="w-fit cursor-pointer transition-colors hover:text-brand-dark/70">Autres</li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-brand-dark">
              Besoin d&apos;aide ?
            </p>
            <ul className="space-y-1 text-sm text-brand-dark">
              <li className="w-fit cursor-pointer transition-colors hover:text-brand-dark/70">Contactez-nous</li>
              <li className="w-fit cursor-pointer transition-colors hover:text-brand-dark/70">FAQ</li>
              <li>
                <Link href="/cgu" className="transition-colors hover:text-brand-dark/70">
                  Conditions Générales d&apos;Utilisation
                </Link>
              </li>
              <li>
                <Link href="/politique-confidentialite" className="transition-colors hover:text-brand-dark/70">
                  Politique de Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="transition-colors hover:text-brand-dark/70">
                  Mentions Légales
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-bold text-brand-dark">
              Pourquoi Choisir PlanClic ?
            </p>
            <p className="mb-1 text-sm font-semibold text-brand-dark">
              Pour les propriétaires
            </p>
            <ul className="mb-3 list-disc pl-4 text-sm text-brand-dark">
              <li>Gestion simplifiée</li>
              <li>Rentabilité optimisée</li>
              <li>Alertes intelligentes</li>
              <li>Tableau de bord complet</li>
            </ul>
            <p className="mb-1 text-sm font-semibold text-brand-dark">
              Pour les locataires
            </p>
            <ul className="list-disc pl-4 text-sm text-brand-dark">
              <li>Choix transparent</li>
              <li>Communication directe</li>
              <li>Confiance et sécurité</li>
              <li>Réservation simplifiée</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Link
            href="/inscription"
            className="rounded-full bg-brand-dark px-6 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-125 active:scale-95"
          >
            S&apos;inscrire
          </Link>
          <Link
            href="/connexion"
            className="rounded-full bg-brand-accent px-6 py-1.5 text-sm font-semibold text-brand-dark transition-all duration-200 hover:brightness-95 active:scale-95"
          >
            Se connecter
          </Link>
        </div>
      </div>

      <div className="bg-brand-dark py-3 text-center text-sm text-white">
        © 2026 PlanClic. Tous droits réservés. |{" "}
        <Link href="/cgu" className="hover:underline">Conditions Générales</Link> |{" "}
        <Link href="/politique-confidentialite" className="hover:underline">Politique de Confidentialité</Link>
      </div>
    </footer>
  );
}
