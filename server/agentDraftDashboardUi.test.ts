import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/components/GeoSphereListings.tsx"), "utf8");

describe("agent draft dashboard controls", () => {
  it("explains that agent-email signatures are appended by the mail client", () => {
    expect(dashboardSource).toContain("Signature note:");
    expect(dashboardSource).toContain("Your mail client automatically appends the complete Mike Ford signature");
    expect(dashboardSource).toContain("Your mail client adds the complete Mike Ford signature");
  });

  it("provides editable subjects and cleaned-body previews for both agent outreach workflows", () => {
    expect(dashboardSource).toContain("listingAgentDraftSubject");
    expect(dashboardSource).toContain("propertyPageAgentDraftSubjects");
    expect(dashboardSource).toContain("Agent draft subject");
    expect(dashboardSource).toContain("Agent email subject");
    expect(dashboardSource.match(/cleanupPreview=\{\{/g)).toHaveLength(2);
    expect(dashboardSource).toContain("removeDuplicateMikeFordSignatureFromTemplateBody(richEmailTemplateToText(bodyTemplate))");
  });
});
