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
  experimental: {
    serverActions: {
      // Les documents (RC, pièce d'identité) et photos de véhicules
      // dépassent facilement la limite par défaut de 1 MB.
      bodySizeLimit: "10mb",
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
