import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const agentsSource = readFileSync(resolve(process.cwd(), "client/src/components/AgentSettings.tsx"), "utf8");
const officersSource = readFileSync(resolve(process.cwd(), "client/src/components/LoanOfficerSettings.tsx"), "utf8");
const controlsSource = readFileSync(resolve(process.cwd(), "client/src/components/DirectoryOutreachControls.tsx"), "utf8");
const presetControlsSource = readFileSync(resolve(process.cwd(), "client/src/components/DirectoryFilterPresetControls.tsx"), "utf8");

describe("partner directory dashboard controls", () => {
  it("keeps both future-growth directories independently scrollable with searchable A–Z or recent ordering", () => {
    for (const source of [agentsSource, officersSource]) {
      expect(source).toContain("max-h-[38rem] overflow-y-auto");
      expect(source).toContain('"last_name" | "recent"');
      expect(source).toContain("A–Z by last name");
      expect(source).toContain("Most recent");
      expect(source).toContain("<Search");
    }
  });

  it("offers a principal-broker-only view in the co-branded agent directory", () => {
    expect(agentsSource).toContain("PB only");
    expect(agentsSource).toContain("principalBrokerOnly");
    expect(agentsSource).toContain("isPrincipalBroker");
    expect(agentsSource).toContain(">PB</span>");
  });

  it("provides template-backed individual Draft email actions for both directories", () => {
    expect(agentsSource).toContain('audience="agent"');
    expect(officersSource).toContain('audience="loan_officer"');
    expect(controlsSource).toContain("Add template");
    expect(controlsSource).toContain("EmailTemplateLifecycleManager");
    expect(controlsSource).toContain("UniversalEmailTemplateEditor");
    expect(controlsSource).toContain("appends the complete Mike Ford signature once.");
  });

  it("supports selectable BCC group drafts and shows the last outreach timestamp for both directory profile types", () => {
    for (const source of [agentsSource, officersSource]) {
      expect(source).toContain("Select visible");
      expect(source).toContain("selectedVisible");
      expect(source).toContain("Last outreach draft:");
      expect(source).toContain("directoryOutreach.lastDrafts");
      expect(source).toContain("<Checkbox");
    }
    expect(controlsSource).toContain("recordDirectoryDraft");
    expect(controlsSource).toContain("BCC draft opened");
    expect(controlsSource).toContain("recipients are added as BCC");
  });

  it("provides persisted saved directory views alongside search and sort controls", () => {
    expect(agentsSource).toContain("DirectoryFilterPresetControls audience=\"agent\"");
    expect(officersSource).toContain("DirectoryFilterPresetControls audience=\"loan_officer\"");
    expect(presetControlsSource).toContain("Save directory view");
    expect(presetControlsSource).toContain("directoryOutreach.filterPresets");
    expect(presetControlsSource).toContain("Delete saved view");
  });
});
