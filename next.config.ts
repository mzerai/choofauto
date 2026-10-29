import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paquet autonome pour le conteneur Cloud Run (tâche 1.3).
  output: "standalone",
};

export default nextConfig;
