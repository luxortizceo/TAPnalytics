import { describe, it, expect } from "vitest";
import { resolvePeriod } from "@/lib/date-ranges";

describe("resolvePeriod", () => {
  it("defaults to today when no period is given", () => {
    const { key, start, end } = resolvePeriod(undefined, undefined, undefined);
    expect(key).toBe("today");
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getTime()).toBeGreaterThanOrEqual(start.getTime());
  });

  it("resolves yesterday as a full day ending at today's midnight", () => {
    const { key, start, end } = resolvePeriod("yesterday", undefined, undefined);
    expect(key).toBe("yesterday");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("resolves 7d and 30d as rolling windows ending now", () => {
    const sevenDays = resolvePeriod("7d", undefined, undefined);
    expect(sevenDays.key).toBe("7d");
    expect(sevenDays.end.getTime() - sevenDays.start.getTime()).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -2);

    const thirtyDays = resolvePeriod("30d", undefined, undefined);
    expect(thirtyDays.key).toBe("30d");
    expect(thirtyDays.end.getTime() - thirtyDays.start.getTime()).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -2);
  });

  it("accepts a valid custom range", () => {
    const { key, start, end } = resolvePeriod("custom", "2026-01-01", "2026-01-31");
    expect(key).toBe("custom");
    expect(start.getFullYear()).toBe(2026);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("falls back to today when the custom range is inverted", () => {
    const { key } = resolvePeriod("custom", "2026-02-01", "2026-01-01");
    expect(key).toBe("today");
  });

  it("falls back to today when custom dates are missing", () => {
    const { key } = resolvePeriod("custom", undefined, undefined);
    expect(key).toBe("today");
  });
});
