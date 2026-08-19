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

export type PropertyEngagementSort = "activity" | "conversion";

export type WeeklyPropertyEngagement = {
  address: string;
  weeklyActivityCount: number;
  weeklyCapturedLeadCount: number;
};

export function getPropertyConversionRate(activities: number, capturedLeads: number): number {
  return activities > 0 ? capturedLeads / activities : 0;
}

export function sortWeeklyPropertyEngagement<T extends WeeklyPropertyEngagement>(pages: T[], sort: PropertyEngagementSort): T[] {
  return [...pages].sort((left, right) => {
    const primary = sort === "conversion"
      ? getPropertyConversionRate(right.weeklyActivityCount, right.weeklyCapturedLeadCount) - getPropertyConversionRate(left.weeklyActivityCount, left.weeklyCapturedLeadCount)
      : right.weeklyActivityCount - left.weeklyActivityCount;
    if (primary !== 0) return primary;
    const activityTieBreak = right.weeklyActivityCount - left.weeklyActivityCount;
    if (activityTieBreak !== 0) return activityTieBreak;
    return left.address.localeCompare(right.address);
  });
}
