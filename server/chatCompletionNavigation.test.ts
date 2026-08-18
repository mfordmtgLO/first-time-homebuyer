import { describe, expect, it } from "vitest";
import { chatCompletionNavigation } from "../shared/chatCompletionNavigation";

describe("chat completion navigation", () => {
  it("offers distinct, meaningful next destinations after a completed intake", () => {
    expect(chatCompletionNavigation.map((option) => option.targetId)).toEqual([
      "buydown",
      "cost-of-waiting",
      "roadmap",
    ]);
    expect(new Set(chatCompletionNavigation.map((option) => option.targetId)).size).toBe(chatCompletionNavigation.length);
    expect(chatCompletionNavigation.map((option) => option.label)).toEqual([
      "2-1 Buydown",
      "Cost of Waiting",
      "Free Roadmap",
    ]);
  });
});
