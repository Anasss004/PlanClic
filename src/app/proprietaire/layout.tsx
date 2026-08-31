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
  FilePlus2,
  LifeBuoy,
  CalendarRange,
  BarChart3,
  Settings,
  Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "@/app/actions/auth";
import { getImpersonation } from "@/lib/impersonation";
import NavLink from "@/components/proprietaire/NavLink";
import MobileDrawer from "@/components/proprietaire/MobileDrawer";
import BanniereImpersonation from "@/components/proprietaire/BanniereImpersonation";

const NAV = [
  { href: "/proprietaire/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/proprietaire/vehicules", label: "Ma Flotte", icon: Car },
  { href: "/proprietaire/reservations", label: "Réservations", icon: ClipboardList },
  { href: "/proprietaire/calendrier", label: "Calendrier", icon: CalendarRange },
  { href: "/proprietaire/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/proprietaire/amendes", label: "Amendes", icon: TriangleAlert },
  { href: "/proprietaire/notifications", label: "Notifications", icon: Bell },
  { href: "/proprietaire/parametres", label: "Paramètres", icon: Settings },
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

  if (!profile) redirect("/connexion");

  const impersonation = await getImpersonation();

  if (!impersonation && profile.role !== "proprietaire") {
    redirect("/dashboard");
  }

  const proprietaireId = impersonation ? impersonation.proprietaireId : user.id;

  const { data: proprietaire } = await supabase
    .from("proprietaires")
    .select("statut_verification, nom_entreprise")
    .eq("id", proprietaireId)
    .single();

  if (!proprietaire) {
    redirect(impersonation ? "/admin/dashboard" : "/inscription/infos-professionnelles");
  }

  const { count: nbEnAttente } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("proprietaire_id", proprietaireId)
    .eq("statut", "en_attente");

  const { count: nbNotifsNonLues } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("destinataire_id", proprietaireId)
    .is("lu_le", null);

  const verifie = proprietaire.statut_verification === "verifie";
  const initiales = `${profile.prenom?.[0] ?? ""}${profile.nom?.[0] ?? ""}`.toUpperCase();

  const contenuSidebar = (
    <>
      <div>
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-dash-accent text-lg font-bold text-dash-text">
            PC
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-white">PlanClic</p>
            <p className="text-sm text-dash-muted opacity-80">Espace Propriétaire</p>
          </div>
        </div>

        {/* Action principale : enregistrer une location reçue hors ligne.
            C'est le flux le plus utilisé pendant la phase de gestion interne. */}
        <div className="mb-8 space-y-2">
          <Link
            href="/proprietaire/bloquer"
            className="flex items-center justify-center gap-2 rounded-lg bg-dash-accent px-4 py-3.5 text-[15px] font-bold text-dash-text shadow-md transition hover:brightness-95"
          >
            <FilePlus2 size={18} strokeWidth={2.5} />
            Nouvelle location
          </Link>

          {verifie ? (
            <Link
              href="/proprietaire/vehicules/nouveau"
              className="flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-dash-muted transition hover:bg-white/5 hover:text-white"
            >
              <Plus size={14} strokeWidth={2.5} />
              Ajouter un véhicule
            </Link>
          ) : (
            <div
              title="Disponible une fois votre compte vérifié"
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/30"
            >
              <Plus size={14} strokeWidth={2.5} />
              Ajouter un véhicule
            </div>
          )}
        </div>

        <nav className="space-y-2">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={<item.icon size={18} strokeWidth={1.75} />}
              badge={
                item.href === "/proprietaire/reservations"
                  ? nbEnAttente ?? 0
                  : item.href === "/proprietaire/notifications"
                  ? nbNotifsNonLues ?? 0
                  : undefined
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-8 lg:mt-0">
        <div className="mb-2 flex items-center gap-3 border-t border-dash-dark pt-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {initiales || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {profile.prenom} {profile.nom}
            </p>
            <p className="truncate text-xs text-dash-muted">{proprietaire.nom_entreprise}</p>
          </div>
        </div>
        <Link
          href="#"
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-dash-muted transition hover:bg-white/5"
        >
          <LifeBuoy size={18} strokeWidth={1.75} />
          Support
        </Link>
        <form action={seDeconnecter}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm text-dash-muted transition hover:bg-white/5"
          >
            <LogOut size={18} strokeWidth={1.75} />
            Déconnexion
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#f4f5f6] font-[family-name:var(--font-jakarta)]">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between bg-dash-sidebar px-8 py-8 lg:flex">
        {contenuSidebar}
      </aside>

      {/* Barre + tiroir mobile */}
      <MobileDrawer>
        <div className="flex min-h-full flex-col justify-between">{contenuSidebar}</div>
      </MobileDrawer>

      {/* Contenu */}
      <div className="flex-1 lg:pl-64">
        {impersonation && (
          <BanniereImpersonation nomAgence={impersonation.nomAgence} />
        )}
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
