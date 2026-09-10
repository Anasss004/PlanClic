import Link from "next/link";
import { MapPin } from "lucide-react";
import { getUtilisateurEtProfil } from "@/lib/utilisateur";
import ProfileMenu from "@/components/ProfileMenu";
import HeaderShell from "@/components/HeaderShell";
import MenuMobilePublic from "@/components/MenuMobilePublic";

const NAV_LINKS = [
  { label: "News", href: "/news" },
  { label: "Avis", href: "/avis" },
  { label: "À propos", href: "/a-propos" },
  { label: "Contact", href: "/contact" },
];

export default async function Header() {
  const { profil } = await getUtilisateurEtProfil();
  const profile = profil
    ? { prenom: profil.prenom ?? "", nom: profil.nom ?? "", role: profil.role }
    : null;

  return (
    <HeaderShell>
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 max-sm:px-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-bagel)] text-[28px] text-brand-dark max-sm:text-[22px]"
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

        <div className="flex items-center gap-4 max-sm:gap-2">
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
              className="rounded-full bg-brand-accent px-5 py-1.5 text-sm font-semibold text-brand-dark transition-all duration-200 hover:brightness-95 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/30 max-sm:px-4"
            >
              Se connecter
            </Link>
          )}

          <MenuMobilePublic liens={NAV_LINKS} connecte={!!profile} />
        </div>
      </div>
    </HeaderShell>
  );
}
