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
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
        isActive
          ? "border-r-2 border-dash-accent bg-dash-dark font-bold text-dash-accent"
          : "font-normal text-dash-muted hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {!!badge && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-dash-accent px-1.5 text-[11px] font-bold text-dash-dark">
          {badge}
        </span>
      )}
    </Link>
  );
}
