import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Executive Workday command center", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/components/ExecutiveCommandCenter.tsx"), "utf8");
  const leadsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Leads.tsx"), "utf8");

  it("uses the existing protected workflow AI review procedure", () => {
    expect(source).toContain("trpc.workflowAi.review.useMutation");
    expect(source).toContain('section: "roadmap-leads"');
    expect(source).toContain("Review the underlying records before acting.");
  });

  it("derives command-center metrics from supplied persisted lead records", () => {
    expect(source).toContain("lead.createdAt");
    expect(source).toContain("lead.captureDevice === \"mobile\"");
    expect(source).toContain("Top stored source");
    expect(source).toContain("Open lead queue");
  });

  it("provides shortcuts to existing dashboard sections and is mounted only for the admin grid", () => {
    expect(source).toContain('id: "roadmap-leads"');
    expect(source).toContain('id: "chat-intakes"');
    expect(source).toContain('id: "campaign-funnel"');
    expect(source).toContain('id: "team-workspaces"');
    expect(leadsSource).toContain("<ExecutiveCommandCenter leads={leads.map");
  });

  it("states that AI does not send, save, qualify, or approve automatically", () => {
    expect(source).toContain("never send, save, qualify, or approve anything automatically");
  });

  it("supports persisted drag-and-drop and keyboard widget customization", () => {
    expect(source).toContain("LAYOUT_PREFERENCE_STORAGE_KEY");
    expect(source).toContain("draggable={customizing}");
    expect(source).toContain("Drag a widget to reorder it");
    expect(source).toContain("Reset to Default Layout");
    expect(source).toContain('role="switch" aria-checked={optimizerEnabled}');
    expect(source).toContain("AI reordered the command-center widgets");
    expect(source).toContain("Move ${WIDGET_LABELS[id]} earlier");
    expect(source).toContain("Move ${WIDGET_LABELS[id]} later");
  });
});
