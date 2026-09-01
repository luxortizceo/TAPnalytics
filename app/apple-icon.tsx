import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ignores transparency on home-screen icons (fills it in with black),
// so this needs a fully opaque background — unlike app/icon.tsx.
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
          background: "#0a0b0d",
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 88,
          color: "#f5f6f8",
          letterSpacing: "-0.02em",
        }}
      >
        TAP<span style={{ color: "#ff3b30" }}>.</span>
      </div>
    ),
    { ...size }
  );
}
