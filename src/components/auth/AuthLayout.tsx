import Link from "next/link";
import RoutePath from "./RoutePath";

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque — visible à partir de lg */}
      <div className="relative hidden overflow-hidden bg-brand-dark px-12 py-10 lg:flex lg:flex-col lg:justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-bagel)] text-2xl text-white"
        >
          PlanClic
        </Link>

        <div className="relative z-10 max-w-sm">
          <p className="font-[family-name:var(--font-bagel)] text-4xl leading-tight text-white">
            {title}
          </p>
          <p className="mt-4 text-white/70">{subtitle}</p>
        </div>

        <p className="relative z-10 text-sm text-white/50">
          Agences vérifiées · Réservation directe · Partout au Maroc
        </p>

        <RoutePath />
      </div>

      {/* Formulaire */}
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 block font-[family-name:var(--font-bagel)] text-2xl text-brand-dark lg:hidden"
          >
            PlanClic
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
