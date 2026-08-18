import { describe, expect, it } from "vitest";
import { getNextQuestionFocusTarget, getQuestionSnapScrollTop, hasTranscriptContentBelow } from "../shared/chatFocus";

describe("getNextQuestionFocusTarget", () => {
  it("focuses a guided control for quick-reply and slider intake steps", () => {
    expect(getNextQuestionFocusTarget("loan_purpose")).toBe("guided");
    expect(getNextQuestionFocusTarget("property_value")).toBe("guided");
    expect(getNextQuestionFocusTarget("home_search_interest")).toBe("guided");
  });

  it("focuses the text input for free-form intake steps", () => {
    expect(getNextQuestionFocusTarget("target_area")).toBe("text");
  });

  it("does not move focus when no active question exists", () => {
    expect(getNextQuestionFocusTarget(null)).toBe("none");
  });
});

describe("getQuestionSnapScrollTop", () => {
  it("places a follow-up question below a readable transcript-top gutter", () => {
    expect(getQuestionSnapScrollTop(480)).toBe(424);
  });

  it("never returns a negative scroll position for early questions", () => {
    expect(getQuestionSnapScrollTop(12)).toBe(0);
  });

  it("keeps the opening greeting at the top of the transcript even when it is long", () => {
    expect(getQuestionSnapScrollTop(140, 56, true)).toBe(0);
  });
});

describe("hasTranscriptContentBelow", () => {
  it("shows a down-arrow cue only while content remains below the transcript viewport", () => {
    expect(hasTranscriptContentBelow(377, 263, 720, 8, 80)).toBe(false);
    expect(hasTranscriptContentBelow(200, 263, 720, 8, 80)).toBe(true);
  });
});
