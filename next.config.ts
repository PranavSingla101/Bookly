/**
 * This file contains Next.js runtime/build configuration for the application.
 * Keep framework-level toggles, experimental flags, and custom build options
 * here as the project configuration evolves.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
