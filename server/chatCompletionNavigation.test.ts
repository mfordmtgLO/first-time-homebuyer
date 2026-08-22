import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  chatCompletionNavigation,
  FULL_FIRST_TIME_HOMEBUYER_URL,
  propertyChatCompletionNavigation,
} from "../shared/chatCompletionNavigation";

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

  it("uses destinations that exist on a single-property page and offers a full-site exit", () => {
    expect(propertyChatCompletionNavigation.map((option) => option.targetId)).toEqual([
      "buydown",
      "cost-of-waiting",
      "roadmap",
      "full-homebuyer-site",
    ]);
    expect(FULL_FIRST_TIME_HOMEBUYER_URL).toBe("https://firsttimehomebuyer.manus.space");
    expect(propertyChatCompletionNavigation.find((option) => option.targetId === "full-homebuyer-site")?.label).toBe("Homebuyer Guide");
    expect(propertyChatCompletionNavigation.map((option) => option.label)).not.toContain("Full Homebuyer Site");

    const projectRoot = path.resolve(import.meta.dirname, "..");
    const propertySource = readFileSync(path.join(projectRoot, "client/src/pages/PropertyLandingPage.tsx"), "utf8");
    const widgetSource = readFileSync(path.join(projectRoot, "client/src/components/MortgageChatWidget.tsx"), "utf8");

    expect(propertySource).toContain('id="buydown"');
    expect(propertySource).toContain('id="cost-of-waiting"');
    expect(propertySource).toContain('id="roadmap"');
    expect(widgetSource).toContain("propertyChatCompletionNavigation");
    expect(widgetSource).toContain("window.location.assign(FULL_FIRST_TIME_HOMEBUYER_URL)");
  });

  it("keeps Free Roadmap and Your Guide in the compact two-column completion grid", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/MortgageChatWidget.tsx"), "utf8");

    expect(componentSource).toContain('className="mt-3 grid grid-cols-2 gap-2"');
    expect(componentSource).toContain('className="h-auto min-h-12 w-full min-w-0 items-center justify-start gap-1.5 px-2.5 py-2 text-left text-xs transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"');
    expect(componentSource).toContain('className="min-w-0 flex-1 whitespace-normal break-words text-xs font-semibold leading-tight"');
    expect(componentSource).not.toContain('className="min-w-0 flex-1 truncate text-xs font-semibold"');
    expect(componentSource).not.toContain('option.targetId === "roadmap" ? "h-11');
  });

  it("gives each completed-chat navigation card a clear keyboard-visible focus state", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/MortgageChatWidget.tsx"), "utf8");

    expect(componentSource).toContain("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card");
    expect(componentSource).toContain("hover:border-primary/45 hover:bg-primary/5");
  });

  it("resets the reused completion panel to the top before presenting the finished intake message", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/MortgageChatWidget.tsx"), "utf8");

    expect(componentSource).toContain("completionContent.scrollTop = 0;");
    expect(componentSource.indexOf("completionContent.scrollTop = 0;")).toBeLessThan(componentSource.indexOf("updateCompletionOverflow();"));
  });

  it("top-aligns the desktop completion view with a readable header gutter", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/MortgageChatWidget.tsx"), "utf8");

    expect(componentSource).toContain("sm:justify-start sm:px-7 sm:pb-7 sm:pt-8");
    expect(componentSource).not.toContain("sm:justify-center sm:p-7");
  });

  it("shows an accessible intake progress indicator and provides an immediate completion PDF download", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const componentSource = readFileSync(path.join(projectRoot, "client/src/components/MortgageChatWidget.tsx"), "utf8");

    expect(componentSource).toContain('import { Progress } from "@/components/ui/progress"');
    expect(componentSource).toContain("Homebuying intake progress");
    expect(componentSource).toContain("Mortgage intake progress: step ${progressStep} of ${activeFlowSteps.length}");
    expect(componentSource).toContain("downloadMortgageIntakeSummary");
    expect(componentSource).toContain("Download my intake summary (PDF)");
    expect(componentSource).toContain("not a loan approval, commitment, or quote");
  });
});
