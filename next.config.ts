import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["argon2"],
  experimental: {
    // File sizes are not restricted by the application. This higher transport
    // allowance keeps browser Server Action uploads from being artificially capped.
    // The hosting platform, reverse proxy, and storage provider can still impose
    // their own request/object-size limits.
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
};

export default nextConfig;
