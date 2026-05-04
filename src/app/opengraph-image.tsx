import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Marketplace App Status — Real-time Jira & Confluence App Health";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 6,
              height: 64,
            }}
          >
            <div style={{ width: 14, height: 24, background: "#22c55e", borderRadius: 3 }} />
            <div style={{ width: 14, height: 40, background: "#22c55e", borderRadius: 3 }} />
            <div style={{ width: 14, height: 56, background: "#22c55e", borderRadius: 3 }} />
            <div
              style={{
                width: 14,
                height: 14,
                background: "#22c55e",
                borderRadius: 7,
                marginLeft: 4,
                marginBottom: 42,
              }}
            />
          </div>
          <span style={{ fontSize: 32, fontWeight: 600, color: "#94a3b8" }}>
            Marketplace App Status
          </span>
        </div>

        <h1
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            margin: 0,
            maxWidth: 1000,
          }}
        >
          Real-time service health for Jira & Confluence apps.
        </h1>

        <p style={{ fontSize: 26, color: "#94a3b8", marginTop: 28, maxWidth: 980 }}>
          ScriptRunner, Tempo, Zephyr, draw.io and hundreds more — one dashboard, no login.
        </p>
      </div>
    ),
    size,
  );
}
