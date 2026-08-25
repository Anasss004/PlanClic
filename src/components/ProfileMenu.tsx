"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, ClipboardList, LayoutDashboard, LogOut } from "lucide-react";
import { seDeconnecter } from "@/app/actions/auth";

export default function ProfileMenu({
  prenom,
  nom,
  role,
}: {
  prenom: string;
  nom: string;
  role: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fermerSiExterieur(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, []);

  const initiales = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-3 transition hover:border-brand-dark/30"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-dark text-xs font-semibold text-white">
          {initiales || "?"}
        </span>
        <span className="text-sm font-medium text-brand-dark">{prenom}</span>
      </button>

      {ouvert && (
        <div className="absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-brand-dark">
              {prenom} {nom}
            </p>
          </div>

          {role === "proprietaire" ? (
            <Link
              href="/proprietaire/dashboard"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LayoutDashboard size={16} strokeWidth={1.75} />
              Mon espace propriétaire
            </Link>
          ) : role === "admin" || role === "support" ? (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LayoutDashboard size={16} strokeWidth={1.75} />
              Administration
            </Link>
          ) : (
            <>
              <Link
                href="/profil"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User size={16} strokeWidth={1.75} />
                Mon profil
              </Link>
              <Link
                href="/profil?onglet=reservations"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ClipboardList size={16} strokeWidth={1.75} />
                Mes réservations
              </Link>
            </>
          )}

          <form action={seDeconnecter}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-50"
            >
              <LogOut size={16} strokeWidth={1.75} />
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
