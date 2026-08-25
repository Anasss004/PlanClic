"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car,
  Bike,
  Truck,
  Calendar,
  Map as MapIcon,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import ProfileMenu from "@/components/ProfileMenu";
import { VILLES } from "@/lib/villes";

type Profile = { prenom: string; nom: string; role: string } | null;

const TYPES = [
  { key: "voiture", label: "Voiture", icon: Car },
  { key: "moto", label: "Moto", icon: Bike },
  { key: "utilitaire", label: "Utilitaire", icon: Truck },
];

export default function EnTeteRecherche({
  profile,
  ville,
  dateDebut,
  dateFin,
  type,
  transmission,
  carburant,
  passagersMin,
  prixMax,
}: {
  profile: Profile;
  ville?: string;
  dateDebut?: string;
  dateFin?: string;
  type?: string;
  transmission?: string;
  carburant?: string;
  passagersMin?: string;
  prixMax?: string;
}) {
  const router = useRouter();
  const [modification, setModification] = useState(false);
  const [villeEdit, setVilleEdit] = useState(ville ?? "");
  const [dateDebutEdit, setDateDebutEdit] = useState(dateDebut ?? "");
  const [dateFinEdit, setDateFinEdit] = useState(dateFin ?? "");

  function construireUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const valeurs: Record<string, string | undefined> = {
      type,
      ville: villeEdit,
      date_debut: dateDebutEdit,
      date_fin: dateFinEdit,
      transmission,
      carburant,
      passagers_min: passagersMin,
      prix_max: prixMax,
      ...overrides,
    };
    Object.entries(valeurs).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/recherche?${params.toString()}`;
  }

  function appliquerFiltre(cle: string, valeur: string) {
    router.push(construireUrl({ [cle]: valeur || undefined }));
  }

  function soumettreRecherche() {
    setModification(false);
    router.push(construireUrl({}));
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.3),0px_1px_3px_1px_rgba(0,0,0,0.15)]">
      {/* Ligne 1 — résumé de recherche */}
      <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-6 py-3">
        <Link
          href="/"
          className="shrink-0 font-[family-name:var(--font-bagel)] text-2xl text-brand-dark"
        >
          PlanClic
        </Link>

        {modification ? (
          <div className="flex flex-1 flex-wrap items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5">
            <select
              value={villeEdit}
              onChange={(e) => setVilleEdit(e.target.value)}
              className="rounded-full px-2 py-1 text-sm text-brand-dark outline-none"
            >
              <option value="">Ville</option>
              {VILLES.map((v) => (
                <option key={v.nom} value={v.nom}>
                  {v.nom}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateDebutEdit}
              onChange={(e) => setDateDebutEdit(e.target.value)}
              className="rounded-full px-2 py-1 text-sm text-brand-dark outline-none"
            />
            <input
              type="date"
              value={dateFinEdit}
              onChange={(e) => setDateFinEdit(e.target.value)}
              className="rounded-full px-2 py-1 text-sm text-brand-dark outline-none"
            />
            <button
              onClick={soumettreRecherche}
              className="ml-auto rounded-full bg-brand-dark px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Rechercher
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-3 overflow-x-auto rounded-full border border-gray-200 px-4 py-2 text-sm text-brand-dark">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Car size={15} strokeWidth={1.75} />
              {ville || "Toutes les villes"}, Maroc
            </span>
            {dateDebut && (
              <span className="flex items-center gap-1.5 whitespace-nowrap border-l border-gray-200 pl-3">
                <Calendar size={15} strokeWidth={1.75} />
                {new Date(dateDebut).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
            {dateFin && (
              <span className="flex items-center gap-1.5 whitespace-nowrap border-l border-gray-200 pl-3">
                <Calendar size={15} strokeWidth={1.75} />
                {new Date(dateFin).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
            <button
              onClick={() => setModification(true)}
              className="ml-auto shrink-0 rounded-full bg-brand-dark px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Modifier
            </button>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-4">
          <MapIcon size={18} strokeWidth={1.75} className="hidden text-brand-dark sm:block" />
          {profile ? (
            <ProfileMenu prenom={profile.prenom} nom={profile.nom} role={profile.role} />
          ) : (
            <Link
              href="/connexion"
              className="rounded-full bg-brand-accent px-5 py-1.5 text-sm font-semibold text-brand-dark transition-all duration-200 hover:brightness-95 active:scale-95"
            >
              Se connecter
            </Link>
          )}
        </div>
      </div>

      {/* Ligne 2 — type de véhicule + filtres */}
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 overflow-x-auto px-6 pb-3">
        <div className="flex shrink-0 gap-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const actif = type === t.key || (!type && t.key === "voiture");
            return (
              <Link
                key={t.key}
                href={construireUrl({ type: t.key })}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  actif
                    ? "bg-brand-dark text-white"
                    : "bg-brand-light text-brand-dark hover:bg-brand-light/70"
                }`}
              >
                <Icon size={14} strokeWidth={2} />
                {t.label}
              </Link>
            );
          })}
        </div>

        <span className="hidden h-6 w-px shrink-0 bg-gray-200 sm:block" />

        <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white sm:flex">
          <SlidersHorizontal size={14} strokeWidth={2} />
        </div>

        <FiltreSelect label="Catégorie" options={[]} disabled placeholder="Bientôt disponible" />
        <FiltreSelect
          label="Passager·ères"
          value={passagersMin}
          onChange={(v) => appliquerFiltre("passagers_min", v)}
          options={[
            { value: "2", label: "2+" },
            { value: "4", label: "4+" },
            { value: "5", label: "5+" },
            { value: "7", label: "7+" },
          ]}
        />
        <FiltreSelect
          label="Transmission"
          value={transmission}
          onChange={(v) => appliquerFiltre("transmission", v)}
          options={[
            { value: "automatique", label: "Automatique" },
            { value: "manuelle", label: "Manuelle" },
          ]}
        />
        <FiltreSelect
          label="Carburant"
          value={carburant}
          onChange={(v) => appliquerFiltre("carburant", v)}
          options={[
            { value: "essence", label: "Essence" },
            { value: "diesel", label: "Diesel" },
            { value: "electrique", label: "Électrique" },
            { value: "hybride", label: "Hybride" },
          ]}
        />
        <FiltreSelect
          label="Prix max"
          value={prixMax}
          onChange={(v) => appliquerFiltre("prix_max", v)}
          options={[
            { value: "300", label: "300 MAD" },
            { value: "600", label: "600 MAD" },
            { value: "1000", label: "1000 MAD" },
            { value: "5000", label: "5000 MAD" },
          ]}
        />
      </div>
    </header>
  );
}

function FiltreSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        title={disabled ? placeholder : undefined}
        className={`appearance-none rounded-full border border-gray-200 py-1.5 pl-3 pr-8 text-sm font-medium outline-none transition-colors ${
          disabled
            ? "cursor-not-allowed text-gray-300"
            : "text-brand-dark hover:border-brand-dark/40"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        strokeWidth={2}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );
}
