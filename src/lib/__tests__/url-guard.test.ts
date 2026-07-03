import { describe, expect, it } from "vitest";
import { guardOutboundUrl, redactUrl } from "@/lib/url-guard";

describe("guardOutboundUrl", () => {
  it("allows public https/http hosts", () => {
    expect(guardOutboundUrl("https://status.example.com/api/v2/status.json").ok).toBe(true);
    expect(guardOutboundUrl("http://8.8.8.8/status").ok).toBe(true);
  });

  it("rejects non-http(s) schemes", () => {
    expect(guardOutboundUrl("file:///etc/passwd").ok).toBe(false);
    expect(guardOutboundUrl("gopher://evil").ok).toBe(false);
  });

  it("rejects loopback and private hostnames", () => {
    expect(guardOutboundUrl("http://localhost:3000/x").ok).toBe(false);
    expect(guardOutboundUrl("http://internal.corp.lan/x").ok).toBe(false);
    expect(guardOutboundUrl("http://db.internal/x").ok).toBe(false);
  });

  it("rejects private / link-local / CGNAT IPv4 literals", () => {
    for (const host of [
      "127.0.0.1", "10.1.2.3", "169.254.169.254", "172.16.0.1",
      "192.168.1.1", "100.64.0.1", "0.0.0.0", "224.0.0.1",
    ]) {
      expect(guardOutboundUrl(`http://${host}/x`).ok, host).toBe(false);
    }
  });

  it("rejects private IPv6 incl. IPv4-mapped loopback", () => {
    for (const host of ["[::1]", "[fe80::1]", "[fd00::1]", "[::ffff:127.0.0.1]"]) {
      expect(guardOutboundUrl(`http://${host}/x`).ok, host).toBe(false);
    }
  });

  it("rejects malformed URLs", () => {
    expect(guardOutboundUrl("not a url").ok).toBe(false);
    expect(guardOutboundUrl("").ok).toBe(false);
  });
});

describe("redactUrl", () => {
  it("keeps scheme + host, drops path/query", () => {
    expect(redactUrl("https://status.x.com/secret/path?token=abc")).toBe("https://status.x.com");
    expect(redactUrl("garbage")).toBe("[invalid-url]");
  });
});
