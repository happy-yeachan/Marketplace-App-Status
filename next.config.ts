import type { NextConfig } from "next";

// CSP notes:
//   • script-src needs 'unsafe-inline' for the dark-mode flash-prevention script
//     in app/layout.tsx (dangerouslySetInnerHTML, runs before hydration).
//   • Dev only: React + Turbopack use eval() for debugging features (callstack
//     reconstruction, source maps). Production builds never call eval(), so we
//     keep 'unsafe-eval' out of the production CSP.
//   • style-src needs 'unsafe-inline' because Tailwind/shadcn emit inline styles.
//   • img-src is permissive (https + data:) since marketplace logos load from
//     several Atlassian/vendor CDNs and we cannot enumerate them all.
//   • connect-src 'self' covers our /api/* proxies in production; dev mode also
//     needs ws: for the Turbopack HMR socket.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";
const connectSrc = isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'";
const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' fonts.gstatic.com",
  connectSrc,
  // Allow embedding in Confluence (*.atlassian.net) and self
  "frame-ancestors 'self' https://*.atlassian.net https://*.jira.com https://*.confluence.com",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // X-Frame-Options removed — CSP frame-ancestors above handles framing policy.
  // X-Frame-Options doesn't support wildcards; keeping it would override CSP in some browsers.
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
