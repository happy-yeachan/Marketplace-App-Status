// Client-side status helpers shared by the main dashboard and the embed view.

import type {
  AppHealthStatus,
  HealthCheckResponse,
  RegisteredApp,
} from "@/types";

const STATUS_BATCH_SIZE = 50; // must match MAX_APPS_PER_REQUEST on the server

export async function fetchStatusBatched(apps: RegisteredApp[]): Promise<HealthCheckResponse | null> {
  if (apps.length === 0) return null;
  const chunks: RegisteredApp[][] = [];
  for (let i = 0; i < apps.length; i += STATUS_BATCH_SIZE) {
    chunks.push(apps.slice(i, i + STATUS_BATCH_SIZE));
  }
  const responses = await Promise.all(
    chunks.map((chunk) =>
      fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apps: chunk }),
      })
        .then((r) => (r.ok ? (r.json() as Promise<HealthCheckResponse>) : null))
        .catch(() => null),
    ),
  );
  const results = responses.flatMap((r) => r?.results ?? []);
  return results.length > 0 ? { results } : null;
}

export const STATUS_TEXT_CLASS: Record<AppHealthStatus, string> = {
  operational: "text-emerald-600",
  degraded: "text-amber-600",
  outage: "text-red-600",
  maintenance: "text-blue-600",
};

/**
 * Derive the public status page URL from the status API endpoint.
 * Handles both Atlassian Statuspage (/api/v2/status.json or /api/v2/summary.json)
 * and Instatus (/summary.json) formats.
 */
export function toStatusPageUrl(statusUrl: string): string | null {
  if (!statusUrl) return null;
  const base = statusUrl.replace(/\/api\/v2\/(status|summary)\.json$|\/summary\.json$|\/index\.json$/g, "");
  return base || null;
}

// ── Vendor raw-status localization ─────────────────────────────────────────────
// Server messages end in a raw vendor status token, e.g.
// "ScriptRunner for Jira Cloud: degraded performance". Translate the known
// Statuspage/Instatus tokens so they don't appear as raw English inside a
// localized UI; unknown suffixes (incident titles etc.) pass through untouched.

const KNOWN_RAW_STATUSES = new Set([
  "operational",
  "degradedperformance",
  "partialoutage",
  "majoroutage",
  "undermaintenance",
]);

export function localizeStatusMessage(
  message: string,
  t: (key: string) => string,
): string {
  const m = message.match(/^(.+):\s*([A-Za-z][A-Za-z _-]*)$/);
  if (!m) return message;
  const token = m[2].trim().toLowerCase().replace(/[\s_-]+/g, "");
  return KNOWN_RAW_STATUSES.has(token)
    ? `${m[1]}: ${t(`rawStatus.${token}`)}`
    : message;
}
