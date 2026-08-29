"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function MobileDrawer({
  children,
  logoLabel = "PlanClic",
}: {
  children: React.ReactNode;
  logoLabel?: string;
}) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-dash-sidebar px-5 py-3 lg:hidden">
        <Link
          href="/"
          className="font-[family-name:var(--font-jakarta)] text-lg font-bold text-white"
        >
          {logoLabel}
        </Link>
        <button
          onClick={() => setOuvert(true)}
          className="text-white/80 hover:text-white"
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} strokeWidth={2} />
        </button>
      </div>

      {ouvert && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOuvert(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-dash-sidebar px-6 py-6 shadow-xl">
            <button
              onClick={() => setOuvert(false)}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
              aria-label="Fermer le menu"
            >
              <X size={20} strokeWidth={2} />
            </button>
            <div onClick={() => setOuvert(false)}>{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
