import { describe, expect, it } from "vitest";
import { getNextQuestionFocusTarget, getQuestionSnapScrollTop } from "../shared/chatFocus";

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
  it("places the complete active question just above the fixed response area", () => {
    expect(getQuestionSnapScrollTop(480, 150, 400)).toBe(246);
  });

  it("never returns a negative scroll position for early questions", () => {
    expect(getQuestionSnapScrollTop(12, 90, 400)).toBe(0);
  });
});
