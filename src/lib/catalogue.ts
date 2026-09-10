import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

// ============================================================
// Lectures du catalogue public, mises en cache.
//
// Le catalogue (vue vehicules_recherche) et les noms d'agences (vue
// proprietaires_public) sont identiques pour tous les visiteurs et ne
// changent qu'à la création/modification/suppression d'un véhicule. Ils
// étaient pourtant relus intégralement à chaque chargement de /recherche
// et de chaque fiche véhicule.
//
// Le tag TAG_VEHICULES est invalidé par les Server Actions propriétaire et
// admin qui touchent un véhicule, donc une modification reste visible
// immédiatement malgré le cache — le revalidate de 60 s n'est qu'un filet
// de sécurité pour les écritures faites hors application (SQL direct,
// dashboard Supabase).
//
// La disponibilité (réservations en conflit) n'est volontairement PAS mise
// en cache : elle reste lue en direct dans la page, pour qu'un véhicule
// réservé il y a dix secondes n'apparaisse jamais comme libre.
// ============================================================

export const TAG_VEHICULES = "vehicules";

const REVALIDATION = 60;

export type FiltresCatalogue = {
  type?: string;
  ville?: string;
  transmission?: string;
  carburant?: string;
  passagersMin?: string;
  prixMax?: string;
};

export const lireCatalogue = unstable_cache(
  async (filtres: FiltresCatalogue) => {
    const supabase = createPublicClient();

    let requete = supabase.from("vehicules_recherche").select("*");
    if (filtres.type) requete = requete.eq("type", filtres.type);
    if (filtres.ville) requete = requete.eq("ville", filtres.ville);
    if (filtres.transmission) requete = requete.eq("transmission", filtres.transmission);
    if (filtres.carburant) requete = requete.eq("carburant", filtres.carburant);
    if (filtres.passagersMin) requete = requete.gte("places", Number(filtres.passagersMin));
    if (filtres.prixMax) requete = requete.lte("prix_jour", Number(filtres.prixMax));

    const { data } = await requete;
    return data ?? [];
  },
  ["catalogue-vehicules"],
  { revalidate: REVALIDATION, tags: [TAG_VEHICULES] }
);

export const lireAgencesPubliques = unstable_cache(
  async (ids: string[]) => {
    if (ids.length === 0) return [];
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("proprietaires_public")
      .select("id, nom_entreprise")
      .in("id", ids);
    return data ?? [];
  },
  ["agences-publiques"],
  { revalidate: REVALIDATION, tags: [TAG_VEHICULES] }
);

export const lireVehiculePublic = unstable_cache(
  async (id: string) => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("vehicules_recherche")
      .select("*")
      .eq("id", id)
      .single();
    return data ?? null;
  },
  ["vehicule-public"],
  { revalidate: REVALIDATION, tags: [TAG_VEHICULES] }
);

export const lireAgencePublique = unstable_cache(
  async (id: string) => {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("proprietaires_public")
      .select("nom_entreprise, ville")
      .eq("id", id)
      .single();
    return data ?? null;
  },
  ["agence-publique"],
  { revalidate: REVALIDATION, tags: [TAG_VEHICULES] }
);
