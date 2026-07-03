import { describe, expect, it } from "vitest";
import { decodeSharePayload, encodeSharePayload } from "@/lib/share";
import type { RegisteredApp } from "@/types";

// Node ≥18 provides btoa/atob/CompressionStream/crypto.randomUUID globally,
// so the browser-targeted codec runs unmodified here.

const APPS: RegisteredApp[] = [
  {
    id: "com.onresolve.jira.groovy.groovyrunner",
    appName: "ScriptRunner for Jira",
    vendorName: "Adaptavist",
    statusUrl: "https://status.connect.adaptavist.com/api/v2/summary.json",
    checkType: "statuspage_api",
    logoUrl:
      "https://marketplace.atlassian.com/product-listing/files/8fc3e186-52e7-4e4a-9a15-a01e19c0a0d0?width=72&height=72",
  },
  {
    id: "custom-1",
    appName: "Internal Tool",
    vendorName: "ACME",
    statusUrl: "",
    checkType: "custom",
  },
];

describe("share payload codec", () => {
  it("v3 roundtrip preserves every field (incl. compressed URL + logo asset id)", async () => {
    const payload = await encodeSharePayload(APPS);
    expect(payload.startsWith("z:")).toBe(true);
    const decoded = await decodeSharePayload(payload);
    expect(decoded).toEqual(APPS);
  });

  it("decodes v1 legacy links (plain base64url JSON objects)", async () => {
    const v1 = Buffer.from(
      JSON.stringify([
        { i: "a1", n: "Legacy App", v: "Old Vendor", u: "https://status.x.com/api/v2/status.json", t: "statuspage_api" },
      ]),
      "utf8",
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const decoded = await decodeSharePayload(v1);
    expect(decoded).toHaveLength(1);
    expect(decoded![0]).toMatchObject({
      id: "a1",
      appName: "Legacy App",
      statusUrl: "https://status.x.com/api/v2/status.json",
      checkType: "statuspage_api",
    });
  });

  it("returns null for corrupted payloads instead of throwing", async () => {
    expect(await decodeSharePayload("z:THIS_IS_NOT_VALID%%%")).toBeNull();
    expect(await decodeSharePayload("!!!not-base64!!!")).toBeNull();
    // truncated v3 payload — the messenger-cut-the-URL case
    const full = await encodeSharePayload(APPS);
    expect(await decodeSharePayload(full.slice(0, full.length - 10))).toBeNull();
  });

  it("returns null for an empty app list", async () => {
    const payload = await encodeSharePayload([]);
    expect(await decodeSharePayload(payload)).toBeNull();
  });
});
