import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/email";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'quote'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39;"
    );
  });

  it("neutralizes an <img onerror> injection attempt", () => {
    const malicious = `<img src=x onerror="fetch('https://evil.example')">`;
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain("<img");
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("El baño estaba sucio, tardaron 40 minutos.")).toBe(
      "El baño estaba sucio, tardaron 40 minutos."
    );
  });

  it("handles an empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});
