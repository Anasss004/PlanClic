"use client";

import { Search, Bell } from "lucide-react";
import Link from "next/link";

interface HeaderProprietaireProps {
  nomAgence?: string | null;
  badgeNotifs?: number;
}

export default function HeaderProprietaire({
  nomAgence,
  badgeNotifs = 0,
}: HeaderProprietaireProps) {
  const ouvrirCmdK = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <header className="glass-header sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 px-6 lg:px-10">
      {/* Barre de recherche Cmd+K */}
      <button
        type="button"
        onClick={ouvrirCmdK}
        className="group flex items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-2 text-xs font-medium text-dash-text-secondary transition-all hover:border-dash-accent hover:bg-white hover:shadow-xs sm:w-80"
      >
        <Search size={15} className="text-dash-muted transition-colors group-hover:text-dash-dark" />
        <span className="truncate">Rechercher (véhicule, client, action)...</span>
        <kbd className="ml-auto hidden rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 shadow-2xs sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Agence Info & Notifications */}
      <div className="flex items-center gap-4">
        {nomAgence && (
          <div className="hidden items-center gap-2 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-dash-dark">
              {nomAgence}
            </span>
          </div>
        )}

        <Link
          href="/proprietaire/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-dash-dark"
          aria-label="Notifications"
        >
          <Bell size={17} strokeWidth={1.75} />
          {badgeNotifs > 0 && (
            <span className="pulse-badge absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white shadow-xs">
              {badgeNotifs > 99 ? "99+" : badgeNotifs}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
