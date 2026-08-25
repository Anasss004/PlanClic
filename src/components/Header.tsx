import Link from "next/link";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ProfileMenu from "@/components/ProfileMenu";
import HeaderShell from "@/components/HeaderShell";

const NAV_LINKS = [
  { label: "News", href: "/news" },
  { label: "Avis", href: "/avis" },
  { label: "À propos", href: "/a-propos" },
  { label: "Contact", href: "/contact" },
];

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { prenom: string; nom: string; role: string } | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("prenom, nom, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <HeaderShell>
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-bagel)] text-[28px] text-brand-dark"
        >
          PlanClic
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-underline rounded-full px-4 py-1.5 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-light/30"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Localisation"
            className="hidden rounded-full p-1.5 text-brand-dark transition-colors duration-200 hover:bg-brand-light/30 sm:block"
          >
            <MapPin size={18} strokeWidth={1.75} />
          </button>

          {profile ? (
            <ProfileMenu prenom={profile.prenom} nom={profile.nom} role={profile.role} />
          ) : (
            <Link
              href="/connexion"
              className="rounded-full bg-brand-accent px-5 py-1.5 text-sm font-semibold text-brand-dark transition-all duration-200 hover:brightness-95 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/30"
            >
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </HeaderShell>
  );
}
