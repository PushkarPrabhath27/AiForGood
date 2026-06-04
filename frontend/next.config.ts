import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["msw"],
  images: {
    remotePatterns: [],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "msw/browser": path.resolve(process.cwd(), "lib/mocks/empty.ts"),
      };
    }
    return config;
  },
  // For Next.js 15/16+ standard turbopack config
  // @ts-ignore
  turbopack: {
    resolveAlias: {
      "msw/browser": {
        browser: "./node_modules/msw/lib/browser/index.mjs",
        default: "./lib/mocks/empty.ts",
      },
    },
  },
};

export default nextConfig;



