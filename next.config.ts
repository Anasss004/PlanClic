import type { NextConfig } from "next";

// Nom d'hôte Supabase extrait de l'URL du projet — utilisé dans la CSP
// pour n'autoriser que ce domaine précis (pas de wildcard).
function hoteSupabase(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host;
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  // Autorise l'optimiseur d'images Next à traiter les photos de véhicules
  // servies par Supabase Storage. Sans cette entrée, next/image répond
  // 400 « "url" parameter is not allowed ». Les images optimisées sont
  // ensuite servies depuis /_next/image, donc couvertes par le
  // `img-src 'self'` de la CSP.
  //
  // Le motif est statique plutôt que dérivé de NEXT_PUBLIC_SUPABASE_URL
  // comme la CSP, pour rester valable quel que soit le projet Supabase
  // (production, préproduction, environnement local) sans dépendre de
  // l'ordre de chargement des variables d'environnement.
  //
  // Le chemin reste restreint aux objets publics du bucket : l'optimiseur
  // ne peut pas être détourné pour aller chercher une URL arbitraire.
  //
  // À savoir en développement : Next 16 refuse d'optimiser une image dont
  // le nom d'hôte résout vers une IP jugée privée (protection SSRF). Sur un
  // réseau IPv6 en NAT64, supabase.co résout vers des adresses 64:ff9b::/96
  // qui encapsulent des IPv4 publiques mais sont classées comme privées :
  // les photos ne s'affichent alors pas en local, alors qu'elles
  // fonctionnent en production. Ne pas « corriger » cela avec
  // images.dangerouslyAllowLocalIP, qui désactiverait la protection partout.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  experimental: {
    serverActions: {
      // Les documents (RC, pièce d'identité) et photos de véhicules
      // dépassent facilement la limite par défaut de 1 MB. Le flux
      // "Nouvelle location" peut envoyer plusieurs photos d'état des
      // lieux en une seule soumission — d'où une marge plus large.
      bodySizeLimit: "25mb",
    },
  },

  async headers() {
    const supabaseHost = hoteSupabase();
    const enDeveloppement = process.env.NODE_ENV !== "production";

    // ⚠️ figma.com est temporairement autorisé pour les images de la
    // homepage — à retirer une fois les vraies photos en place (voir
    // note dans CitiesGrid/PromoBanner/SearchHero).
    //
    // 'unsafe-eval' est nécessaire UNIQUEMENT en développement : le
    // hot-reload de Next.js/Turbopack utilise eval() pour reconstruire
    // les stack traces. En production, React n'utilise jamais eval(),
    // donc cette permission est automatiquement retirée.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${enDeveloppement ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://*.figma.com ${supabaseHost ? `https://${supabaseHost}` : ""}`,
      `connect-src 'self' ${supabaseHost ? `https://${supabaseHost} wss://${supabaseHost}` : ""}${enDeveloppement ? " ws://localhost:* http://localhost:*" : ""}`,
      "font-src 'self' data:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
