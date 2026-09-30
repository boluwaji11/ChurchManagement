import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@hearth/ui"],
  experimental: {
    // Shared element transitions where a card becomes a detail page. (R24.12)
    viewTransition: true,
  },
};

export default config;
