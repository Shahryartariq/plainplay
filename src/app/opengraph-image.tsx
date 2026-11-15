import { ImageResponse } from "next/og";

export const alt = "Plainplay: YouTube without the rabbit hole";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "#f6f6f2",
          color: "#15171a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 88, height: 88, borderRadius: 26, background: "#2a6a54", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="48" height="48" viewBox="0 0 32 32">
              <path d="M11 7.6v16.8a1.2 1.2 0 0 0 1.8 1l13.4-8.4a1.2 1.2 0 0 0 0-2L12.8 6.6a1.2 1.2 0 0 0-1.8 1Z" fill="#fff" />
            </svg>
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>plainplay</div>
        </div>
        <div style={{ fontSize: 52, marginTop: 56, fontWeight: 600, letterSpacing: -1 }}>YouTube without the rabbit hole.</div>
        <div style={{ fontSize: 32, marginTop: 20, color: "#55595f" }}>
          Search and watch. No feed, no recommendations, no comments.
        </div>
      </div>
    ),
    size,
  );
}
