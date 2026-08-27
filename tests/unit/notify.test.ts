import { describe, it, expect } from "vitest";
import { isAllowedPushEndpoint } from "@/lib/notify";

describe("isAllowedPushEndpoint", () => {
  it("allows real browser push-service endpoints", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc123")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/xyz")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/some-id")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-abc.notify.windows.com/w/?token=x")).toBe(true);
  });

  it("rejects an internal/private URL (SSRF attempt)", () => {
    expect(isAllowedPushEndpoint("https://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedPushEndpoint("https://internal-admin.local/hook")).toBe(false);
    expect(isAllowedPushEndpoint("http://localhost:8080/")).toBe(false);
  });

  it("rejects non-https endpoints", () => {
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc123")).toBe(false);
  });

  it("rejects a lookalike domain", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.example/")).toBe(false);
  });

  it("rejects a malformed URL instead of throwing", () => {
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });
});
