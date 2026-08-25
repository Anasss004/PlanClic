import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Les documents (RC, pièce d'identité) et photos de véhicules
      // dépassent facilement la limite par défaut de 1 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
