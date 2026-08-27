import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * We never persist a raw IP address. Instead we hash it with a secret salt
 * that rotates monthly (the period is folded into the hash input), so the
 * hash is stable enough for short-lived abuse/duplicate detection but isn't
 * a permanent, indefinitely-correlatable identifier.
 */
export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET ?? "tapnalytics-dev-secret-change-me";
  const period = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  return createHash("sha256").update(`${secret}:${period}:${ip}`).digest("hex");
}

export function getClientIp(request: NextRequest): string {
  // Standard proxy/edge headers, in order of trust for a typical
  // reverse-proxy deployment (Vercel, etc.). Falls back to a constant so a
  // missing header degrades to "no rate limiting" rather than a crash.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function getApproxGeo(request: NextRequest) {
  return {
    country: request.headers.get("x-vercel-ip-country"),
    region: request.headers.get("x-vercel-ip-country-region"),
    city: request.headers.get("x-vercel-ip-city")
      ? decodeURIComponent(request.headers.get("x-vercel-ip-city")!)
      : null,
  };
}
