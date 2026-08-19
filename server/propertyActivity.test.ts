import { describe, expect, it } from "vitest";
import { formatPropertyActivityType, getPropertyActivitySince } from "../shared/propertyActivity";

describe("property activity periods", () => {
  const now = new Date("2026-08-19T12:00:00.000Z");

  it("uses an unbounded all-time window and exact rolling date windows", () => {
    expect(getPropertyActivitySince("all", now)).toBeNull();
    expect(getPropertyActivitySince("7d", now)?.toISOString()).toBe("2026-08-12T12:00:00.000Z");
    expect(getPropertyActivitySince("30d", now)?.toISOString()).toBe("2026-07-20T12:00:00.000Z");
  });

  it("renders stored activity event names in dashboard-readable form", () => {
    expect(formatPropertyActivityType("chat_completed")).toBe("Chat Completed");
    expect(formatPropertyActivityType("cost_of_waiting_calculator")).toBe("Cost Of Waiting Calculator");
    expect(formatPropertyActivityType(null)).toBe("No activity in this period");
  });
});
