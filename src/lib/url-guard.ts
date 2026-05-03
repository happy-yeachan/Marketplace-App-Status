// SSRF guard for outbound fetch targets.
//
// /api/status accepts user-supplied statusUrl values (originally pasted into the
// "Add app" dialog or migrated from older localStorage entries). Without a
// hostname allowlist, an attacker who can craft a request body could coerce the
// server into reaching cloud metadata endpoints (169.254.169.254), localhost
// services, or the internal RFC1918 network — classic SSRF.
//
// We reject URLs that point to:
//   • non-http(s) schemes (file://, gopher://, ftp:// …)
//   • IPv4 literals in private / loopback / link-local / multicast / reserved
//   • IPv6 loopback and unique-local prefixes
//   • bare hostnames "localhost" and ".local"/".internal"/".lan" suffixes
//
// Public DNS names that resolve to internal addresses (DNS rebinding) are NOT
// blocked here — that requires per-fetch socket-level filtering, which Node's
// built-in fetch does not expose. For our threat model (public SaaS, low-value
// proxy), the literal-IP block plus the loopback hostname check covers the
// realistic attack surface.

export type UrlGuardResult =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
]);

const PRIVATE_TLD_SUFFIXES = [".local", ".internal", ".lan", ".localhost"];

function isPrivateIpv4(host: string): boolean {
  // Match dotted-quad only. Fail open for hostnames.
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10) return true;                       // 10.0.0.0/8
  if (a === 127) return true;                      // 127.0.0.0/8 loopback
  if (a === 0) return true;                        // 0.0.0.0/8 reserved
  if (a === 169 && b === 254) return true;         // 169.254.0.0/16 link-local (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true;         // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true;                       // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false;
}

function isPrivateIpv6(host: string): boolean {
  // Bracketed IPv6 from URL parsing is already stripped of brackets in URL.hostname.
  const h = host.toLowerCase();
  if (h === "::1" || h === "::") return true;       // loopback / unspecified
  if (h.startsWith("fe80:") || h.startsWith("fe80::")) return true; // link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true;        // unique-local fc00::/7
  if (h.startsWith("ff")) return true;              // multicast ff00::/8
  // ::ffff:a.b.c.d — IPv4-mapped — recurse into IPv4 logic
  const mapped = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped && isPrivateIpv4(mapped[1])) return true;
  return false;
}

/**
 * Validate that a URL is safe to fetch from server-side code.
 * Rejects non-http(s) schemes and any host that resolves literally to a
 * private/loopback/link-local/multicast address.
 */
export function guardOutboundUrl(input: string): UrlGuardResult {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "URL is malformed." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `Unsupported URL scheme "${url.protocol}".` };
  }

  const host = url.hostname.toLowerCase();
  if (!host) {
    return { ok: false, reason: "URL has no hostname." };
  }

  if (PRIVATE_HOSTNAMES.has(host)) {
    return { ok: false, reason: "URL points to a loopback hostname." };
  }
  if (PRIVATE_TLD_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: "URL points to a private TLD." };
  }
  if (isPrivateIpv4(host)) {
    return { ok: false, reason: "URL points to a private IPv4 address." };
  }
  if (host.includes(":") && isPrivateIpv6(host)) {
    return { ok: false, reason: "URL points to a private IPv6 address." };
  }

  return { ok: true, url };
}

/**
 * Redact a URL for safe logging — keeps scheme + hostname, drops path/query.
 * Use anywhere a fetched URL would otherwise be written to a log sink.
 */
export function redactUrl(input: string): string {
  try {
    const u = new URL(input);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return "[invalid-url]";
  }
}
