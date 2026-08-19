import { describe, expect, it } from "vitest";
import { getEngagementTrend, HIGH_ACTIVITY_WEEKLY_THRESHOLD, isHighWeeklyActivity } from "../shared/propertyEngagement";

describe("property engagement trends", () => {
  it("calculates positive, negative, flat, and new week-over-week engagement states", () => {
    expect(getEngagementTrend(12, 6)).toEqual({ percentChange: 100, direction: "up" });
    expect(getEngagementTrend(3, 6)).toEqual({ percentChange: -50, direction: "down" });
    expect(getEngagementTrend(5, 5)).toEqual({ percentChange: 0, direction: "flat" });
    expect(getEngagementTrend(4, 0)).toEqual({ percentChange: null, direction: "new" });
  });

  it("marks the documented weekly high-activity threshold inclusively", () => {
    expect(isHighWeeklyActivity(HIGH_ACTIVITY_WEEKLY_THRESHOLD - 1)).toBe(false);
    expect(isHighWeeklyActivity(HIGH_ACTIVITY_WEEKLY_THRESHOLD)).toBe(true);
  });
});
