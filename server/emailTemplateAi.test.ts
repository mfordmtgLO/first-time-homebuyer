import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const routerSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const assistantSource = readFileSync(resolve(root, "client/src/components/EmailTemplateAiAssistant.tsx"), "utf8");
const universalEditorSource = readFileSync(resolve(root, "client/src/components/UniversalEmailTemplateEditor.tsx"), "utf8");
const platformSource = readFileSync(resolve(root, "client/src/components/PlatformLeadOutreachControls.tsx"), "utf8");
const directorySource = readFileSync(resolve(root, "client/src/components/DirectoryOutreachControls.tsx"), "utf8");
const oregonSource = readFileSync(resolve(root, "client/src/components/AgentSettings.tsx"), "utf8");
const propertySource = readFileSync(resolve(root, "client/src/components/GeoSphereListings.tsx"), "utf8");

describe("owner-controlled AI email template assistance", () => {
  it("uses an owner-protected, structured server-side draft contract", () => {
    expect(routerSource).toContain("emailTemplateAi: router");
    expect(routerSource).toContain("generate: protectedProcedure");
    expect(routerSource).toContain("requireAdmin(ctx.user.role)");
    expect(routerSource).toContain("model: \"gpt-5-mini\"");
    expect(routerSource).toContain("email_template_draft");
    expect(routerSource).toContain("additionalProperties: false");
  });

  it("constrains generated copy and supports only the workflow-specific merge fields", () => {
    expect(routerSource).toContain("allowedTokens");
    expect(routerSource).toContain("Do not include a sign-off");
    expect(routerSource).toContain("rates, APR, payment quotes");
    expect(routerSource).toContain("approval or eligibility claims");
    expect(routerSource).toContain("Never invent any other token");
    expect(routerSource).toContain("platform_lead");
    expect(routerSource).toContain("platform_agent");
  });

  it("requires a user-supplied goal and applies only editable draft fields, never saving or sending automatically", () => {
    expect(assistantSource).toContain("Describe the goal, audience, and tone");
    expect(assistantSource).toContain("AI will not save, send, add a signature");
    expect(assistantSource).toContain("onApply(draft)");
    expect(assistantSource).toContain("Draft with AI");
  });

  it("adds the reusable assistant to shared editors and the separate platform lead and agent editors", () => {
    expect(universalEditorSource).toContain("EmailTemplateAiAssistant");
    expect(universalEditorSource).toContain("onSubjectChange?.(draft.subject)");
    expect(platformSource).toContain("workflow={audience === \"lead\" ? \"platform_lead\" : \"platform_agent\"}");
    expect(directorySource).toContain("subjectValue={subjectTemplate}");
    expect(oregonSource).toContain("subjectValue={templateSubject}");
    expect(propertySource).toContain("subjectValue={customPropertyPageBuyerTemplateSubject}");
  });
});
