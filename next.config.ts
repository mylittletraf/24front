import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000/api/v1";
    const origin = api.replace(/\/api\/v1\/?$/, "");
    // Proxy SEO infra files from the backend through the frontend domain.
    return [
      { source: "/sitemap.xml", destination: `${origin}/sitemap.xml` },
      { source: "/sitemap-:slug.xml", destination: `${origin}/sitemap-:slug.xml` },
      { source: "/robots.txt", destination: `${origin}/robots.txt` },
    ];
  },
};

export default withNextIntl(nextConfig);
