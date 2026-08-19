export const HIGH_ACTIVITY_WEEKLY_THRESHOLD = 10;

export type EngagementTrend = {
  percentChange: number | null;
  direction: "up" | "down" | "flat" | "new";
};

export function getEngagementTrend(current: number, previous: number): EngagementTrend {
  if (previous <= 0) {
    return current > 0 ? { percentChange: null, direction: "new" } : { percentChange: 0, direction: "flat" };
  }
  const percentChange = Math.round(((current - previous) / previous) * 100);
  return { percentChange, direction: percentChange > 0 ? "up" : percentChange < 0 ? "down" : "flat" };
}

export function isHighWeeklyActivity(activityCount: number, threshold = HIGH_ACTIVITY_WEEKLY_THRESHOLD): boolean {
  return activityCount >= threshold;
}
