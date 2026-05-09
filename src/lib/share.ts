import type { CheckType, RegisteredApp } from "@/types";

// ── Tuple format ──────────────────────────────────────────────────────────────
// Compact representation: [id, appName, vendorName, compressedStatusUrl, ctChar, assetId?]
// Avoids JSON object key overhead (~26 chars/app) and encodes checkType as a
// single char so "statuspage_api" (14 chars) becomes "s" (1 char).
//
// logoUrl is stored as just the CDN asset ID (UUID, ~36 chars) rather than the
// full URL (~110 chars). The full URL is reconstructed on decode.
// Saves ~74 chars per app vs storing the full URL.
type ShareTuple = [string, string, string, string, string, string?];

const LOGO_BASE = "https://marketplace.atlassian.com/product-listing/files/";

function extractAssetId(logoUrl?: string): string {
  if (!logoUrl) return "";
  const match = logoUrl.match(/\/files\/([^?]+)/);
  return match?.[1] ?? "";
}

function buildLogoUrl(assetId: string): string | undefined {
  return assetId ? `${LOGO_BASE}${assetId}?width=72&height=72` : undefined;
}

const CT_ENC: Record<string, string> = {
  statuspage_api: "s",
  http_ping: "h",
  custom: "c",
};
const CT_DEC: Record<string, CheckType> = {
  s: "statuspage_api",
  h: "http_ping",
  c: "custom",
};

// ── statusUrl suffix compression ─────────────────────────────────────────────
// Replaces common 20-35 char suffixes with a 2-char prefix code.
// Lossless: decompressStatusUrl() fully restores the original URL.
const URL_SUFFIX_MAP: Array<{ code: string; suffix: string }> = [
  { code: "S", suffix: "/api/v2/summary.json" },
  { code: "s", suffix: "/api/v2/status.json" },
  { code: "I", suffix: "/summary.json" },
  { code: "i", suffix: "/index.json" },
];

function compressStatusUrl(url: string): string {
  if (!url) return "";
  for (const { code, suffix } of URL_SUFFIX_MAP) {
    if (url.endsWith(suffix)) return `${code}:${url.slice(0, -suffix.length)}`;
  }
  return url;
}

function decompressStatusUrl(encoded: string): string {
  if (!encoded) return "";
  for (const { code, suffix } of URL_SUFFIX_MAP) {
    if (encoded.startsWith(`${code}:`)) return encoded.slice(2) + suffix;
  }
  return encoded;
}

// ── Binary / base64 helpers ───────────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── deflate-raw compression (Web Streams API — available in all target envs) ─

async function deflate(str: string): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(new TextEncoder().encode(str));
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  // Wrap in a fresh Uint8Array to guarantee ArrayBuffer (not SharedArrayBuffer),
  // which is what WritableStreamDefaultWriter.write() requires.
  writer.write(new Uint8Array(bytes));
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return new TextDecoder().decode(out);
}

// ── Public API ────────────────────────────────────────────────────────────────
// Format v3 (current): "z:" + base64url(deflate-raw(JSON tuples))
// Format v2 (interim): "z:" + base64url(deflate-raw(JSON objects))  — auto-detected
// Format v1 (legacy):  plain base64url(JSON objects)                — auto-detected

export async function encodeSharePayload(apps: RegisteredApp[]): Promise<string> {
  const tuples: ShareTuple[] = apps.map((a) => {
    const assetId = extractAssetId(a.logoUrl);
    const tuple: ShareTuple = [
      a.id,
      a.appName,
      a.vendorName,
      compressStatusUrl(a.statusUrl),
      CT_ENC[a.checkType] ?? "c",
    ];
    if (assetId) tuple.push(assetId);
    return tuple;
  });
  const compressed = await deflate(JSON.stringify(tuples));
  return "z:" + toBase64Url(compressed);
}

export async function decodeSharePayload(encoded: string): Promise<RegisteredApp[] | null> {
  try {
    let json: string;
    if (encoded.startsWith("z:")) {
      json = await inflate(fromBase64Url(encoded.slice(2)));
    } else {
      // v1: plain URL-safe base64 JSON (may include logoUrl)
      const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
      json = decodeURIComponent(escape(atob(base64)));
    }

    const parsed = JSON.parse(json) as unknown[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Auto-detect format by inspecting the first element.
    if (Array.isArray(parsed[0])) {
      // v3 — tuple format
      return (parsed as unknown[][])
        .map((t) => {
          const logoUrl = buildLogoUrl(String(t[5] ?? ""));
          return {
            id: String(t[0] ?? "") || crypto.randomUUID(),
            appName: String(t[1] ?? ""),
            vendorName: String(t[2] ?? ""),
            statusUrl: decompressStatusUrl(String(t[3] ?? "")),
            checkType: CT_DEC[String(t[4] ?? "")] ?? "statuspage_api",
            ...(logoUrl ? { logoUrl } : {}),
          };
        })
        .filter((a) => a.appName.length > 0);
    }

    // v1 / v2 — object format
    return (parsed as Array<{ i?: string; n?: string; v?: string; u?: string; t?: string; l?: string }>)
      .map((e) => ({
        id: e.i || crypto.randomUUID(),
        appName: e.n ?? "",
        vendorName: e.v ?? "",
        statusUrl: decompressStatusUrl(e.u ?? ""),
        checkType: (e.t as CheckType) ?? "statuspage_api",
        ...(e.l ? { logoUrl: e.l } : {}),
      }))
      .filter((a) => a.appName.length > 0);
  } catch {
    return null;
  }
}

export async function buildShareUrl(apps: RegisteredApp[]): Promise<string> {
  const payload = await encodeSharePayload(apps);
  const base =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "";
  return `${base}#share=${payload}`;
}

export function parseShareHash(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/^#share=(.+)$/);
  return match ? match[1] : null;
}
