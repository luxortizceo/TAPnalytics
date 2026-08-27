import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import type { DeviceType } from "@/lib/supabase/types";

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

/**
 * Cheap, dependency-free User-Agent parsing. Good enough for the coarse
 * device/OS/browser buckets the dashboard shows — not a fingerprinting
 * library, and intentionally doesn't try to be one.
 */
export function parseUserAgent(userAgent: string | null) {
  const ua = userAgent ?? "";

  let device_type: DeviceType = "other";
  if (/mobile|iphone|android.*mobile/i.test(ua) && !/ipad|tablet/i.test(ua)) {
    device_type = "mobile";
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(ua)) {
    device_type = "tablet";
  } else if (/windows|macintosh|linux/i.test(ua)) {
    device_type = "desktop";
  }

  let os: string | null = null;
  if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser: string | null = null;
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = "Chrome";
  else if (/crios\//i.test(ua)) browser = "Chrome";
  else if (/fxios\//i.test(ua) || /firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome|chromium|crios/i.test(ua)) browser = "Safari";

  return { device_type, os, browser };
}

const BOT_UA_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|curl|wget|python-requests|headlesschrome/i;

export function isLikelyBot(userAgent: string | null) {
  if (!userAgent) return true;
  return BOT_UA_PATTERN.test(userAgent);
}
