import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const managerSource = readFileSync(resolve(process.cwd(), "client/src/components/EmailTemplateLifecycleManager.tsx"), "utf8");
const editorSource = readFileSync(resolve(process.cwd(), "client/src/components/UniversalEmailTemplateEditor.tsx"), "utf8");

describe("EmailTemplateLifecycleManager bulk archived lifecycle", () => {
  it("keeps usage-based sort choices and archived bulk restore/delete controls", () => {
    expect(managerSource).toContain('value="most_used"');
    expect(managerSource).toContain('value="least_used"');
    expect(managerSource).toContain("Restore selected");
    expect(managerSource).toContain("Delete selected");
    expect(managerSource).toContain("onBulkRestore");
    expect(managerSource).toContain("onBulkDelete");
  });

  it("requires a confirmation before permanently deleting multiple archived templates", () => {
    expect(managerSource).toContain("Permanently delete");
    expect(managerSource).toContain("This cannot be undone.");
  });

  it("exposes validated JSON backup export and import controls", () => {
    expect(managerSource).toContain("Export custom");
    expect(managerSource).toContain("Import backup");
    expect(managerSource).toContain("application/json,.json");
    expect(managerSource).toContain("This backup belongs to a different email workflow.");
  });

  it("keeps universal rich-text, hyperlink, and Word document import controls available", () => {
    expect(editorSource).toContain("Insert link");
    expect(editorSource).toContain("Import Word");
    expect(editorSource).toContain("mammoth.convertToHtml");
    expect(editorSource).toContain("https?:|mailto:");
  });

  it("offers supported merge-field insertion and a safe rendered HTML preview", () => {
    expect(editorSource).toContain("Insert merge field");
    expect(editorSource).toContain("{{client_name}}");
    expect(editorSource).toContain("{{property_address}}");
    expect(editorSource).toContain("HTML preview");
    expect(editorSource).toContain("sanitizeEmailTemplateHtml");
  });

  it("keeps rendered previews and owner-scoped version-history restore controls visible", () => {
    expect(managerSource).toContain("Rendered HTML preview");
    expect(managerSource).toContain("dangerouslySetInnerHTML");
    expect(managerSource).toContain("templateVersions.list");
    expect(managerSource).toContain("templateVersions.restore");
    expect(managerSource).toContain("version history");
    expect(managerSource).toContain("Restore version");
  });
});
