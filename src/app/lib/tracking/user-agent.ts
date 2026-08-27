import type { DeviceType } from "@/lib/supabase/types";

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
