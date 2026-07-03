import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractAnyStatus,
  extractInstatusStatus,
  extractStatuspageStatus,
  globalFromStatuspageIndicator,
  incidentHeadline,
  normalizeComponentStatus,
  normalizeJsonApiState,
  scoreComponent,
  upcomingFromInstatus,
  upcomingFromStatuspage,
  type InstatusSummary,
  type StatuspageSummary,
} from "@/lib/status-extract";

// Real vendor payloads captured 2026-07-04 — deterministic snapshots, not live.
function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(join(__dirname, "fixtures", name), "utf8"),
  ) as T;
}

// ── normalizeComponentStatus ──────────────────────────────────────────────────

describe("normalizeComponentStatus", () => {
  it("maps Statuspage lowercase+underscore tokens", () => {
    expect(normalizeComponentStatus("operational")).toBe("operational");
    expect(normalizeComponentStatus("degraded_performance")).toBe("degraded");
    expect(normalizeComponentStatus("partial_outage")).toBe("degraded");
    expect(normalizeComponentStatus("major_outage")).toBe("outage");
    expect(normalizeComponentStatus("under_maintenance")).toBe("maintenance");
  });

  it("maps Instatus UPPERCASE tokens", () => {
    expect(normalizeComponentStatus("OPERATIONAL")).toBe("operational");
    expect(normalizeComponentStatus("DEGRADEDPERFORMANCE")).toBe("degraded");
    expect(normalizeComponentStatus("PARTIALOUTAGE")).toBe("degraded");
    expect(normalizeComponentStatus("MAJOROUTAGE")).toBe("outage");
    expect(normalizeComponentStatus("UNDERMAINTENANCE")).toBe("maintenance");
  });

  it("falls back to degraded for unknown tokens", () => {
    expect(normalizeComponentStatus("weird_new_state")).toBe("degraded");
  });
});

describe("globalFromStatuspageIndicator", () => {
  it("maps all indicator values incl. maintenance", () => {
    expect(globalFromStatuspageIndicator("none")).toBe("operational");
    expect(globalFromStatuspageIndicator("minor")).toBe("degraded");
    expect(globalFromStatuspageIndicator("major")).toBe("outage");
    expect(globalFromStatuspageIndicator("critical")).toBe("outage");
    expect(globalFromStatuspageIndicator("maintenance")).toBe("maintenance");
    expect(globalFromStatuspageIndicator(undefined)).toBe("degraded");
  });
});

describe("normalizeJsonApiState", () => {
  it("maps maintenance before degraded/outage substring checks", () => {
    expect(normalizeJsonApiState("under_maintenance")).toBe("maintenance");
    expect(normalizeJsonApiState("operational")).toBe("operational");
    expect(normalizeJsonApiState("degraded")).toBe("degraded");
    expect(normalizeJsonApiState("major_outage")).toBe("outage");
  });
});

// ── Component scoring — the BigGantt/BigPicture false-positive guard ─────────

describe("scoreComponent", () => {
  it("returns 0 when only a platform word is shared (BigPicture vs BigGantt)", () => {
    expect(scoreComponent("BigPicture for Jira", "BigGantt for Jira")).toBe(0);
  });

  it("scores a real keyword match above 0", () => {
    expect(scoreComponent("BigGantt for Jira", "BigGantt for Jira")).toBeGreaterThan(0);
  });
});

// ── Statuspage extraction (real Adaptavist payload) ───────────────────────────

describe("extractStatuspageStatus — Adaptavist unified page", () => {
  const payload = fixture<StatuspageSummary>("adaptavist-summary.json");

  it("matches the ScriptRunner component without duplicating the group prefix", () => {
    const r = extractStatuspageStatus("ScriptRunner for Jira", payload);
    expect(r.message).toBe("ScriptRunner for Jira Cloud: operational");
    // regression guard: group "ScriptRunner" must not be prepended to a
    // component that already contains it
    expect(r.message).not.toMatch(/ScriptRunner ScriptRunner/);
  });

  it("matches a different app on the same unified page to its own component", () => {
    const r = extractStatuspageStatus("Hierarchy for Jira", payload);
    expect(r.message).toContain("Hierarchy for Jira");
  });
});

// ── Statuspage extraction (real Tempo payload with an active incident) ───────

describe("extractStatuspageStatus — Tempo with active incident", () => {
  const payload = fixture<StatuspageSummary>("tempo-summary.json");

  it("attaches the incident headline even when the matched component is fine", () => {
    const r = extractStatuspageStatus("Timesheets by Tempo", payload);
    expect(r.status).toBe("operational");
    expect(r.message).toBe("Timesheets: operational");
    expect(r.incident).toContain("Forge Migration Update");
  });
});

// ── Statuspage extraction (synthetic) ─────────────────────────────────────────

describe("extractStatuspageStatus — synthetic cases", () => {
  it("prepends the group name when the component name does not contain it", () => {
    const payload: StatuspageSummary = {
      status: { indicator: "none" },
      components: [
        { id: "g1", name: "AppX", group: true },
        { id: "c1", name: "Sync Node", status: "degraded_performance", group_id: "g1" },
      ],
    };
    const r = extractStatuspageStatus("AppX", payload);
    expect(r.status).toBe("degraded");
    expect(r.message).toBe("AppX Sync Node: degraded performance");
  });

  it("reports maintenance as its own status, not degraded", () => {
    const payload: StatuspageSummary = {
      status: { indicator: "maintenance" },
      components: [{ id: "c1", name: "AppY", status: "under_maintenance" }],
    };
    const r = extractStatuspageStatus("AppY", payload);
    expect(r.status).toBe("maintenance");
    expect(r.message).toBe("AppY: under maintenance");
  });

  it("surfaces the next scheduled maintenance window", () => {
    const payload: StatuspageSummary = {
      status: { indicator: "none" },
      components: [{ id: "c1", name: "AppZ", status: "operational" }],
      scheduled_maintenances: [
        { name: "Later window", status: "scheduled", scheduled_for: "2026-08-02T00:00:00Z" },
        { name: "Earlier window", status: "scheduled", scheduled_for: "2026-08-01T00:00:00Z" },
        { name: "Already running", status: "in_progress", scheduled_for: "2026-07-01T00:00:00Z" },
      ],
    };
    const r = extractStatuspageStatus("AppZ", payload);
    expect(r.upcomingMaintenance).toEqual({
      name: "Earlier window",
      scheduledFor: "2026-08-01T00:00:00Z",
    });
  });
});

describe("upcoming maintenance pickers", () => {
  it("Statuspage: ignores non-scheduled entries", () => {
    expect(upcomingFromStatuspage({ scheduled_maintenances: [
      { name: "X", status: "in_progress", scheduled_for: "2026-07-01T00:00:00Z" },
    ] })).toBeUndefined();
  });

  it("Instatus: only NOTSTARTEDYET counts", () => {
    expect(upcomingFromInstatus({ activeMaintenances: [
      { name: "Y", status: "INPROGRESS", start: "2026-07-01" },
      { name: "Z", status: "NOTSTARTEDYET", start: "2026-08-01" },
    ] })).toEqual({ name: "Z", scheduledFor: "2026-08-01" });
  });
});

describe("incidentHeadline", () => {
  it("appends a short latest-update body", () => {
    expect(incidentHeadline("API outage", "We are investigating.")).toBe(
      "API outage — We are investigating.",
    );
  });

  it("drops empty or oversized bodies", () => {
    expect(incidentHeadline("API outage", "")).toBe("API outage");
    expect(incidentHeadline("API outage", "x".repeat(201))).toBe("API outage");
  });
});

// ── Instatus extraction ───────────────────────────────────────────────────────

describe("extractInstatusStatus", () => {
  it("real Oboard payload: page-only UP → operational", () => {
    const payload = fixture<InstatusSummary>("oboard-instatus-summary.json");
    const r = extractInstatusStatus("OKR Board for Jira", payload);
    expect(r.status).toBe("operational");
    expect(r.message).toBe("Page: UP");
  });

  it("UNDERMAINTENANCE page → maintenance", () => {
    const r = extractInstatusStatus("AnyApp", { page: { status: "UNDERMAINTENANCE" } });
    expect(r.status).toBe("maintenance");
  });

  it("active incident → outage with incident headline", () => {
    const r = extractInstatusStatus("AnyApp", {
      page: { status: "HASISSUES" },
      activeIncidents: [
        { name: "DB failover", status: "INVESTIGATING", updates: [{ body: "Failover in progress" }] },
      ],
    });
    expect(r.status).toBe("outage");
    expect(r.incident).toBe("DB failover — Failover in progress");
    expect(r.message).toBe(r.incident);
  });
});

// ── Format-agnostic dispatcher ────────────────────────────────────────────────

describe("extractAnyStatus", () => {
  it("real draw.io index.json (JSON:API) → platform component match", () => {
    const payload = fixture<unknown>("drawio-index.json");
    const r = extractAnyStatus("draw.io Diagrams for Confluence", payload);
    expect(r.status).toBe("operational");
    expect(r.message).toContain("draw.io for Confluence Cloud standard");
  });

  it("description-only fallback", () => {
    const r = extractAnyStatus("X", { status: { description: "All Systems Operational" } });
    expect(r.status).toBe("operational");
  });

  it("raw string scan: operational without outage words", () => {
    const r = extractAnyStatus("X", { anything: "operational" });
    expect(r.status).toBe("operational");
  });

  it("unrecognisable payload → degraded, never a false outage", () => {
    const r = extractAnyStatus("X", { foo: "bar" });
    expect(r.status).toBe("degraded");
    expect(r.message).toBe("Unrecognised status page format");
  });
});
