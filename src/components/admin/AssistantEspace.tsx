"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  creerEspaceProprietaire,
  type RecapEspace,
} from "@/app/actions/admin-espaces";
import { useToast } from "@/components/ui/Toast";

type Plan = { id: string; nom: string; prix: number };

const ETAPES = ["Gérant", "Agence", "Plan", "Véhicule", "Récapitulatif"];

const champInput =
  "w-full rounded-lg border border-dash-border px-3 py-2 text-sm outline-none focus:border-dash-dark";
const label = "mb-1 block text-xs font-medium text-dash-text-secondary";

export default function AssistantEspace({
  plans,
  villes,
  categories,
  serviceRoleDispo,
}: {
  plans: Plan[];
  villes: string[];
  categories: string[];
  serviceRoleDispo: boolean;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [etape, setEtape] = useState(0);
  const [recap, setRecap] = useState<RecapEspace | null>(null);

  const [f, setF] = useState({
    email: "",
    prenom: "",
    nom: "",
    telephone: "",
    genre: "",
    nom_entreprise: "",
    specialite: "voitures_utilitaires",
    ville: villes[0] ?? "",
    adresse: "",
    registre_commerce: "",
    verifier: false,
    plan_id: "",
    ajouterVehicule: false,
    v_type: "voiture",
    v_marque: "",
    v_modele: "",
    v_immatriculation: "",
    v_prix_jour: "",
    v_ville: "",
    v_carburant: "",
    v_transmission: "",
    v_categorie: "",
  });

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function etapeValide(i: number): boolean {
    if (i === 0)
      return (
        f.email.includes("@") && f.prenom.trim() !== "" && f.nom.trim() !== ""
      );
    if (i === 1)
      return (
        f.nom_entreprise.trim() !== "" &&
        f.ville.trim() !== "" &&
        f.registre_commerce.trim() !== ""
      );
    return true;
  }

  function soumettre() {
    startTransition(async () => {
      try {
        const r = await creerEspaceProprietaire({
          email: f.email,
          prenom: f.prenom,
          nom: f.nom,
          telephone: f.telephone,
          genre: f.genre,
          nom_entreprise: f.nom_entreprise,
          specialite: f.specialite,
          ville: f.ville,
          adresse: f.adresse,
          registre_commerce: f.registre_commerce,
          verifier: f.verifier,
          plan_id: f.plan_id || undefined,
          vehicule:
            f.ajouterVehicule && f.v_marque.trim()
              ? {
                  type: f.v_type,
                  marque: f.v_marque,
                  modele: f.v_modele,
                  immatriculation: f.v_immatriculation,
                  prix_jour: f.v_prix_jour,
                  ville: f.v_ville || f.ville,
                  carburant: f.v_carburant,
                  transmission: f.v_transmission,
                  categorie: f.v_categorie,
                }
              : null,
        });
        setRecap(r);
        setEtape(4);
        toast.success("Espace créé.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Création impossible.");
      }
    });
  }

  function copier(texte: string) {
    navigator.clipboard.writeText(texte).then(
      () => toast.success("Copié."),
      () => toast.error("Copie impossible.")
    );
  }

  // -------------------------------------------------- Récap
  if (recap) {
    return (
      <div className="rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a6f4c5]">
            <Check size={18} strokeWidth={2.5} className="text-[#006c4a]" />
          </span>
          <h2 className="text-lg font-semibold text-dash-dark">Espace créé</h2>
        </div>

        <p className="mb-4 text-sm text-dash-text-secondary">
          Compte <strong>{recap.email}</strong> créé
          {recap.vehiculeCree ? " avec un premier véhicule." : "."} Transmettez
          les liens ci-dessous à l&apos;agence.
        </p>

        <div className="space-y-3">
          <LienCopiable
            titre="Lien de connexion"
            valeur={recap.lienConnexion}
            onCopier={copier}
          />
          {recap.lienMotDePasse ? (
            <LienCopiable
              titre="Lien de définition du mot de passe (valable une durée limitée)"
              valeur={recap.lienMotDePasse}
              onCopier={copier}
            />
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Aucun lien de mot de passe généré — l&apos;agence peut utiliser
              « Mot de passe oublié » sur la page de connexion.
            </p>
          )}
        </div>

        {recap.avertissements.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            {recap.avertissements.map((a, i) => (
              <li key={i} className="flex gap-1.5">
                <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex gap-3">
          <Link
            href={`/admin/agences/${recap.userId}`}
            className="rounded-lg bg-dash-sidebar px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Ouvrir la fiche agence
          </Link>
          <button
            onClick={() => {
              setRecap(null);
              setEtape(0);
              setF((p) => ({
                ...p,
                email: "",
                prenom: "",
                nom: "",
                telephone: "",
                nom_entreprise: "",
                registre_commerce: "",
                adresse: "",
                verifier: false,
                ajouterVehicule: false,
                v_marque: "",
                v_modele: "",
                v_immatriculation: "",
                v_prix_jour: "",
              }));
            }}
            className="rounded-lg border border-dash-border px-4 py-2.5 text-sm font-medium text-dash-text-secondary hover:bg-gray-50"
          >
            Créer un autre espace
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------- Assistant
  return (
    <div>
      {!serviceRoleDispo && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>SUPABASE_SERVICE_ROLE_KEY absente.</strong> La création de
            compte est désactivée tant que cette clé n&apos;est pas ajoutée dans{" "}
            <code>.env.local</code> (voir <code>.env.local.example</code>).
          </span>
        </div>
      )}

      {/* Fil d'étapes */}
      <div className="mb-6 flex items-center gap-2">
        {ETAPES.map((nom, i) => (
          <div key={nom} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                i === etape
                  ? "bg-dash-sidebar text-white"
                  : i < etape
                  ? "bg-[#a6f4c5] text-[#006c4a]"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < etape ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={`hidden text-xs sm:inline ${
                i === etape ? "font-semibold text-dash-dark" : "text-dash-text-secondary"
              }`}
            >
              {nom}
            </span>
            {i < ETAPES.length - 1 && (
              <ChevronRight size={14} className="text-gray-300" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dash-border bg-white p-6 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
        {etape === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Email *</label>
              <input
                type="email"
                value={f.email}
                onChange={(e) => set("email", e.target.value)}
                className={champInput}
              />
            </div>
            <div>
              <label className={label}>Prénom *</label>
              <input value={f.prenom} onChange={(e) => set("prenom", e.target.value)} className={champInput} />
            </div>
            <div>
              <label className={label}>Nom *</label>
              <input value={f.nom} onChange={(e) => set("nom", e.target.value)} className={champInput} />
            </div>
            <div>
              <label className={label}>Téléphone</label>
              <input value={f.telephone} onChange={(e) => set("telephone", e.target.value)} className={champInput} />
            </div>
            <div>
              <label className={label}>Genre</label>
              <select value={f.genre} onChange={(e) => set("genre", e.target.value)} className={champInput}>
                <option value="">—</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </select>
            </div>
          </div>
        )}

        {etape === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Nom de l&apos;agence *</label>
              <input value={f.nom_entreprise} onChange={(e) => set("nom_entreprise", e.target.value)} className={champInput} />
            </div>
            <div>
              <label className={label}>Spécialité *</label>
              <select value={f.specialite} onChange={(e) => set("specialite", e.target.value)} className={champInput}>
                <option value="voitures_utilitaires">Voitures / Utilitaires</option>
                <option value="motos">Motos</option>
              </select>
            </div>
            <div>
              <label className={label}>Ville *</label>
              <select value={f.ville} onChange={(e) => set("ville", e.target.value)} className={champInput}>
                {villes.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Adresse</label>
              <input value={f.adresse} onChange={(e) => set("adresse", e.target.value)} className={champInput} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Registre de commerce *</label>
              <input value={f.registre_commerce} onChange={(e) => set("registre_commerce", e.target.value)} className={champInput} />
            </div>
            <label className="flex items-center gap-2 text-sm text-dash-text sm:col-span-2">
              <input
                type="checkbox"
                checked={f.verifier}
                onChange={(e) => set("verifier", e.target.checked)}
                className="h-4 w-4 rounded border-dash-border"
              />
              Marquer le compte comme <strong>vérifié</strong> (documents déjà contrôlés hors ligne)
            </label>
          </div>
        )}

        {etape === 2 && (
          <div>
            <label className={label}>Plan attribué</label>
            <select value={f.plan_id} onChange={(e) => set("plan_id", e.target.value)} className={`${champInput} max-w-sm`}>
              <option value="">Basique (par défaut)</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} — {p.prix} MAD
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-dash-text-secondary">
              Sans choix, le plan Basique gratuit est attribué automatiquement.
            </p>
          </div>
        )}

        {etape === 3 && (
          <div>
            <label className="mb-4 flex items-center gap-2 text-sm text-dash-text">
              <input
                type="checkbox"
                checked={f.ajouterVehicule}
                onChange={(e) => set("ajouterVehicule", e.target.checked)}
                className="h-4 w-4 rounded border-dash-border"
              />
              Ajouter un premier véhicule maintenant (optionnel)
            </label>

            {f.ajouterVehicule && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Type</label>
                  <select value={f.v_type} onChange={(e) => set("v_type", e.target.value)} className={champInput}>
                    <option value="voiture">Voiture</option>
                    <option value="utilitaire">Utilitaire</option>
                    <option value="moto">Moto</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Catégorie</label>
                  <select value={f.v_categorie} onChange={(e) => set("v_categorie", e.target.value)} className={champInput}>
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Marque *</label>
                  <input value={f.v_marque} onChange={(e) => set("v_marque", e.target.value)} className={champInput} />
                </div>
                <div>
                  <label className={label}>Modèle *</label>
                  <input value={f.v_modele} onChange={(e) => set("v_modele", e.target.value)} className={champInput} />
                </div>
                <div>
                  <label className={label}>Immatriculation *</label>
                  <input value={f.v_immatriculation} onChange={(e) => set("v_immatriculation", e.target.value)} className={champInput} />
                </div>
                <div>
                  <label className={label}>Prix / jour (MAD) *</label>
                  <input type="number" min={0} value={f.v_prix_jour} onChange={(e) => set("v_prix_jour", e.target.value)} className={champInput} />
                </div>
                <div>
                  <label className={label}>Carburant</label>
                  <select value={f.v_carburant} onChange={(e) => set("v_carburant", e.target.value)} className={champInput}>
                    <option value="">—</option>
                    <option value="essence">Essence</option>
                    <option value="diesel">Diesel</option>
                    <option value="electrique">Électrique</option>
                    <option value="hybride">Hybride</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Transmission</label>
                  <select value={f.v_transmission} onChange={(e) => set("v_transmission", e.target.value)} className={champInput}>
                    <option value="">—</option>
                    <option value="manuelle">Manuelle</option>
                    <option value="automatique">Automatique</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={() => setEtape((e) => Math.max(0, e - 1))}
          disabled={etape === 0 || isPending}
          className="flex items-center gap-1.5 rounded-lg border border-dash-border px-4 py-2.5 text-sm font-medium text-dash-text-secondary hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronLeft size={15} /> Précédent
        </button>

        {etape < 3 ? (
          <button
            onClick={() => setEtape((e) => e + 1)}
            disabled={!etapeValide(etape)}
            className="flex items-center gap-1.5 rounded-lg bg-dash-sidebar px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            Suivant <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={soumettre}
            disabled={isPending || !serviceRoleDispo || !etapeValide(0) || !etapeValide(1)}
            className="flex items-center gap-1.5 rounded-lg bg-dash-accent px-5 py-2.5 text-sm font-semibold text-dash-text hover:brightness-95 disabled:opacity-40"
          >
            <Sparkles size={15} strokeWidth={2} />
            {isPending ? "Création…" : "Créer l'espace"}
          </button>
        )}
      </div>
    </div>
  );
}

function LienCopiable({
  titre,
  valeur,
  onCopier,
}: {
  titre: string;
  valeur: string;
  onCopier: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-dash-text-secondary">{titre}</p>
      <div className="flex items-center gap-2 rounded-lg border border-dash-border bg-gray-50 px-3 py-2">
        <code className="flex-1 truncate text-xs text-dash-text">{valeur}</code>
        <button
          onClick={() => onCopier(valeur)}
          className="shrink-0 rounded-md p-1 text-dash-text-secondary hover:bg-white hover:text-dash-dark"
          aria-label="Copier"
        >
          <Copy size={14} />
        </button>
      </div>
    </div>
  );
}
