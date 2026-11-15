import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2a6a54" }}>
        <svg width="96" height="96" viewBox="0 0 32 32">
          <path d="M11 7.6v16.8a1.2 1.2 0 0 0 1.8 1l13.4-8.4a1.2 1.2 0 0 0 0-2L12.8 6.6a1.2 1.2 0 0 0-1.8 1Z" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
