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

// ── Unified status normalizer ───────────────────────────────────────────────

/**
 * Converts raw component status strings from EITHER Statuspage OR Instatus
 * into our three-state health model.
 *
 * Statuspage uses lowercase+underscore:  "operational", "degraded_performance",
 *                                        "partial_outage", "major_outage"
 * Instatus uses UPPERCASE (no separator): "OPERATIONAL", "DEGRADED",
 *                                         "PARTIALOUTAGE", "MAJOROUTAGE"
 *
 * We normalise by lowercasing and stripping non-alpha chars before switching.
 */
function normalizeComponentStatus(raw: string): AppHealthStatus {
  const s = raw.toLowerCase().replace(/[^a-z]/g, "");
  switch (s) {
    case "operational":
    case "up":
      return "operational";
    case "degradedperformance":
    case "degraded":
      return "degraded";
    case "undermaintenance":
    case "maintenance":
      return "maintenance";
    case "partialoutage":
      return "degraded";
    case "majoroutage":
    case "outage":
    case "down":
      return "outage";
    default:
      return "degraded";
  }
}

// ── Statuspage types & helpers ──────────────────────────────────────────────

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string;
}

interface StatuspageIncident {
  name?: string;
  status?: string; // "investigating" | "identified" | "monitoring" | "resolved"
  incident_updates?: Array<{ body?: string }>;
}

interface StatuspageMaintenance {
  name?: string;
  status?: string; // "scheduled" | "in_progress" | "verifying" | "completed"
  scheduled_for?: string;
}

interface StatuspageSummary {
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
  incidents?: StatuspageIncident[];
  scheduled_maintenances?: StatuspageMaintenance[];
}

function globalFromStatuspageIndicator(indicator?: string): AppHealthStatus {
  switch (indicator) {
    case "none":        return "operational";
    case "minor":       return "degraded";
    case "major":
    case "critical":    return "outage";
    case "maintenance": return "maintenance";
    default:            return "degraded";
  }
}

/** Build a one-line incident headline: title + latest update excerpt (≤200 chars). */
function incidentHeadline(name: string, latestBody?: string): string {
  const body = latestBody?.trim() ?? "";
  return body.length > 0 && body.length <= 200 ? `${name} — ${body}` : name;
}

/** Next announced maintenance window from a Statuspage summary, if any. */
function upcomingFromStatuspage(
  payload: StatuspageSummary,
): { name: string; scheduledFor: string } | undefined {
  const upcoming = (payload.scheduled_maintenances ?? [])
    .filter((m) => m.name && m.scheduled_for && m.status === "scheduled")
    .sort((a, b) => (a.scheduled_for! < b.scheduled_for! ? -1 : 1))[0];
  return upcoming
    ? { name: upcoming.name!, scheduledFor: upcoming.scheduled_for! }
    : undefined;
}

// ── Instatus types & helpers ────────────────────────────────────────────────

interface InstatusComponent {
  id?: string;
  name?: string;
  status?: string; // "OPERATIONAL" | "DEGRADED" | "PARTIALOUTAGE" | "MAJOROUTAGE" | "UNDERMAINTENANCE"
}

interface InstatusIncident {
  name?: string;
  status?: string;
  updates?: Array<{ body?: string }>;
}

interface InstatusMaintenance {
  name?: string;
  status?: string; // "NOTSTARTEDYET" | "INPROGRESS" | "COMPLETED"
  start?: string;
}

interface InstatusSummary {
  page?: { status?: string }; // "UP" | "HASISSUES" | "UNDERMAINTENANCE"
  activeIncidents?: InstatusIncident[];
  activeMaintenances?: InstatusMaintenance[];
  components?: InstatusComponent[];
}

function globalFromInstatus(payload: InstatusSummary): AppHealthStatus {
  const hasIncidents = (payload.activeIncidents?.length ?? 0) > 0;
  if (hasIncidents) return "outage";

  const pageStatus = payload.page?.status?.toUpperCase() ?? "";
  if (pageStatus === "UP") return "operational";
  if (pageStatus === "UNDERMAINTENANCE") return "maintenance";
  return "degraded";
}

/** Next announced maintenance window from an Instatus summary, if any. */
function upcomingFromInstatus(
  payload: InstatusSummary,
): { name: string; scheduledFor: string } | undefined {
  const upcoming = (payload.activeMaintenances ?? [])
    .filter((m) => m.name && m.start && m.status?.toUpperCase() === "NOTSTARTEDYET")
    .sort((a, b) => (a.start! < b.start! ? -1 : 1))[0];
  return upcoming
    ? { name: upcoming.name!, scheduledFor: upcoming.start! }
    : undefined;
}

// ── Shared component matcher ────────────────────────────────────────────────

/**
 * Generic stop-words excluded from app-name token extraction.
 * These words are too common to be useful distinguishing tokens.
 */
const STOP_WORDS = new Set([
  "for", "the", "and", "app", "apps", "cloud", "server", "data", "by",
]);

/**
 * Platform words captured separately via the `platform` detection path.
 * Keeping them out of `appTokens` prevents a component like "BigPicture for Jira"
 * from scoring `hasToken = true` when checking the app "BigGantt for Jira" —
 * because "jira" would otherwise appear in both token sets and create a false match.
 */
const PLATFORM_WORDS = new Set(["jira", "confluence"]);

/**
 * Generic component names present on almost every status page that have
 * nothing to do with specific Marketplace apps.
 */
const GENERIC_COMPONENT_RE =
  /^(website|support\s*portal|cdn|infrastructure|blog|docs|documentation|marketing|api|all\s*systems|platform|core|status)$/i;

/**
 * Score a component name against the given app name.
 * Higher score = better match. Returns 0 when the component should be excluded.
 *
 * Rules:
 *   - A component MUST contain at least one specific app-name keyword to score
 *     above 0.  A component that only shares a platform word ("jira") with the
 *     app name is NOT a valid match and returns 0 — this prevents every
 *     "* for Jira" entry on a unified status page from being treated as relevant.
 *
 * Scoring when a keyword matches:
 *   base  +5   keyword from app name found in component name
 *   bonus +10  component also mentions the target platform ("jira"/"confluence")
 *   bonus +3   both keyword AND platform match (double-specificity reward)
 */
function scoreComponent(componentName: string, appName: string): number {
  const cn = componentName.toLowerCase();
  const nameLower = appName.toLowerCase();

  const platform =
    nameLower.includes("confluence") ? "confluence" :
    nameLower.includes("jira")       ? "jira"       : null;

  // Exclude platform words — they are captured by the `hasPlatform` path.
  // Including them in appTokens would let any component mentioning "jira"
  // incorrectly satisfy `hasToken`, producing false high scores.
  const appTokens = appName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w) && !PLATFORM_WORDS.has(w));

  const hasToken    = appTokens.some((t) => cn.includes(t));

  // Gate: no specific keyword match → not a valid component for this app.
  // Prevents "Issue Matrix for Jira" from matching when looking for "BigGantt".
  if (!hasToken) return 0;

  const hasPlatform = platform ? cn.includes(platform) : false;

  let s = 5;                              // base: specific keyword matched
  if (hasPlatform)          s += 10;     // also matches the right platform
  if (hasPlatform && hasToken) s += 3;   // double-specificity bonus

  return s;
}

/**
 * Find the component most relevant to `appName` from a list of normalised
 * components. Returns undefined when nothing scores above zero.
 */
function findBestComponent(
  appName: string,
  components: Array<{ name: string; rawStatus: string }>,
): { name: string; rawStatus: string } | undefined {
  return components
    .filter((c) => !GENERIC_COMPONENT_RE.test(c.name.trim()))
    .map((c) => ({ c, s: scoreComponent(c.name, appName) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)[0]?.c;
}

/**
 * Unified vendor status pages (e.g. Adaptavist Connect): try to bind the app to a
 * specific component by cleaned name *before* the token scorer, so a product
 * is not downgraded from another product’s component outage.
 */
const MIN_FUZZY_NAME_LEN = 3;

function normalizeForFuzzyNameMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bfor jira\b|\bfor confluence\b|\bfor bitbucket\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findFuzzyNameComponent(
  appName: string,
  components: Array<{ name: string; rawStatus: string }>,
): { name: string; rawStatus: string } | undefined {
  const clean = normalizeForFuzzyNameMatch(appName);
  if (clean.length < MIN_FUZZY_NAME_LEN) return undefined;

  const candidates = components.filter(
    (c) => !GENERIC_COMPONENT_RE.test(c.name.trim()),
  );

  for (const c of candidates) {
    const compNorm = normalizeForFuzzyNameMatch(c.name);
    if (compNorm.length < 2) continue;
    if (compNorm.includes(clean)) {
      return c;
    }
    if (clean.includes(compNorm) && compNorm.length >= 4) {
      return c;
    }
  }
  return undefined;
}

// ── Per-format extraction ───────────────────────────────────────────────────

interface ExtractedStatus {
  status: AppHealthStatus;
  message: string;
  incident?: string;
  upcomingMaintenance?: { name: string; scheduledFor: string };
}

function extractStatuspageStatus(
  appName: string,
  payload: StatuspageSummary,
): ExtractedStatus {
  const globalStatus  = globalFromStatuspageIndicator(payload.status?.indicator);
  const globalMessage = payload.status?.description ?? "Statuspage API response";

  // Incident detail + upcoming maintenance ride along on every return path —
  // the summary payload already carries them, and "Degraded" with a headline
  // is far more actionable than a bare color.
  const activeIncident = (payload.incidents ?? []).find(
    (i) => i.name && i.status && i.status !== "resolved",
  );
  const incident = activeIncident?.name
    ? incidentHeadline(activeIncident.name, activeIncident.incident_updates?.[0]?.body)
    : undefined;
  const upcomingMaintenance = upcomingFromStatuspage(payload);

  // Build group-id → group-name map so leaf components can inherit their
  // parent group name for scoring. e.g. "Synchronisation node" in the
  // "Jira Cloud" group becomes "Jira Cloud Synchronisation node", which lets
  // the platform scorer award a hasPlatform bonus for Jira apps.
  const groupNameById = new Map<string, string>();
  for (const c of payload.components ?? []) {
    if (c.group && c.id && c.name) groupNameById.set(c.id, c.name);
  }

  const components = (payload.components ?? [])
    .filter((c): c is StatuspageComponent & { name: string } =>
      Boolean(c.name) && !c.group,
    )
    .map((c) => {
      const groupName = c.group_id ? groupNameById.get(c.group_id) : undefined;
      // Skip the prefix when the component name already contains the group name
      // (e.g. group "ScriptRunner" + component "ScriptRunner for Jira Cloud") —
      // avoids duplicated tooltip text and double-counted score tokens.
      const needsPrefix =
        groupName && !c.name.toLowerCase().includes(groupName.toLowerCase());
      return {
        name: needsPrefix ? `${groupName} ${c.name}` : c.name,
        rawStatus: c.status ?? "",
      };
    });

  const fuzzy = findFuzzyNameComponent(appName, components);
  if (fuzzy?.rawStatus) {
    return {
      status: normalizeComponentStatus(fuzzy.rawStatus),
      message: `${fuzzy.name}: ${fuzzy.rawStatus.replace(/_/g, " ")}`,
      incident,
      upcomingMaintenance,
    };
  }

  const best = findBestComponent(appName, components);
  if (best?.rawStatus) {
    return {
      status: normalizeComponentStatus(best.rawStatus),
      message: `${best.name}: ${best.rawStatus.replace(/_/g, " ")}`,
      incident,
      upcomingMaintenance,
    };
  }

  // Prefer active incident name over generic component/global message
  if (incident) {
    return { status: globalStatus, message: incident, incident, upcomingMaintenance };
  }

  return { status: globalStatus, message: globalMessage, upcomingMaintenance };
}

function extractInstatusStatus(
  appName: string,
  payload: InstatusSummary,
): ExtractedStatus {
  const globalStatus = globalFromInstatus(payload);

  const components = (payload.components ?? [])
    .filter((c): c is InstatusComponent & { name: string } => Boolean(c.name))
    .map((c) => ({ name: c.name, rawStatus: c.status ?? "" }));

  const activeIncident = (payload.activeIncidents ?? []).find(
    (i) => i.name && i.status && i.status.toUpperCase() !== "RESOLVED",
  );
  const incident = activeIncident?.name
    ? incidentHeadline(activeIncident.name, activeIncident.updates?.[0]?.body)
    : undefined;
  const upcomingMaintenance = upcomingFromInstatus(payload);

  if (incident) {
    return { status: globalStatus, message: incident, incident, upcomingMaintenance };
  }

  const fuzzy = findFuzzyNameComponent(appName, components);
  if (fuzzy?.rawStatus) {
    return {
      status:  normalizeComponentStatus(fuzzy.rawStatus),
      message: `${fuzzy.name}: ${fuzzy.rawStatus}`,
      upcomingMaintenance,
    };
  }

  const best = findBestComponent(appName, components);
  if (best?.rawStatus) {
    return {
      status:  normalizeComponentStatus(best.rawStatus),
      message: `${best.name}: ${best.rawStatus}`,
      upcomingMaintenance,
    };
  }
  return {
    status:  globalStatus,
    message: `Page: ${payload.page?.status ?? "unknown"}`,
    upcomingMaintenance,
  };
}

/**
 * Normalize JSON:API / Hund.io `state` strings to our AppHealthStatus.
 * Hund uses values like "operational", "degraded", "outage", "maintenance".
 */
function normalizeJsonApiState(state: string): AppHealthStatus {
  if (state === "operational" || state === "up" || state === "ok") return "operational";
  if (state.includes("maintenance")) return "maintenance";
  if (state.includes("degraded") || state.includes("issues") || state.includes("minor")) return "degraded";
  if (state.includes("outage") || state.includes("down") || state.includes("major")) return "outage";
  return "degraded";
}

/**
 * Format-agnostic dispatcher — inspects the payload shape and picks the right
 * parser. This handles edge-case endpoints like draw.io's `index.json` whose
 * format is not predictable from the URL alone.
 *
 * Detection priority:
 *   1. Has `status.indicator`  → Atlassian Statuspage
 *   2. Has `page.status`       → Instatus
 *   3. Has `status.description`→ description-based fallback (index.json etc.)
 *   4. Default                 → degraded
 */
function extractAnyStatus(
  appName: string,
  payload: unknown,
): ExtractedStatus {
  const p = payload as Record<string, unknown>;
  const statusObj = p.status as Record<string, unknown> | undefined;
  const pageObj   = p.page   as Record<string, unknown> | undefined;

  // 1. Atlassian Statuspage — has status.indicator
  if (statusObj?.indicator !== undefined) {
    return extractStatuspageStatus(appName, payload as StatuspageSummary);
  }

  // 2. Instatus — has page.status
  if (pageObj?.status !== undefined) {
    return extractInstatusStatus(appName, payload as InstatusSummary);
  }

  // 3. Instatus export / JSON:API format (draw.io index.json)
  //    Exact schema confirmed from live payload:
  //      data.attributes.aggregate_state         — global status
  //      included[].type === "status_page_resource"
  //        .attributes.public_name               — component display name
  //        .attributes.status                    — component status string
  const dataField     = p.data     as Record<string, unknown> | undefined;
  const includedField = p.included as unknown[] | undefined;

  if (dataField !== undefined && includedField !== undefined) {
    const attrs        = dataField.attributes as Record<string, unknown> | undefined;
    const aggregateRaw = (attrs?.aggregate_state ?? attrs?.state ?? dataField.status ?? "") as string;
    const globalStatus = normalizeJsonApiState(aggregateRaw.toLowerCase());

    // Determine platform keyword for component matching
    const nameLower = appName.toLowerCase();
    const platform  =
      nameLower.includes("confluence") ? "confluence" :
      nameLower.includes("jira")       ? "jira"       : null;

    // Only look at status_page_resource entries — these are the real app components.
    // Other types (e.g. "status_page", "account") are structural metadata.
    const resources = (Array.isArray(includedField) ? includedField : []).filter(
      (item) => (item as Record<string, unknown>).type === "status_page_resource",
    );

    let matched: { name: string; status: string } | undefined;
    if (platform) {
      for (const item of resources) {
        const r     = item as Record<string, unknown>;
        const rAttr = r.attributes as Record<string, unknown> | undefined;
        const name  = (rAttr?.public_name ?? rAttr?.name ?? "") as string;
        if (name.toLowerCase().includes(platform)) {
          matched = { name, status: (rAttr?.status ?? "") as string };
          break;
        }
      }
    }

    if (matched) {
      return {
        status: normalizeJsonApiState(matched.status.toLowerCase()),
        message: `${matched.name}: ${matched.status}`,
      };
    }

    return { status: globalStatus, message: aggregateRaw || "index.json status" };
  }

  // 4. Description-only fallback (e.g. unknown hybrid schemas)
  const description = (statusObj?.description as string ?? "").toLowerCase();
  if (description) {
    const status: AppHealthStatus =
      description.includes("all systems operational") || description === "operational"
        ? "operational"
        : description.includes("degraded") || description.includes("minor")
        ? "degraded"
        : "outage";
    return { status, message: description };
  }

  // 5. Raw string scan — last resort to avoid false "Outage" when service is fine.
  const raw = JSON.stringify(p).toLowerCase();
  if (raw.includes("operational") && !raw.includes("outage") && !raw.includes("degraded")) {
    return { status: "operational", message: "All systems operational (raw scan)" };
  }

  // 6. Truly unrecognisable
  console.warn(`[status] Unrecognised payload shape for "${appName}"`);
  return { status: "degraded", message: "Unrecognised status page format" };
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
