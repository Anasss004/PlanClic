import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Car,
  KeyRound,
  LogOut,
  Package,
  CreditCard,
  Sparkles,
  Megaphone,
  SlidersHorizontal,
  FileSpreadsheet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "@/app/actions/auth";
import NavLink from "@/components/proprietaire/NavLink";
import MobileDrawer from "@/components/proprietaire/MobileDrawer";
import RechercheGlobale from "@/components/admin/RechercheGlobale";

const NAV = [
  { href: "/admin/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/verifications", label: "Vérifications", icon: ShieldCheck },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/vehicules", label: "Véhicules", icon: Car },
  { href: "/admin/creer-espace", label: "Créer un espace", icon: Sparkles },
  { href: "/admin/plans", label: "Plans", icon: Package },
  { href: "/admin/abonnements", label: "Abonnements", icon: CreditCard },
  { href: "/admin/annonces", label: "Annonces", icon: Megaphone },
  { href: "/admin/exports", label: "Exports", icon: FileSpreadsheet },
  { href: "/admin/roles", label: "Rôles", icon: KeyRound, adminOnly: true },
  {
    href: "/admin/parametres-plateforme",
    label: "Paramètres plateforme",
    icon: SlidersHorizontal,
    adminOnly: true,
  },
];

export default async function AdminLayout({
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

  if (!profile || !["support", "admin"].includes(profile.role)) {
    redirect("/");
  }

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
            <p className="text-sm text-dash-muted opacity-80">Admin Panel</p>
          </div>
        </div>

        <RechercheGlobale />

        <nav className="space-y-2">
          {NAV.map((item) => {
            if (item.adminOnly && profile.role !== "admin") {
              return null;
            }
            return (
              <NavLink
                key={item.href}
                href={item.href}
                icon={<item.icon size={18} strokeWidth={1.75} />}
              >
                {item.label}
              </NavLink>
            );
          })}
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
            <p className="truncate text-xs capitalize text-dash-muted">{profile.role}</p>
          </div>
        </div>
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between bg-dash-sidebar px-8 py-8 lg:flex">
        {contenuSidebar}
      </aside>

      <MobileDrawer>
        <div className="flex min-h-full flex-col justify-between">{contenuSidebar}</div>
      </MobileDrawer>

      <div className="flex-1 lg:pl-64">
        <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
