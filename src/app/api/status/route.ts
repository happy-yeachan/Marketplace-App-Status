// Force Next.js to never cache this route — status checks must always be live.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextResponse } from "next/server";
import type {
  AppHealthStatus,
  CheckType,
  HealthCheckResult,
  RegisteredApp,
} from "@/types";
import { discoverStatusUrl, normalizeVendorName } from "@/lib/status-discovery";
import { guardOutboundUrl, redactUrl } from "@/lib/url-guard";
import { extractAnyStatus } from "@/lib/status-extract";

const REQUEST_TIMEOUT_MS = 8000;

// In-memory rate limiter — sized for a single Vercel/serverless instance.
// Multi-instance deployments would need an external store, but for this
// proxy the goal is just to stop a single client from amplifying us into
// a fan-out fetch tool against vendor status pages.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_APPS = 600;     // total apps checked per IP per window
const RATE_LIMIT_MAX_ENTRIES = 500;  // evict expired entries beyond this size
const MAX_APPS_PER_REQUEST = 50;     // hard cap per single request — prevents fan-out abuse
const rateLimit = new Map<string, { resetAt: number; appCount: number }>();

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function consumeRateBudget(ip: string, appCount: number): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || entry.resetAt <= now) {
    // Evict all expired entries when the map grows too large to prevent
    // unbounded memory growth from unique IPs that never revisit.
    if (rateLimit.size >= RATE_LIMIT_MAX_ENTRIES) {
      for (const [k, v] of rateLimit) {
        if (v.resetAt <= now) rateLimit.delete(k);
      }
    }
    rateLimit.set(ip, { resetAt: now + RATE_LIMIT_WINDOW_MS, appCount });
    return appCount <= RATE_LIMIT_MAX_APPS;
  }
  entry.appCount += appCount;
  return entry.appCount <= RATE_LIMIT_MAX_APPS;
}

// ── Type guards ─────────────────────────────────────────────────────────────

function isRegisteredApp(value: unknown): value is RegisteredApp {
  if (!value || typeof value !== "object") return false;
  const app = value as Partial<RegisteredApp>;
  return (
    typeof app.id === "string" &&
    typeof app.appName === "string" &&
    typeof app.vendorName === "string" &&
    typeof app.statusUrl === "string" &&
    isCheckType(app.checkType)
  );
}

function isCheckType(value: unknown): value is CheckType {
  return value === "statuspage_api" || value === "http_ping" || value === "custom";
}

// ── Format detection ────────────────────────────────────────────────────────

/**
 * Atlassian Statuspage URLs always contain "/api/v2/".
 * Instatus / Hund.io URLs look like "/summary.json" or "/index.json" (no "/api/v2/").
 */
function isStatuspageUrl(url: string): boolean {
  return url.includes("/api/v2/");
}

// ── Self-healing helpers ────────────────────────────────────────────────────

/**
 * Returns true when the error is a DNS/network failure (the host doesn't exist
 * or is unreachable) rather than an HTTP-level error (the service is down but
 * the host resolved fine).
 *
 * These error codes signal that the URL itself is stale — the vendor probably
 * moved their status page — so we should try auto-discovery rather than
 * reporting a service outage.
 */
function isDnsOrConnectionError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("enotfound") ||       // DNS lookup failed
    msg.includes("econnrefused") ||    // host refuses connection
    msg.includes("econnreset") ||      // connection reset mid-way
    msg.includes("failed to fetch") || // browser-side DNS failure
    msg.includes("network error") ||
    msg.includes("getaddrinfo") ||     // Node.js DNS rejection
    msg.includes("name or service not known")
  );
}

// ── Health check ────────────────────────────────────────────────────────────

async function checkAppHealth(app: RegisteredApp): Promise<HealthCheckResult> {
  const start = Date.now();

  if (!app.statusUrl) {
    return {
      appId:         app.id,
      status:        "degraded",
      checkedAt:     new Date().toISOString(),
      responseTimeMs: null,
      message:       "No status URL configured for this vendor.",
    };
  }

  // SSRF guard: refuse to fetch internal/private addresses regardless of
  // what's stored in the user's localStorage. We return "degraded" rather
  // than "outage" so the row is visible but does not skew uptime stats.
  const guard = guardOutboundUrl(app.statusUrl);
  if (!guard.ok) {
    console.warn(`[BLOCKED] "${app.appName}" rejected: ${guard.reason} host=${redactUrl(app.statusUrl)}`);
    return {
      appId:         app.id,
      status:        "degraded",
      checkedAt:     new Date().toISOString(),
      responseTimeMs: null,
      message:       `Status URL blocked: ${guard.reason}`,
    };
  }

  try {
    // Statuspage: URLs may end with either status.json or summary.json.
    //   summary.json includes components[] needed for per-app matching.
    //   We upgrade status.json → summary.json here so old localStorage entries
    //   (which still carry status.json) are handled transparently.
    //   summary.json URLs pass through unchanged (regex simply won't match).
    // Instatus / Hund.io: no /api/v2/ prefix — use URL as-is.
    const isStatuspage = isStatuspageUrl(app.statusUrl);
    const fetchUrl = isStatuspage
      ? app.statusUrl.replace(/\/api\/v2\/status\.json$/, "/api/v2/summary.json")
      : app.statusUrl;


    const response = await fetch(fetchUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        // Explicitly request JSON — tells CDNs/WAFs this is a data fetch, not a page load
        Accept: "application/json",
        // Mimic a real browser to bypass basic Cloudflare / bot-management challenges
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    const responseTimeMs = Date.now() - start;

    // ── http_ping ──────────────────────────────────────────────────────────
    if (app.checkType === "http_ping") {
      return {
        appId:         app.id,
        status:        response.ok ? "operational" : "outage",
        checkedAt:     new Date().toISOString(),
        responseTimeMs,
        message:       response.ok
          ? `HTTP ${response.status}`
          : `HTTP error: ${response.status}`,
      };
    }

    // ── statuspage_api (Statuspage or Instatus) ────────────────────────────
    if (app.checkType === "statuspage_api") {
      if (!response.ok) {
        console.error(`[FETCH FAILED] "${app.appName}" | HTTP ${response.status} — skipping parse, returning outage`);
        return {
          appId:         app.id,
          status:        "outage",
          checkedAt:     new Date().toISOString(),
          responseTimeMs,
          message:       `Status API request failed: HTTP ${response.status}`,
        };
      }

      // Guard against CDN/WAF bot challenges that return HTML with 200 OK
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        console.error(
          `[FETCH BLOCKED] "${app.appName}" | content-type="${contentType}" — WAF/CDN returned non-JSON (HTML bot challenge?). host=${redactUrl(fetchUrl)}`,
        );
        return {
          appId:          app.id,
          status:         "degraded" as AppHealthStatus,
          checkedAt:      new Date().toISOString(),
          responseTimeMs,
          message:        "Status page blocked request (CDN/WAF challenge). Try again later.",
        };
      }

      const payload = (await response.json()) as unknown;

      // extractAnyStatus auto-detects Statuspage / Instatus / description-only
      // from the payload shape — no URL heuristic needed.
      const { status, message, incident, upcomingMaintenance } = extractAnyStatus(app.appName, payload);

      return {
        appId: app.id,
        status,
        checkedAt: new Date().toISOString(),
        responseTimeMs,
        message,
        ...(incident ? { incident } : {}),
        ...(upcomingMaintenance ? { upcomingMaintenance } : {}),
      };
    }

    // ── custom / fallback — treat as plain HTTP ping ───────────────────────
    return {
      appId:         app.id,
      status:        response.ok ? "operational" : "outage",
      checkedAt:     new Date().toISOString(),
      responseTimeMs,
      message:       response.ok ? `HTTP ${response.status}` : `HTTP error: ${response.status}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Self-healing: if the host is unreachable (DNS failure, connection refused),
    // the stored URL is likely stale — the vendor moved their status page.
    // Attempt auto-discovery with a 2 s budget per probe, then retry the check
    // with the new URL so this request still returns a real health result.
    if (isDnsOrConnectionError(error) && app.checkType === "statuspage_api") {
      const vendor = normalizeVendorName(app.vendorName);
      console.warn(`[SELF-HEAL] "${app.appName}" DNS failure — trying auto-discovery for vendor "${vendor}"`);
      try {
        const discovered = await discoverStatusUrl(vendor);
        if (discovered && discovered.statusUrl !== app.statusUrl) {
          console.info(`[SELF-HEAL] "${app.appName}" found new URL: ${discovered.statusUrl}`);
          const healedApp: RegisteredApp = {
            ...app,
            statusUrl:  discovered.statusUrl,
            checkType:  discovered.checkType,
          };
          const retryResult = await checkAppHealth(healedApp);
          return {
            ...retryResult,
            updatedStatusUrl:  discovered.statusUrl,
            updatedCheckType:  discovered.checkType,
          };
        }
      } catch {
        // Discovery failed — fall through to the outage result below.
      }
    }

    // AbortError = fetch timed out — the service may be fine; report degraded,
    // not outage, so a cold-start probe doesn't flash a false red status.
    const isTimeout = error instanceof Error && error.name === "AbortError";
    if (isTimeout) {
      console.warn(`[TIMEOUT] "${app.appName}" — status check timed out`);
      return {
        appId:          app.id,
        status:         "degraded" as const,
        checkedAt:      new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        message:        "Status check timed out",
      };
    }

    console.error(`[CRITICAL ERROR] "${app.appName}" | ${msg}`);
    return {
      appId:          app.id,
      status:         "outage" as const,
      checkedAt:      new Date().toISOString(),
      responseTimeMs: Date.now() - start,
      message:        msg,
    };
  }
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { apps?: unknown };
    const apps = body.apps;

    if (!Array.isArray(apps) || !apps.every(isRegisteredApp)) {
      return NextResponse.json(
        { error: "Invalid request payload. Expected { apps: RegisteredApp[] }." },
        { status: 400 },
      );
    }

    if (apps.length > MAX_APPS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many apps in a single request. Maximum is ${MAX_APPS_PER_REQUEST}.` },
        { status: 400 },
      );
    }

    if (!consumeRateBudget(clientIp(request), apps.length)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const results = await Promise.all(apps.map((app) => checkAppHealth(app)));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to process health check request." },
      { status: 500 },
    );
  }
}
