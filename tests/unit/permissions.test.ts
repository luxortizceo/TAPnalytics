import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions";

describe("can", () => {
  it("returns false for a null/undefined role", () => {
    expect(can(null, "view")).toBe(false);
    expect(can(undefined, "view")).toBe(false);
  });

  it("gives owner and superadmin the full action set", () => {
    for (const role of ["owner", "superadmin"] as const) {
      expect(can(role, "manage_billing")).toBe(true);
      expect(can(role, "delete")).toBe(true);
      expect(can(role, "manage_users")).toBe(true);
    }
  });

  it("denies admin billing management (only owner/superadmin get it)", () => {
    expect(can("admin", "manage_billing")).toBe(false);
    expect(can("admin", "manage_users")).toBe(true);
  });

  it("restricts viewer to read-only", () => {
    expect(can("viewer", "view")).toBe(true);
    expect(can("viewer", "create")).toBe(false);
    expect(can("viewer", "edit")).toBe(false);
    expect(can("viewer", "delete")).toBe(false);
  });

  it("lets employee create but not edit or export", () => {
    expect(can("employee", "create")).toBe(true);
    expect(can("employee", "edit")).toBe(false);
    expect(can("employee", "export")).toBe(false);
  });
});
