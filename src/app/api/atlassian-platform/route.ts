import { NextResponse } from "next/server";

export const runtime = "edge";

export interface AtlassianProductStatus {
  name: string;
  indicator: "none" | "minor" | "major" | "critical";
  description: string;
}

export interface AtlassianPlatformStatus {
  overallIndicator: "none" | "minor" | "major" | "critical";
  products: AtlassianProductStatus[];
}

const INDICATOR_RANK: Record<string, number> = {
  none: 0, minor: 1, major: 2, critical: 3,
};

const PRODUCTS: Array<{ name: string; url: string }> = [
  { name: "Jira",                    url: "https://jira-software.status.atlassian.com/api/v2/status.json" },
  { name: "Jira Service Management", url: "https://jira-service-management.status.atlassian.com/api/v2/status.json" },
  { name: "Jira Work Management",    url: "https://jira-work-management.status.atlassian.com/api/v2/status.json" },
  { name: "Jira Product Discovery",  url: "https://jira-product-discovery.status.atlassian.com/api/v2/status.json" },
  { name: "Confluence",              url: "https://confluence.status.atlassian.com/api/v2/status.json" },
  { name: "Jira Align",              url: "https://jira-align.status.atlassian.com/api/v2/status.json" },
  { name: "Bitbucket",               url: "https://status.bitbucket.org/api/v2/status.json" },
  { name: "Trello",                  url: "https://www.trellostatus.com/api/v2/status.json" },
  { name: "Opsgenie",                url: "https://status.opsgenie.com/api/v2/status.json" },
  { name: "Compass",                 url: "https://compass.status.atlassian.com/api/v2/status.json" },
  { name: "Atlas",                   url: "https://atlas.status.atlassian.com/api/v2/status.json" },
  { name: "Rovo",                    url: "https://rovo.status.atlassian.com/api/v2/status.json" },
  { name: "Loom",                    url: "https://loom.status.atlassian.com/api/v2/status.json" },
  { name: "Focus",                   url: "https://focus.status.atlassian.com/api/v2/status.json" },
];

async function fetchProductStatus(name: string, url: string): Promise<AtlassianProductStatus> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { status?: { indicator?: string; description?: string } };
    const indicator = (data.status?.indicator ?? "none") as AtlassianProductStatus["indicator"];
    return { name, indicator, description: data.status?.description ?? "" };
  } catch {
    return { name, indicator: "none", description: "" };
  }
}

export async function GET() {
  const results = await Promise.all(
    PRODUCTS.map(({ name, url }) => fetchProductStatus(name, url)),
  );

  const overallIndicator = results.reduce<AtlassianProductStatus["indicator"]>((worst, p) => {
    return (INDICATOR_RANK[p.indicator] ?? 0) > (INDICATOR_RANK[worst] ?? 0) ? p.indicator : worst;
  }, "none");

  const payload: AtlassianPlatformStatus = { overallIndicator, products: results };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
