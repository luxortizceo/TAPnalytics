import { describe, it, expect } from "vitest";
import { confidenceFor, satisfactionScore } from "@/lib/intelligence";

describe("confidenceFor", () => {
  it("starts at a 0.35 floor with no samples", () => {
    expect(confidenceFor(0)).toBe(0.35);
  });

  it("grows with sample size up to the 20-sample cap", () => {
    expect(confidenceFor(5)).toBeCloseTo(0.5, 5);
    expect(confidenceFor(20)).toBeCloseTo(0.95, 5);
  });

  it("never exceeds the 0.95 ceiling, even far past the cap", () => {
    expect(confidenceFor(20)).toBe(confidenceFor(1000));
    expect(confidenceFor(1000)).toBeLessThanOrEqual(0.95);
  });

  it("is a transparent heuristic, not a real statistical confidence interval", () => {
    // Documents the intent: this must stay monotonic and bounded in
    // [0.35, 0.95], not swing wildly, so the UI can present it honestly.
    const values = [0, 1, 3, 5, 10, 20].map(confidenceFor);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });
});

describe("satisfactionScore", () => {
  it("returns null with no rated responses", () => {
    expect(satisfactionScore({ bad: 0, good: 0, excellent: 0 })).toBeNull();
  });

  it("scores all-excellent as 100", () => {
    expect(satisfactionScore({ bad: 0, good: 0, excellent: 10 })).toBe(100);
  });

  it("scores all-bad as 0", () => {
    expect(satisfactionScore({ bad: 5, good: 0, excellent: 0 })).toBe(0);
  });

  it("weights good responses at half of excellent", () => {
    // (1 excellent * 1 + 2 good * 0.5) / 4 total * 100 = 50
    expect(satisfactionScore({ bad: 1, good: 2, excellent: 1 })).toBe(50);
  });
});
