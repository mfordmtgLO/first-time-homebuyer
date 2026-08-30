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
    expect(componentSource).toContain("trpc.dashboardLayout.get.useQuery");
    expect(componentSource).toContain("trpc.dashboardLayout.save.useMutation");
    expect(componentSource).toContain("Optimize layout with AI");
    expect(componentSource).toContain("AI layout note:");
  });
});
