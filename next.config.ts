import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // @sparticuz/chromium ships the actual Chromium binary under bin/ — it
  // must stay external (not bundled/relocated by Turbopack) and its binary
  // assets have to be explicitly traced in, since Next's file tracer only
  // follows require()/import calls and this package reads bin/ from disk
  // at runtime instead. See app/app/reportes/export/pdf/route.ts.
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/app/reportes/export/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
