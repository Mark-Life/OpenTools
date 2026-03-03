import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  reactCompiler: true,
  typedRoutes: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
  },
};

export default nextConfig;
