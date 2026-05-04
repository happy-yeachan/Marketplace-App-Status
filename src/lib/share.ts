import type { CheckType, RegisteredApp } from "@/types";

interface ShareEntry {
  n: string;   // appName
  v: string;   // vendorName
  u: string;   // statusUrl
  t: string;   // checkType
  l?: string;  // logoUrl
}

export function encodeSharePayload(apps: RegisteredApp[]): string {
  const entries: ShareEntry[] = apps.map((a) => ({
    n: a.appName,
    v: a.vendorName,
    u: a.statusUrl,
    t: a.checkType,
    ...(a.logoUrl ? { l: a.logoUrl } : {}),
  }));
  const json = JSON.stringify(entries);
  // btoa only handles latin1 — encode to UTF-8 percent-encoding first
  const base64 = btoa(unescape(encodeURIComponent(json)));
  // URL-safe base64 (no +, /, or padding =)
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function decodeSharePayload(encoded: string): RegisteredApp[] | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(base64)));
    const entries = JSON.parse(json) as ShareEntry[];
    if (!Array.isArray(entries)) return null;
    return entries
      .map((e) => ({
        id: crypto.randomUUID(),
        appName: e.n ?? "",
        vendorName: e.v ?? "",
        statusUrl: e.u ?? "",
        checkType: (e.t as CheckType) ?? "statuspage_api",
        ...(e.l ? { logoUrl: e.l } : {}),
      }))
      .filter((a) => a.appName.length > 0);
  } catch {
    return null;
  }
}

export function buildShareUrl(apps: RegisteredApp[]): string {
  const payload = encodeSharePayload(apps);
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
