"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, MapPin } from "lucide-react";

/**
 * Menu de navigation mobile du site public.
 *
 * Complète la <nav className="hidden ... md:flex"> du Header, qui laissait les
 * liens totalement inaccessibles sous 768px. Le composant est neutralisé sur
 * desktop par une base `hidden` + un override `max-md:`, donc il n'ajoute
 * aucun pixel au rendu >= 768px (et a fortiori >= 1024px).
 */
export default function MenuMobilePublic({
  liens,
  connecte,
}: {
  liens: { label: string; href: string }[];
  connecte: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);

  // Empêche le scroll de l'arrière-plan pendant que le tiroir est ouvert.
  useEffect(() => {
    if (!ouvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [ouvert]);

  // Referme si l'écran repasse en desktop (le tiroir y est masqué de toute façon).
  useEffect(() => {
    if (!ouvert) return;
    function onResize() {
      if (window.innerWidth >= 768) setOuvert(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ouvert]);

  // Ferme sur Échap.
  useEffect(() => {
    if (!ouvert) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={ouvert}
        className="hidden h-10 w-10 items-center justify-center rounded-full text-brand-dark transition-colors hover:bg-brand-light/30 max-md:flex"
      >
        <Menu size={22} strokeWidth={2} />
      </button>

      {ouvert && (
        <div className="hidden max-md:block">
          <div
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={() => setOuvert(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[70] flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white px-6 py-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-[family-name:var(--font-bagel)] text-[22px] text-brand-dark">
                PlanClic
              </span>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer le menu"
                className="flex h-10 w-10 items-center justify-center rounded-full text-brand-dark/60 transition-colors hover:bg-brand-light/30 hover:text-brand-dark"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {liens.map((lien) => (
                <Link
                  key={lien.href}
                  href={lien.href}
                  onClick={() => setOuvert(false)}
                  className="rounded-xl px-4 py-3 text-[15px] font-semibold text-brand-dark transition-colors hover:bg-brand-light/30"
                >
                  {lien.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              className="mt-1 flex items-center gap-2.5 rounded-xl px-4 py-3 text-[15px] font-semibold text-brand-dark transition-colors hover:bg-brand-light/30"
            >
              <MapPin size={18} strokeWidth={1.75} />
              Localisation
            </button>

            {!connecte && (
              <div className="mt-auto flex flex-col gap-2 border-t border-brand-light/60 pt-5">
                <Link
                  href="/connexion"
                  onClick={() => setOuvert(false)}
                  className="rounded-full bg-brand-accent px-5 py-3 text-center text-sm font-semibold text-brand-dark transition-all hover:brightness-95"
                >
                  Se connecter
                </Link>
                <Link
                  href="/inscription"
                  onClick={() => setOuvert(false)}
                  className="rounded-full border border-brand-dark/20 px-5 py-3 text-center text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-light/30"
                >
                  Créer un compte
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
