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
const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");

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
    expect(assistantSource).toContain("setProposedDraft(draft)");
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

  it("stores quick-select prompt options privately per owner and exposes only protected prompt operations", () => {
    expect(schemaSource).toContain('"email_template_ai_prompt"');
    expect(schemaSource).toContain("email_template_ai_prompt_owner_name_unique");
    expect(dbSource).toContain("listEmailTemplateAiPrompts");
    expect(dbSource).toContain("createEmailTemplateAiPrompt");
    expect(dbSource).toContain("deleteEmailTemplateAiPrompt");
    expect(routerSource).toContain("emailTemplateAi: router({\n    prompts: router");
    expect(routerSource).toContain("A saved prompt with that name already exists.");
  });

  it("shows a status while writing, then offers controlled regeneration and saved-prompt selection", () => {
    expect(assistantSource).toContain("Generating your email draft…");
    expect(assistantSource).toContain('role="status"');
    expect(assistantSource).toContain("Regenerate / refine");
    expect(assistantSource).toContain("Choose a saved prompt");
    expect(assistantSource).toContain("Save prompt");
    expect(assistantSource).toContain("Remove saved AI prompt");
  });

  it("constrains tone and requested personalization tokens through the owner-only generation contract", () => {
    expect(routerSource).toContain('tone: z.enum(["professional", "friendly", "urgent", "warm", "concise"])');
    expect(routerSource).toContain("personalizationTokens");
    expect(routerSource).toContain("requestedTokens");
    expect(routerSource).toContain("Urgent” means clear and time-sensitive, never pressure");
    expect(routerSource).toContain("Include each requested supported personalization token exactly as written");
  });

  it("requires an explicit side-by-side review and apply decision before replacing template content", () => {
    expect(assistantSource).toContain("Draft tone");
    expect(assistantSource).toContain("Include personalization");
    expect(assistantSource).toContain("Compare before applying");
    expect(assistantSource).toContain("Original template");
    expect(assistantSource).toContain("Proposed AI draft");
    expect(assistantSource).toContain("Apply proposal");
    expect(assistantSource).toContain("Discard proposal");
    expect(assistantSource).toContain("setProposedDraft(draft)");
    expect(assistantSource).toContain("onApply(proposedDraft)");
  });

  it("enforces a bounded maximum body-word limit in the server contract", () => {
    expect(routerSource).toContain("maxWordCount: z.number().int().min(25).max(500).default(250)");
    expect(routerSource).toContain("The body must contain no more than ${input.maxWordCount} words.");
    expect(routerSource).toContain("slice(0, input.maxWordCount).join(\" \")");
  });

  it("provides copy, metrics, and reduced-motion-safe smooth apply feedback in the proposal comparison", () => {
    expect(assistantSource).toContain("Copy draft");
    expect(assistantSource).toContain("navigator.clipboard.writeText");
    expect(assistantSource).toContain("Max words");
    expect(assistantSource).toContain("words ·");
    expect(assistantSource).toContain("motion-reduce:transition-none");
    expect(assistantSource).toContain("isApplying");
    expect(assistantSource).toContain("prefers-reduced-motion: reduce");
  });

  it("visually identifies dynamic placeholders and explains the selected AI tone", () => {
    expect(assistantSource).toContain("highlightedDraft");
    expect(assistantSource).toContain("Highlighted gold fields are dynamic placeholders");
    expect(assistantSource).toContain("bg-amber-200/80");
    expect(assistantSource).toContain("TONE_HELP");
    expect(assistantSource).toContain("Professional: formal, clear, and polite.");
    expect(assistantSource).toContain("Urgent / action-oriented: clear next steps without pressure");
  });

  it("keeps the immediately prior editable template available for a single author-controlled undo", () => {
    expect(assistantSource).toContain("setUndoDraft({ subject: currentSubject, body: currentBody })");
    expect(assistantSource).toContain("undoLastAiApplication");
    expect(assistantSource).toContain("Undo AI apply");
    expect(assistantSource).toContain("Restored the template from before the AI proposal was applied.");
  });
});
