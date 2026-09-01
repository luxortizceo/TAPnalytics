import { ImageResponse } from "next/og";

// Dedicated route (rather than the app/icon.tsx convention) so
// app/manifest.ts can reference a fixed, known URL for this exact size —
// PWA install prompts on Android read icon sizes straight from the
// manifest, unlike the favicon/apple-touch-icon conventions.
export async function GET() {
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
          fontSize: 92,
          color: "#f5f6f8",
          letterSpacing: "-0.02em",
        }}
      >
        TAP<span style={{ color: "#ff3b30" }}>.</span>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
