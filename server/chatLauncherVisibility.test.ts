import { describe, expect, it } from "vitest";
import { shouldHideMobileChatLauncher } from "../shared/chatLauncherVisibility";

describe("mobile chat launcher visibility", () => {
  it("keeps hero calls to action clear while preserving a resumable chat", () => {
    expect(shouldHideMobileChatLauncher(true, false)).toBe(true);
    expect(shouldHideMobileChatLauncher(false, false)).toBe(false);
    expect(shouldHideMobileChatLauncher(true, true)).toBe(false);
  });
});
