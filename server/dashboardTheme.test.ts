import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("private dashboard theme preference", () => {
  it("keeps the dark preference scoped to the dashboard and persists it for the dashboard owner", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const dashboardSource = readFileSync(path.join(projectRoot, "client/src/pages/Leads.tsx"), "utf8");

    expect(dashboardSource).toContain('localStorage.getItem("dashboard-theme")');
    expect(dashboardSource).toContain('localStorage.setItem("dashboard-theme"');
    expect(dashboardSource).toContain('dashboardDarkMode ? "dark min-h-screen bg-background"');
    expect(dashboardSource).toContain('aria-label={dashboardDarkMode ? "Use light dashboard theme" : "Use dark dashboard theme"}');
  });
});
