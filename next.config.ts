import type { NextConfig } from "next";

// CSP notes:
//   • script-src needs 'unsafe-inline' for the dark-mode flash-prevention script
//     in app/layout.tsx (dangerouslySetInnerHTML, runs before hydration).
//   • style-src needs 'unsafe-inline' because Tailwind/shadcn emit inline styles.
//   • img-src is permissive (https + data:) since marketplace logos load from
//     several Atlassian/vendor CDNs and we cannot enumerate them all.
//   • connect-src 'self' covers our /api/* proxies; outbound vendor-status
//     fetches are server-side, not browser-initiated.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' fonts.gstatic.com",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
