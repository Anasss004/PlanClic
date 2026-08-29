import { createClient } from "@/lib/supabase/server";
import { VILLES as VILLES_FALLBACK } from "@/lib/villes";

// ============================================================
// Lecture des paramètres globaux de la plateforme (table
// public.parametres_plateforme). Les clés "publiques" sont lisibles
// sans être connecté (RLS). En cas d'indisponibilité (table pas
// encore migrée, réseau...), on retombe sur les valeurs en dur
// historiques pour ne jamais casser l'affichage public.
// ============================================================

export type ParametresPlateforme = {
  whatsapp_admin: string;
  lien_cgu: string;
  lien_confidentialite: string;
  villes: string[];
  categories_vehicule: string[];
};

const DEFAUTS: ParametresPlateforme = {
  whatsapp_admin: process.env.NEXT_PUBLIC_WHATSAPP_ADMIN || "212600000000",
  lien_cgu: "/cgu",
  lien_confidentialite: "/politique-confidentialite",
  villes: VILLES_FALLBACK.map((v) => v.nom),
  categories_vehicule: ["economique", "berline_luxe", "suv_4x4"],
};

export async function getParametresPlateforme(): Promise<ParametresPlateforme> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("parametres_plateforme")
      .select("cle, valeur");

    if (error || !data) return DEFAUTS;

    const map = new Map(data.map((r) => [r.cle, r.valeur]));
    return {
      whatsapp_admin: (map.get("whatsapp_admin") as string) ?? DEFAUTS.whatsapp_admin,
      lien_cgu: (map.get("lien_cgu") as string) ?? DEFAUTS.lien_cgu,
      lien_confidentialite:
        (map.get("lien_confidentialite") as string) ?? DEFAUTS.lien_confidentialite,
      villes: (map.get("villes") as string[]) ?? DEFAUTS.villes,
      categories_vehicule:
        (map.get("categories_vehicule") as string[]) ?? DEFAUTS.categories_vehicule,
    };
  } catch {
    return DEFAUTS;
  }
}

// Version "brute" pour la page d'admin : renvoie aussi description /
// updated_at, sans fallback (on veut voir l'état réel de la table).
export type ParametreLigne = {
  cle: string;
  valeur: unknown;
  public: boolean;
  description: string | null;
  updated_at: string;
};

export async function getParametresBruts(): Promise<ParametreLigne[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parametres_plateforme")
    .select("cle, valeur, public, description, updated_at")
    .order("cle", { ascending: true });
  return (data ?? []) as ParametreLigne[];
}
