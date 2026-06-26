import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained server bundle (.next/standalone) for a slim production image:
  // the Docker runner copies it + .next/static + public and runs `node server.js`.
  output: "standalone",
  // Keep trailing slashes on /api/proxy/* (DRF endpoints need them) instead of
  // 308-redirecting them away.
  skipTrailingSlashRedirect: true,
  images: {
    // Serve modern formats (smaller = better LCP / Core Web Vitals).
    formats: ["image/avif", "image/webp"],
    // The dev backend serves images from localhost (a private IP); Next 16's SSRF
    // guard blocks optimizing those, so allow local IPs in development only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000" },
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000/api/v1";
    const origin = api.replace(/\/api\/v1\/?$/, "");
    // Note: /media/* is handled by the dynamic proxy route (src/app/media/[...path]/route.ts),
    // which forwards to whatever storage host the API masked into the path — not a static rewrite.
    return [
      // Proxy SEO infra files from the backend through the frontend domain.
      { source: "/sitemap.xml", destination: `${origin}/sitemap.xml` },
      { source: "/sitemap-:slug.xml", destination: `${origin}/sitemap-:slug.xml` },
      { source: "/robots.txt", destination: `${origin}/robots.txt` },
    ];
  },
};

export default withNextIntl(nextConfig);
