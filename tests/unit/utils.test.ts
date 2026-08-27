import { describe, it, expect } from "vitest";
import { cn, generatePublicCode } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", undefined, false, "font-bold")).toBe("text-sm font-bold");
  });
});

describe("generatePublicCode", () => {
  it("generates an uppercase, URL-safe, fixed-length code", () => {
    const code = generatePublicCode();
    expect(code).toHaveLength(10);
    expect(code).toMatch(/^[A-Z0-9X]+$/);
    expect(code).toBe(code.toUpperCase());
  });

  it("never contains characters that need escaping in a URL path", () => {
    for (let i = 0; i < 50; i++) {
      const code = generatePublicCode();
      expect(code).not.toMatch(/[_\-/]/);
    }
  });

  it("is not sequential/predictable across calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generatePublicCode()));
    expect(codes.size).toBe(20);
  });
});
