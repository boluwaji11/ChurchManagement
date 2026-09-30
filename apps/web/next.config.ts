import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@hearth/ui", "@hearth/db"],
  // postgres.js is a server driver. Keep it out of the bundle entirely.
  serverExternalPackages: ["postgres"],
  experimental: {
    // Shared element transitions where a card becomes a detail page. (R24.12)
    viewTransition: true,
  },
};

export default config;
