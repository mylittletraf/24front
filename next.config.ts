import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keep trailing slashes on /api/proxy/* (DRF endpoints need them) instead of
  // 308-redirecting them away.
  skipTrailingSlashRedirect: true,
  images: {
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
    // Storage host masking: public /media/* maps back to the real storage server, so the
    // storage origin never appears in page URLs (see src/lib/media.ts → toMediaUrl).
    const mediaOrigin = process.env.MEDIA_ORIGIN ?? origin;
    const stripPrefix = process.env.NEXT_PUBLIC_MEDIA_STRIP_PREFIX ?? "/local-storage";
    return [
      { source: "/media/:path*", destination: `${mediaOrigin}${stripPrefix}/:path*` },
      // Proxy SEO infra files from the backend through the frontend domain.
      { source: "/sitemap.xml", destination: `${origin}/sitemap.xml` },
      { source: "/sitemap-:slug.xml", destination: `${origin}/sitemap-:slug.xml` },
      { source: "/robots.txt", destination: `${origin}/robots.txt` },
    ];
  },
};

export default withNextIntl(nextConfig);
