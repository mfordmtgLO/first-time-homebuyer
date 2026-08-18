import { describe, expect, it } from "vitest";
import { getMobileChatLauncherPresentation } from "../shared/chatLauncherPresentation";

describe("mobile chat launcher presentation", () => {
  it("stays compact at rest and expands for recent page scrolling or a resumable chat", () => {
    expect(getMobileChatLauncherPresentation(false, false)).toBe("compact");
    expect(getMobileChatLauncherPresentation(false, true)).toBe("expanded");
    expect(getMobileChatLauncherPresentation(true, false)).toBe("expanded");
  });
});
