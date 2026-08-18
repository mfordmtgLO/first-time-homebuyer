import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chatCompletionNavigation } from "../shared/chatCompletionNavigation";

describe("chat completion navigation", () => {
  it("offers distinct, meaningful next destinations after a completed intake", () => {
    expect(chatCompletionNavigation.map((option) => option.targetId)).toEqual([
      "buydown",
      "cost-of-waiting",
      "roadmap",
      "about",
    ]);
    expect(new Set(chatCompletionNavigation.map((option) => option.targetId)).size).toBe(chatCompletionNavigation.length);
    expect(chatCompletionNavigation.map((option) => option.label)).toEqual([
      "2-1 Buydown",
      "Cost of Waiting",
      "Free Roadmap",
      "Your Guide",
    ]);
  });

  it("keeps Free Roadmap and Your Guide in the compact two-column completion grid", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/MortgageChatWidget.tsx"), "utf8");

    expect(componentSource).toContain('className="mt-3 grid grid-cols-2 gap-2"');
    expect(componentSource).not.toContain('option.targetId === "roadmap" ? "h-11');
  });

  it("resets the reused completion panel to the top before presenting the finished intake message", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/MortgageChatWidget.tsx"), "utf8");

    expect(componentSource).toContain("completionContent.scrollTop = 0;");
    expect(componentSource.indexOf("completionContent.scrollTop = 0;")).toBeLessThan(componentSource.indexOf("updateCompletionOverflow();"));
  });
});
