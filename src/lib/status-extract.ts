// Pure status-payload parsing — extracted from the /api/status route so the
// matching/extraction logic is unit-testable without an HTTP layer.
//
// Everything in this module is a pure function of (appName, payload); no
// fetch, no rate limiting, no self-healing. Those stay in the route.

import type { AppHealthStatus } from "@/types";

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
export function normalizeComponentStatus(raw: string): AppHealthStatus {
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

export interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string;
}

export interface StatuspageIncident {
  name?: string;
  status?: string; // "investigating" | "identified" | "monitoring" | "resolved"
  incident_updates?: Array<{ body?: string }>;
}

export interface StatuspageMaintenance {
  name?: string;
  status?: string; // "scheduled" | "in_progress" | "verifying" | "completed"
  scheduled_for?: string;
}

export interface StatuspageSummary {
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
  incidents?: StatuspageIncident[];
  scheduled_maintenances?: StatuspageMaintenance[];
}

export function globalFromStatuspageIndicator(indicator?: string): AppHealthStatus {
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
export function incidentHeadline(name: string, latestBody?: string): string {
  const body = latestBody?.trim() ?? "";
  return body.length > 0 && body.length <= 200 ? `${name} — ${body}` : name;
}

/** Next announced maintenance window from a Statuspage summary, if any. */
export function upcomingFromStatuspage(
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

export interface InstatusComponent {
  id?: string;
  name?: string;
  status?: string; // "OPERATIONAL" | "DEGRADED" | "PARTIALOUTAGE" | "MAJOROUTAGE" | "UNDERMAINTENANCE"
}

export interface InstatusIncident {
  name?: string;
  status?: string;
  updates?: Array<{ body?: string }>;
}

export interface InstatusMaintenance {
  name?: string;
  status?: string; // "NOTSTARTEDYET" | "INPROGRESS" | "COMPLETED"
  start?: string;
}

export interface InstatusSummary {
  page?: { status?: string }; // "UP" | "HASISSUES" | "UNDERMAINTENANCE"
  activeIncidents?: InstatusIncident[];
  activeMaintenances?: InstatusMaintenance[];
  components?: InstatusComponent[];
}

export function globalFromInstatus(payload: InstatusSummary): AppHealthStatus {
  const hasIncidents = (payload.activeIncidents?.length ?? 0) > 0;
  if (hasIncidents) return "outage";

  const pageStatus = payload.page?.status?.toUpperCase() ?? "";
  if (pageStatus === "UP") return "operational";
  if (pageStatus === "UNDERMAINTENANCE") return "maintenance";
  return "degraded";
}

/** Next announced maintenance window from an Instatus summary, if any. */
export function upcomingFromInstatus(
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
export function scoreComponent(componentName: string, appName: string): number {
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
export function findBestComponent(
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

export function findFuzzyNameComponent(
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

export interface ExtractedStatus {
  status: AppHealthStatus;
  message: string;
  incident?: string;
  upcomingMaintenance?: { name: string; scheduledFor: string };
}

export function extractStatuspageStatus(
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

export function extractInstatusStatus(
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
export function normalizeJsonApiState(state: string): AppHealthStatus {
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
export function extractAnyStatus(
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

