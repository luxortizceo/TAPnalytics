import { ImageResponse } from "next/og";

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
          fontSize: 246,
          color: "#f5f6f8",
          letterSpacing: "-0.02em",
        }}
      >
        TAP<span style={{ color: "#ff3b30" }}>.</span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
