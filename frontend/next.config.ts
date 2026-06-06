import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["msw"],
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    NEXT_PUBLIC_CLOUDFRONT_URL: process.env.NEXT_PUBLIC_CLOUDFRONT_URL,
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



