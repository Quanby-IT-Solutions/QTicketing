import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["argon2"],
  experimental: {
    // Server Actions default to a 1 MB body limit, which rejects ticket/comment
    // uploads. The per-file cap is 10 MB (src/lib/storage.ts), so 100 MB allows
    // up to ~10 max-size files per request. Tune this value as needed.
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
