import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hashIp, parseUserAgent, isLikelyBot } from "@/lib/tracking";

describe("hashIp", () => {
  const ORIGINAL_SECRET = process.env.IP_HASH_SECRET;

  beforeEach(() => {
    process.env.IP_HASH_SECRET = "test-secret";
  });
  afterEach(() => {
    process.env.IP_HASH_SECRET = ORIGINAL_SECRET;
  });

  it("never returns the raw IP", () => {
    const hash = hashIp("203.0.113.42");
    expect(hash).not.toContain("203.0.113.42");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same IP within the same month", () => {
    expect(hashIp("203.0.113.42")).toBe(hashIp("203.0.113.42"));
  });

  it("differs for different IPs", () => {
    expect(hashIp("203.0.113.42")).not.toBe(hashIp("203.0.113.43"));
  });

  it("differs when the secret changes (rotation)", () => {
    const withFirstSecret = hashIp("203.0.113.42");
    process.env.IP_HASH_SECRET = "a-different-secret";
    expect(hashIp("203.0.113.42")).not.toBe(withFirstSecret);
  });
});

describe("parseUserAgent", () => {
  it("detects a mobile Chrome on Android", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36";
    const result = parseUserAgent(ua);
    expect(result.device_type).toBe("mobile");
    expect(result.os).toBe("Android");
    expect(result.browser).toBe("Chrome");
  });

  it("detects an iPad as a tablet running iOS Safari", () => {
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1";
    const result = parseUserAgent(ua);
    expect(result.device_type).toBe("tablet");
    expect(result.os).toBe("iOS");
    expect(result.browser).toBe("Safari");
  });

  it("detects desktop Firefox on Windows", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0";
    const result = parseUserAgent(ua);
    expect(result.device_type).toBe("desktop");
    expect(result.os).toBe("Windows");
    expect(result.browser).toBe("Firefox");
  });

  it("degrades gracefully with a null/empty user agent", () => {
    const result = parseUserAgent(null);
    expect(result.device_type).toBe("other");
    expect(result.os).toBeNull();
    expect(result.browser).toBeNull();
  });
});

describe("isLikelyBot", () => {
  it("flags a missing user agent as a bot", () => {
    expect(isLikelyBot(null)).toBe(true);
  });

  it("flags known crawler patterns", () => {
    expect(isLikelyBot("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isLikelyBot("curl/8.4.0")).toBe(true);
    expect(isLikelyBot("python-requests/2.31")).toBe(true);
  });

  it("does not flag an ordinary browser", () => {
    expect(
      isLikelyBot(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
      )
    ).toBe(false);
  });
});
