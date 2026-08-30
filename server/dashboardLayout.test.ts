import { describe, expect, it } from "vitest";
import { DEFAULT_EXECUTIVE_WIDGET_ORDER, deterministicEngagementOrder, isValidExecutiveWidgetOrder, normalizeExecutiveWidgetOrder, parseExecutiveWidgetOrder, serializeExecutiveWidgetOrder } from "../shared/dashboardLayout";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("dashboard layout preferences", () => {
  it("normalizes unknown, duplicate, and missing widget IDs safely", () => {
    expect(normalizeExecutiveWidgetOrder(["top-source", "top-source", "unknown"])).toEqual(["top-source", "new-today", "open-queue", "mobile-share"]);
    expect(parseExecutiveWidgetOrder("not-json")).toEqual(DEFAULT_EXECUTIVE_WIDGET_ORDER);
    expect(isValidExecutiveWidgetOrder(DEFAULT_EXECUTIVE_WIDGET_ORDER)).toBe(true);
    expect(isValidExecutiveWidgetOrder(["top-source", "top-source", "new-today", "open-queue"])).toBe(false);
  });

  it("serializes a complete normalized order", () => {
    expect(JSON.parse(serializeExecutiveWidgetOrder(["mobile-share"]))).toEqual(["mobile-share", "new-today", "open-queue", "top-source"]);
  });

  it("provides a deterministic real-metric fallback order", () => {
    expect(deterministicEngagementOrder([
      { widgetId: "new-today", value: 2, rationale: "" },
      { widgetId: "open-queue", value: 8, rationale: "" },
      { widgetId: "mobile-share", value: 60, rationale: "" },
      { widgetId: "top-source", value: 4, rationale: "" },
    ])).toEqual(["mobile-share", "open-queue", "top-source", "new-today"]);
  });

  it("exposes database preference and optimizer procedures with admin safeguards", () => {
    const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const dbSource = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
    const componentSource = readFileSync(resolve(process.cwd(), "client/src/components/ExecutiveCommandCenter.tsx"), "utf8");
    expect(routerSource).toContain("dashboardLayout: router({");
    expect(routerSource).toContain("getDashboardLayoutPreference(ctx.user.id)");
    expect(dbSource).toContain("dashboardLayoutPreference");
    expect(routerSource).toContain("executive_layout_optimizer");
    expect(routerSource).toContain("setOptimizerEnabled");
    expect(routerSource).toContain("Enable the AI layout optimizer before optimizing");
    expect(dbSource).toContain("optimizerEnabled");
    expect(componentSource).toContain("trpc.dashboardLayout.get.useQuery");
    expect(componentSource).toContain("trpc.dashboardLayout.save.useMutation");
    expect(componentSource).toContain("Optimize layout with AI");
    expect(componentSource).toContain("AI layout note:");
  });

  it("coordinates the live workday sidebar width with the flexing main workspace", () => {
    const sidebarSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardWorkdaySidebar.tsx"), "utf8");
    const leadsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Leads.tsx"), "utf8");
    expect(sidebarSource).toContain("onCollapsedChange?: (collapsed: boolean) => void");
    expect(sidebarSource).toContain("collapsed: collapsedProp");
    expect(sidebarSource).toContain('aria-label={collapsed ? "Expand workday sidebar" : "Collapse workday sidebar"}');
    expect(leadsSource).toContain("workdaySidebarCollapsed");
    expect(leadsSource).toContain('lg:grid-cols-[3.5rem_minmax(0,1fr)]');
    expect(leadsSource).toContain('lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]');
    expect(leadsSource).toContain('transition-[grid-template-columns]');
    expect(leadsSource).toContain('collapsed={workdaySidebarCollapsed} onCollapsedChange={setWorkdaySidebarCollapsed}');
  });

  it("starts Browser Lead Mix compact while preserving its detail controls", () => {
    const toolsSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardBrowserTools.tsx"), "utf8");
    const sidebarSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardWorkdaySidebar.tsx"), "utf8");
    expect(toolsSource).toContain('const [open, setOpen] = useState(false);');
    expect(toolsSource).toContain('aria-controls="browser-lead-mix-details"');
    expect(toolsSource).toContain('aria-expanded={open}');
    expect(toolsSource).toContain('id="browser-lead-mix-details"');
    expect(toolsSource).toContain('id="browser-lead-timeframe"');
    expect(sidebarSource).toContain('Pinned daily route');
  });

  it("keeps Mortgage Chat and Roadmap source clicks dataset-aware", () => {
    const toolsSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardBrowserTools.tsx"), "utf8");
    const leadsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Leads.tsx"), "utf8");
    expect(toolsSource).toContain('["Mortgage Chat", filtered.chat.length]');
    expect(toolsSource).toContain('["Roadmap", filtered.roadmap.length]');
    expect(toolsSource).toContain('aria-label="All captured leads: Roadmap plus Mortgage Chat browser lead tracker"');
    expect(toolsSource).toContain('counts.total} total captured leads: {filtered.roadmap.length} Roadmap + {filtered.chat.length} Mortgage Chat');
    expect(leadsSource).toContain('if (source === "Mortgage Chat")');
    expect(leadsSource).toContain('document.getElementById("chat-intakes")');
    expect(leadsSource).toContain('source === "Roadmap" ? "all" : source');
    expect(leadsSource).toContain('document.getElementById("roadmap-leads")');
  });

  it("provides a combined all-leads table with date-range outcome comparison and context banners", () => {
    const leadsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Leads.tsx"), "utf8");
    expect(leadsSource).toContain('function CombinedAllLeadsPanel');
    expect(leadsSource).toContain('id="all-leads"');
    expect(leadsSource).toContain('id="combined-leads-range"');
    expect(leadsSource).toContain('Roadmap booked:');
    expect(leadsSource).toContain('Chat qualified:');
    expect(leadsSource).toContain('Follow-up recorded:');
    expect(leadsSource).toContain('Viewing Chat Intakes');
    expect(leadsSource).toContain('Viewing Roadmap leads');
    expect(leadsSource).toContain('<CombinedAllLeadsPanel rows={combinedRows} comparison={combinedComparison} range={combinedRange} onRangeChange={setCombinedRange} dayFilter={trendDayFilter} onClearDayFilter={() => setTrendDayFilter(null)} clearFiltersToken={combinedFilterResetToken} />');
  });

  it("supports combined contact search, multi-select filters, and daily lead destinations", () => {
    const toolsSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardBrowserTools.tsx"), "utf8");
    const leadsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Leads.tsx"), "utf8");
    const chatSource = readFileSync(resolve(process.cwd(), "client/src/components/ChatIntakeLeads.tsx"), "utf8");
    const textingSource = readFileSync(resolve(process.cwd(), "client/src/components/TextingWorkspace.tsx"), "utf8");
    expect(leadsSource).toContain('placeholder="Search name, email, phone, source, or outcome"');
    expect(leadsSource).toContain('selectedSources');
    expect(leadsSource).toContain('selectedOutcomes');
    expect(leadsSource).toContain('outcomeOptions = ["New", "Contacted", "Booked", "Qualified", "Incomplete"]');
    expect(toolsSource).toContain('selectedTrendDay');
    expect(toolsSource).toContain('Leads on {formatTrendDate(selectedTrendDay)}');
    expect(toolsSource).toContain('onTrendLeadNavigate?.(link)');
    expect(toolsSource).toContain('texting-roadmap-');
    expect(toolsSource).toContain('texting-chat-');
    expect(leadsSource).toContain('id={`roadmap-lead-${lead.id}`}');
    expect(chatSource).toContain('id={`chat-intake-lead-${lead.id}`}');
    expect(textingSource).toContain('id={`texting-${recipient.sourceType}-${recipient.sourceLeadId}`}');
  });

  it("supports selected-day trend state, urgency sorting, and filtered combined export", () => {
    const toolsSource = readFileSync(resolve(process.cwd(), "client/src/components/DashboardBrowserTools.tsx"), "utf8");
    const leadsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Leads.tsx"), "utf8");
    expect(toolsSource).toContain('selectedTrendDay');
    expect(toolsSource).toContain('<ReferenceLine x={selectedTrendLabel}');
    expect(toolsSource).toContain('View all leads for this day');
    expect(toolsSource).toContain('onViewAllTrendDay?.(selectedTrendDay)');
    expect(leadsSource).toContain('type CombinedSort = "newest" | "oldest" | "urgency";');
    expect(leadsSource).toContain('value="urgency">Follow-up urgency</SelectItem>');
    expect(leadsSource).toContain('new Date(row.submittedAt).toISOString().slice(0, 10) === dayFilter');
    expect(leadsSource).toContain('anchor.download = `combined-leads-');
    expect(leadsSource).toContain('Export filtered CSV');
    expect(leadsSource).toContain('onViewAllTrendDay={(day) =>');
  });
});
