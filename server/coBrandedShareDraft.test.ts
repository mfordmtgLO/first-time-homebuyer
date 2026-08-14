import { describe, expect, it } from "vitest";
import { buildCoBrandedShareMailto } from "../shared/coBrandedShareDraft";

describe("buildCoBrandedShareMailto", () => {
  it("creates an editable co-branded sharing draft with the agent's first name and URL", () => {
    const mailto = buildCoBrandedShareMailto({ agentName: "Jane Doe", agentEmail: "jane@example.com", url: "https://example.com/with/jane-doe" });
    const draft = decodeURIComponent(mailto);

    expect(draft).toContain("mailto:jane@example.com");
    expect(draft).toContain("Hi Jane,");
    expect(draft).toContain("https://example.com/with/jane-doe");
    expect(draft).toContain("QR code is available in the dashboard");
    expect(draft).toContain("associated with your profile");
  });
});
