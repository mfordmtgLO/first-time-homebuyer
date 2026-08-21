import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getMobileChatLauncherPresentation } from "../shared/chatLauncherPresentation";

describe("mobile chat launcher presentation", () => {
  it("stays compact at rest and expands for recent page scrolling or a resumable chat", () => {
    expect(getMobileChatLauncherPresentation(false, false)).toBe("compact");
    expect(getMobileChatLauncherPresentation(false, true)).toBe("expanded");
    expect(getMobileChatLauncherPresentation(true, false)).toBe("expanded");
  });

  it("enables compact-idle launcher behavior on both public homepage and single-property pages", () => {
    const projectRoot = path.resolve(import.meta.dirname, "..");
    const homeSource = readFileSync(path.join(projectRoot, "client/src/pages/Home.tsx"), "utf8");
    const propertySource = readFileSync(path.join(projectRoot, "client/src/pages/PropertyLandingPage.tsx"), "utf8");

    expect(homeSource).toContain("<MortgageChatWidget compactWhenIdle />");
    expect(propertySource).toContain("<MortgageChatWidget compactWhenIdle />");
  });
});
