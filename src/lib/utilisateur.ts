import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// Résolution de l'utilisateur courant, dédupliquée par requête.
//
// supabase.auth.getUser() n'est pas une lecture de cookie : c'est un
// aller-retour réseau vers le serveur Auth de Supabase, qui valide le JWT
// côté serveur. Le même appel était refait dans le layout, dans la page,
// dans le Header et dans exigerStaff() — soit 2 à 3 allers-retours
// identiques par navigation, auxquels s'ajoutait autant de lectures de la
// table `profiles`.
//
// cache() de React mémorise le résultat pour la durée d'un rendu de
// requête : peu importe combien de composants appellent ces fonctions,
// un seul appel réseau part réellement. La mémorisation ne franchit pas
// la frontière d'une requête, il n'y a donc aucun risque de fuite de
// session entre deux utilisateurs.
// ============================================================

export type ProfilUtilisateur = {
  id: string;
  role: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
};

// Utilisateur authentifié, ou null. Un seul getUser() réseau par requête.
export const getUtilisateur = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Utilisateur + sa ligne `profiles`. Les colonnes forment le sur-ensemble
// de ce que demandaient les appelants (layout propriétaire, Header,
// exigerStaff, recherche, impersonation) : chacun continue de lire les
// mêmes champs qu'avant.
export const getUtilisateurEtProfil = cache(
  async (): Promise<{
    user: Awaited<ReturnType<typeof getUtilisateur>>;
    profil: ProfilUtilisateur | null;
  }> => {
    const user = await getUtilisateur();
    if (!user) return { user: null, profil: null };

    const supabase = await createClient();
    const { data: profil } = await supabase
      .from("profiles")
      .select("id, role, prenom, nom, email")
      .eq("id", user.id)
      .single();

    return { user, profil: (profil as ProfilUtilisateur | null) ?? null };
  }
);
