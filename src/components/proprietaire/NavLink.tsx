"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  icon,
  children,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        isActive
          ? "bg-white/10 text-white"
          : "text-white/65 hover:bg-white/5 hover:text-white"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-accent" />
      )}
      {icon}
      <span className="flex-1">{children}</span>
      {!!badge && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1.5 text-[11px] font-bold text-brand-dark">
          {badge}
        </span>
      )}
    </Link>
  );
}
