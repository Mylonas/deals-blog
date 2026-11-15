import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Lets src/app/global-not-found.tsx render the 404 page, which is needed now
  // that each language group has its own root layout.
  experimental: { globalNotFound: true },
};

export default nextConfig;
