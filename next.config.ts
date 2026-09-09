import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    cpus: 2,
    workerThreads: true,
  },
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://code.tidio.co https://*.tidiochat.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://grayjaycare.ca https://embed-ssl.wistia.com https://*.tidio.co https://*.tidiochat.com",
      "font-src 'self' data: https://code.tidio.co https://*.tidiochat.com",
      "media-src 'self' https://code.tidio.co https://*.tidiochat.com",
      "connect-src 'self' https://*.tidio.co https://*.tidiochat.com wss://*.tidio.co wss://*.tidiochat.com",
      "frame-src https://fast.wistia.net https://www.openstreetmap.org https://*.tidio.co https://*.tidiochat.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
