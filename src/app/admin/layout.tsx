import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Car,
  KeyRound,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "@/app/actions/auth";
import NavLink from "@/components/proprietaire/NavLink";

const NAV = [
  { href: "/admin/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/verifications", label: "Vérifications", icon: ShieldCheck },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/vehicules", label: "Véhicules", icon: Car },
  { href: "/admin/roles", label: "Rôles", icon: KeyRound },
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

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-dark lg:flex">
        <div className="px-5 pt-6 pb-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-bagel)] text-xl text-white"
          >
            PlanClic
          </Link>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-white/40">
            Administration
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((item) => {
            if (item.href === "/admin/roles" && profile.role !== "admin") {
              return null;
            }
            return (
              <NavLink
                key={item.href}
                href={item.href}
                icon={<item.icon size={17} strokeWidth={1.75} />}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              {initiales || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {profile.prenom} {profile.nom}
              </p>
              <p className="truncate text-xs text-white/50 capitalize">
                {profile.role}
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

      <div className="flex-1 lg:pl-64">
        <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
