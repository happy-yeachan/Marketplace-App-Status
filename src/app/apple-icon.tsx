import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          borderRadius: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110 }}>
          <div style={{ width: 22, height: 38, background: "#22c55e", borderRadius: 6 }} />
          <div style={{ width: 22, height: 70, background: "#22c55e", borderRadius: 6 }} />
          <div style={{ width: 22, height: 100, background: "#22c55e", borderRadius: 6 }} />
          <div
            style={{
              width: 22,
              height: 22,
              background: "#22c55e",
              borderRadius: 11,
              marginLeft: 6,
              marginBottom: 76,
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
