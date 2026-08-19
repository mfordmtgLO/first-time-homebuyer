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
    expect(componentSource).not.toContain('option.targetId === "roadmap" ? "h-11');
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
});
