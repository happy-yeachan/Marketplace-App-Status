import { NextResponse } from "next/server";

export const runtime = "edge";

interface AtlassianIncident {
  id: string;
  name: string;
  status: string;
  impact: string;
  shortlink: string;
  incident_updates?: Array<{ body?: string }>;
  components?: Array<{ name?: string }>;
}

interface AtlassianSummary {
  status?: { indicator?: string; description?: string };
  incidents?: AtlassianIncident[];
}

export interface AtlassianPlatformStatus {
  indicator: "none" | "minor" | "major" | "critical";
  description: string;
  incidents: Array<{
    id: string;
    name: string;
    status: string;
    impact: string;
    shortlink: string;
    latestUpdate: string;
    components: string[];
  }>;
}

export async function GET() {
  try {
    const res = await fetch("https://status.atlassian.com/api/v2/summary.json", {
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "upstream error" }, { status: res.status });
    }

    const data = (await res.json()) as AtlassianSummary;
    const raw = data.status ?? {};
    const indicator = (raw.indicator ?? "none") as AtlassianPlatformStatus["indicator"];
    const description = raw.description ?? "All Systems Operational";

    const activeIncidents = (data.incidents ?? [])
      .filter((i) => i.status !== "resolved" && i.status !== "postmortem")
      .map((i) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        impact: i.impact,
        shortlink: i.shortlink,
        latestUpdate: i.incident_updates?.[0]?.body ?? "",
        components: (i.components ?? []).map((c) => c.name ?? "").filter(Boolean),
      }));

    const payload: AtlassianPlatformStatus = { indicator, description, incidents: activeIncidents };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
