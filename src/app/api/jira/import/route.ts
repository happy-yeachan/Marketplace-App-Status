export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { RegisteredApp } from "@/types";
import { resolveStatusUrl, VENDOR_BLACKLIST } from "@/types";
import { discoverStatusUrl, normalizeVendorName } from "@/lib/status-discovery";
import { guardOutboundUrl } from "@/lib/url-guard";

interface UpmPlugin {
  key?: string;
  name?: string;
  vendor?: { name?: string };
  userInstalled?: boolean;
  enabled?: boolean;
}

interface UpmResponse {
  plugins?: UpmPlugin[];
  links?: { next?: { href?: string } };
}

function normalizeJiraUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "");
  // Accept bare domain (no scheme) or https://
  let withScheme = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    withScheme = `https://${trimmed}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  return `https://${parsed.host}`;
}

async function fetchUpmPage(url: string, auth: string): Promise<UpmResponse> {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401 || res.status === 403) {
    const err = new Error("auth");
    err.name = "AuthError";
    throw err;
  }
  if (res.status === 404) {
    const err = new Error("notFound");
    err.name = "NotFoundError";
    throw err;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<UpmResponse>;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "jiraImport.error.generic" }, { status: 400 });
  }

  const { jiraUrl, email, apiToken } = body as Record<string, unknown>;

  if (
    typeof jiraUrl !== "string" || !jiraUrl.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof apiToken !== "string" || !apiToken.trim()
  ) {
    return NextResponse.json({ error: "jiraImport.error.generic" }, { status: 400 });
  }

  const baseUrl = normalizeJiraUrl(jiraUrl);
  if (!baseUrl) {
    return NextResponse.json({ error: "jiraImport.error.notFound" }, { status: 400 });
  }

  const guard = guardOutboundUrl(`${baseUrl}/rest/plugins/1.0/`);
  if (!guard.ok) {
    return NextResponse.json({ error: "jiraImport.error.notFound" }, { status: 400 });
  }

  const auth = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

  const plugins: UpmPlugin[] = [];
  let nextUrl: string | null = `${baseUrl}/rest/plugins/1.0/?os_authType=basic`;
  let pages = 0;

  try {
    while (nextUrl && pages < 10) {
      const pageGuard = guardOutboundUrl(nextUrl);
      if (!pageGuard.ok) break;

      const data = await fetchUpmPage(nextUrl, auth);
      pages++;

      if (Array.isArray(data.plugins)) {
        plugins.push(...data.plugins);
      }

      const href = data.links?.next?.href;
      nextUrl = href && typeof href === "string" ? href : null;

      // If the next URL is relative, make it absolute
      if (nextUrl && !nextUrl.startsWith("http")) {
        nextUrl = `${baseUrl}${nextUrl.startsWith("/") ? "" : "/"}${nextUrl}`;
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AuthError") {
        return NextResponse.json({ error: "jiraImport.error.auth" }, { status: 401 });
      }
      if (err.name === "NotFoundError") {
        return NextResponse.json({ error: "jiraImport.error.notFound" }, { status: 404 });
      }
      if (err.name === "AbortError" || err.name === "TimeoutError") {
        return NextResponse.json({ error: "jiraImport.error.timeout" }, { status: 504 });
      }
    }
    return NextResponse.json({ error: "jiraImport.error.generic" }, { status: 502 });
  }

  const userInstalled = plugins.filter((p) => p.userInstalled === true);
  const total = userInstalled.length;

  const CONCURRENCY = 15;
  const apps: RegisteredApp[] = [];

  async function resolvePlugin(p: UpmPlugin): Promise<RegisteredApp | null> {
    const appName = p.name?.trim() || p.key || "Unknown App";
    const rawVendor = p.vendor?.name?.trim() || "Unknown";
    const vendorNorm = normalizeVendorName(rawVendor);

    if (VENDOR_BLACKLIST.has(vendorNorm)) {
      return {
        id: p.key ?? crypto.randomUUID(),
        appName,
        vendorName: rawVendor,
        checkType: "custom",
        statusUrl: "",
      };
    }

    const resolved = resolveStatusUrl(appName, vendorNorm);
    if (resolved) {
      return {
        id: p.key ?? crypto.randomUUID(),
        appName,
        vendorName: rawVendor,
        checkType: resolved.checkType,
        statusUrl: resolved.statusUrl,
      };
    }

    const discovered = await discoverStatusUrl(vendorNorm);
    return {
      id: p.key ?? crypto.randomUUID(),
      appName,
      vendorName: rawVendor,
      checkType: discovered?.checkType ?? "custom",
      statusUrl: discovered?.statusUrl ?? "",
    };
  }

  // Process in batches of CONCURRENCY
  for (let i = 0; i < userInstalled.length; i += CONCURRENCY) {
    const batch = userInstalled.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(resolvePlugin));
    for (const r of results) {
      if (r) apps.push(r);
    }
  }

  const mappedCount = apps.filter((a) => a.statusUrl !== "").length;

  return NextResponse.json({ apps, total, mappedCount });
}
