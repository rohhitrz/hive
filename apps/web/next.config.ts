import type { NextConfig } from "next";

// Secrets live in the repo-root .env; Next only reads apps/web/.env by default.
try {
  process.loadEnvFile("../../.env");
} catch {
  // no root .env: rely on the real environment
}

const nextConfig: NextConfig = {
  // Core runs inside the Node server process (see ARCHITECTURE.md §2).
  serverExternalPackages: ["@hive/core"],
};

export default nextConfig;
