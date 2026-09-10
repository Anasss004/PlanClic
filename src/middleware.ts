import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Le middleware appelle supabase.auth.getUser(), qui est un aller-retour
  // réseau vers le serveur Auth de Supabase (validation du JWT côté serveur,
  // ce n'est pas une simple lecture de cookie). Le faire sur chaque requête
  // ajoutait cette latence AVANT tout rendu, y compris sur les pages publiques
  // et pour les visiteurs non connectés.
  //
  // On ne le déclenche donc plus que sur les espaces qui ont réellement besoin
  // d'une session rafraîchie côté serveur. Les pages publiques (/, /recherche,
  // /vehicules/*, /cgu, /mentions-legales, /politique-confidentialite) lisent
  // toujours l'utilisateur via leurs propres Server Components — leur
  // affichage est inchangé, elles ne paient simplement plus l'appel du
  // middleware en amont.
  //
  // Les pages d'authentification (/connexion, /inscription, ...) n'en ont pas
  // besoin non plus : leurs Server Actions créent leur propre client Supabase,
  // et une Server Action peut écrire les cookies de session directement.
  //
  // Note : depuis Next 16, Proxy/Middleware utilise le runtime Node.js par
  // défaut et l'option `runtime` n'est pas configurable ici (la définir lève
  // une erreur). Il s'exécute donc déjà dans la région des fonctions du projet
  // — la région se règle côté Vercel, pas dans ce fichier.
  matcher: [
    "/proprietaire/:path*",
    "/admin/:path*",
    "/profil/:path*",
    "/dashboard/:path*",
  ],
};
