import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Set turbopack root to this project directory
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Configure for puppeteer/chromium
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
