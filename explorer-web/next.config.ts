import type { NextConfig } from "next";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

const rootDir = path.join(__dirname, "..");
const monorepoRoot = path.join(__dirname, "../..");
loadDotenv({ path: path.join(rootDir, ".env") });
loadDotenv({ path: path.join(rootDir, ".env.local"), override: true });

function resolveApiBase(): string {
  if (process.env.EXPLORER_API_URL) return process.env.EXPLORER_API_URL.replace(/\/$/, "");
  const host = process.env.BTCEXP_HOST ?? "127.0.0.1";
  const port = process.env.BTCEXP_PORT ?? "3002";
  return `http://${host}:${port}`;
}

function resolveFastApiBase(): string {
  if (process.env.EXPLORER_FAST_API_URL) {
    return process.env.EXPLORER_FAST_API_URL.replace(/\/$/, "");
  }
  const host = process.env.VCEXP_FAST_API_HOST ?? "127.0.0.1";
  const port = process.env.VCEXP_FAST_API_PORT ?? "3003";
  return `http://${host}:${port}`;
}

function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.EXPLORER_SITE_URL ??
    process.env.BTCEXP_PUBLIC_URL ??
    "https://explorer.vericonomy.com";
  return raw.trim().replace(/\/$/, "");
}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["@vericonomy/network-metrics"],
  turbopack: {
    root: monorepoRoot,
  },
  env: {
    NEXT_PUBLIC_SITE_URL: resolveSiteUrl(),
    EXPLORER_SITE_URL: resolveSiteUrl(),
    EXPLORER_API_URL: resolveApiBase(),
    EXPLORER_FAST_API_URL: resolveFastApiBase(),
    NEXT_PUBLIC_EXPLORER_FAST_API_URL: resolveFastApiBase(),
    BTCEXP_HOST: process.env.BTCEXP_HOST ?? "127.0.0.1",
    BTCEXP_PORT: process.env.BTCEXP_PORT ?? "3002",
    BTCEXP_BASEURL: process.env.BTCEXP_BASEURL ?? "/",
    BTCEXP_UI_THEME: process.env.BTCEXP_UI_THEME ?? "dark",
    NEXT_PUBLIC_BTCEXP_UI_THEME: process.env.BTCEXP_UI_THEME ?? "dark",
  },
  async rewrites() {
    const apiBase = resolveApiBase();
    const fastApiBase = resolveFastApiBase();
    return [
      {
        source: "/v1/:path*",
        destination: `${fastApiBase}/v1/:path*`,
      },
      {
        source: "/backend-api/:path*",
        destination: `${apiBase}/:path*`,
      },
      // Legacy Next metadata paths referenced before static logo was wired up.
      {
        source: "/apple-icon",
        destination: "/img/vericonomy/vericonomylogo.png",
      },
      {
        source: "/icon",
        destination: "/img/vericonomy/vericonomylogo.png",
      },
    ];
  },
};

export default nextConfig;
