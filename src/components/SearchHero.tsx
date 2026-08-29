"use client";

import { useEffect, useRef, useState } from "react";
import { Car, Bike, Truck, Loader2 } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import DatePicker from "@/components/ui/DatePicker";
import { VILLES } from "@/lib/villes";

const TYPES = [
  { key: "voiture", label: "Voiture", icon: Car },
  { key: "moto", label: "Moto", icon: Bike },
  { key: "utilitaire", label: "Utilitaire", icon: Truck },
] as const;

const INPUT_CLASS =
  "text-brand-dark outline-none transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(21,82,99,0.12)] rounded-full";

const AUJOURDHUI = new Date().toISOString().slice(0, 10);

export default function SearchHero() {
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("voiture");
  const [recherche, setRecherche] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Léger effet de profondeur (parallax) sur l'image de fond au scroll.
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    let ticking = false;

    function update() {
      if (!sectionRef.current || !bgRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const offset = rect.top * 0.08;
      bgRef.current.style.transform = `translate3d(0, ${offset}px, 0) scale(1.06)`;
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative mt-6 overflow-hidden rounded-2xl shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]"
    >
      <div
        ref={bgRef}
        className="absolute inset-0 -z-10 bg-cover bg-center will-change-transform"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4)), linear-gradient(90deg, rgba(21,82,99,0.2), rgba(21,82,99,0.2)), url('https://www.figma.com/api/mcp/asset/44c50f26-1ef9-4051-a76e-7eacfd2edf47.png')",
        }}
      />

      <div className="relative grid gap-8 p-8 md:grid-cols-2 md:p-12">
        {/* Carte de recherche */}
        <Reveal>
          <form
            method="GET"
            action="/recherche"
            onSubmit={() => setRecherche(true)}
            className="rounded-2xl bg-white/80 p-6 backdrop-blur"
          >
            <input type="hidden" name="type" value={type} />

            {/* Type de véhicule */}
            <div className="mb-4 flex gap-2">
              {TYPES.map((t) => {
                const Icon = t.icon;
                const actif = type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                      actif
                        ? "bg-brand-dark text-white"
                        : "bg-brand-light text-brand-dark hover:bg-brand-light/70"
                    }`}
                  >
                    <Icon size={15} strokeWidth={2} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Ville */}
            <label className="mb-1 block text-sm font-semibold text-brand-dark">
              Lieu de départ
            </label>
            <select
              name="ville"
              required
              defaultValue=""
              className={`mb-4 w-full border border-[#b9b9b9] px-4 py-2 text-sm focus:border-brand-dark ${INPUT_CLASS}`}
            >
              <option value="" disabled>
                Choisir une ville
              </option>
              {VILLES.map((v) => (
                <option key={v.nom} value={v.nom}>
                  {v.nom}
                </option>
              ))}
            </select>

            {/* Dates */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-dark">
                  Date de départ
                </label>
                <DatePicker name="date_debut" min={AUJOURDHUI} required theme="brand" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-dark">
                  Date de retour
                </label>
                <DatePicker name="date_fin" min={AUJOURDHUI} required theme="brand" />
              </div>
            </div>

            <button
              type="submit"
              disabled={recherche}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-accent py-2 text-sm font-semibold text-brand-dark transition-all duration-200 hover:brightness-95 active:scale-[0.98] disabled:cursor-default disabled:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/30"
            >
              {recherche ? (
                <>
                  <Loader2 size={15} className="animate-spin" strokeWidth={2.5} />
                  Recherche en cours...
                </>
              ) : (
                "Rechercher"
              )}
            </button>
          </form>
        </Reveal>

        {/* Texte accroche */}
        <Reveal delay={150} className="flex items-end justify-center md:justify-start">
          <p className="font-[family-name:var(--font-bagel)] text-3xl leading-tight text-white drop-shadow-lg md:text-[36px]">
            Louez <span className="text-brand-accent">|</span> la voiture qui
            vous correspond
          </p>
        </Reveal>
      </div>
    </section>
  );
}
