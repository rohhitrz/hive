import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Core runs inside the Node server process (see ARCHITECTURE.md §2).
  serverExternalPackages: ["@hive/core"],
};

export default nextConfig;
