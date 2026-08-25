import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  ClipboardList,
  TriangleAlert,
  LogOut,
  Clock,
  ShieldAlert,
  Plus,
  Ban,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "@/app/actions/auth";
import NavLink from "@/components/proprietaire/NavLink";

const NAV = [
  { href: "/proprietaire/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/proprietaire/vehicules", label: "Mes véhicules", icon: Car },
  { href: "/proprietaire/reservations", label: "Réservations", icon: ClipboardList },
  { href: "/proprietaire/amendes", label: "Amendes", icon: TriangleAlert },
];

export default async function ProprietaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, prenom, nom")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "proprietaire") {
    redirect("/dashboard");
  }

  const { data: proprietaire } = await supabase
    .from("proprietaires")
    .select("statut_verification, nom_entreprise")
    .eq("id", user.id)
    .single();

  if (!proprietaire) {
    redirect("/inscription/infos-professionnelles");
  }

  const { count: nbEnAttente } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("proprietaire_id", user.id)
    .eq("statut", "en_attente");

  const verifie = proprietaire.statut_verification === "verifie";
  const initiales = `${profile.prenom?.[0] ?? ""}${profile.nom?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-dark lg:flex">
        <div className="px-5 pt-6 pb-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-bagel)] text-xl text-white"
          >
            PlanClic
          </Link>
        </div>

        <nav className="space-y-0.5 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={<item.icon size={17} strokeWidth={1.75} />}
              badge={item.href === "/proprietaire/reservations" ? nbEnAttente ?? 0 : undefined}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Raccourcis */}
        <div className="mt-6 px-3">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/35">
            Raccourcis
          </p>
          <div className="space-y-0.5">
            {verifie ? (
              <Link
                href="/proprietaire/vehicules/nouveau"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white"
              >
                <Plus size={17} strokeWidth={1.75} />
                Ajouter un véhicule
              </Link>
            ) : (
              <span
                title="Disponible une fois votre compte vérifié"
                className="flex cursor-not-allowed items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/25"
              >
                <Plus size={17} strokeWidth={1.75} />
                Ajouter un véhicule
              </span>
            )}
            <Link
              href="/proprietaire/bloquer"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white"
            >
              <Ban size={17} strokeWidth={1.75} />
              Bloquer un véhicule
            </Link>
          </div>
        </div>

        <div className="flex-1" />

        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              {initiales || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {profile.prenom} {profile.nom}
              </p>
              <p className="truncate text-xs text-white/50">
                {proprietaire.nom_entreprise}
              </p>
            </div>
          </div>
          <form action={seDeconnecter}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut size={16} strokeWidth={1.75} />
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      {/* Contenu */}
      <div className="flex-1 lg:pl-64">
        {proprietaire.statut_verification !== "verifie" && (
          <div
            className={`flex items-center gap-2.5 border-b px-6 py-2.5 text-sm ${
              proprietaire.statut_verification === "rejete"
                ? "border-rose-100 bg-rose-50/60 text-rose-700"
                : "border-amber-100 bg-amber-50/60 text-amber-800"
            }`}
          >
            {proprietaire.statut_verification === "rejete" ? (
              <ShieldAlert size={16} strokeWidth={1.75} className="shrink-0" />
            ) : (
              <Clock size={16} strokeWidth={1.75} className="shrink-0" />
            )}
            <span>
              {proprietaire.statut_verification === "rejete"
                ? "Votre compte n'a pas été validé. Contactez le support pour plus d'informations."
                : "Votre compte est en cours de vérification. L'ajout de véhicules sera disponible après validation."}
            </span>
          </div>
        )}
        <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
