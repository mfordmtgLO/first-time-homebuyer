export const PROPERTY_ACTIVITY_RANGES = ["all", "7d", "30d", "90d"] as const;

export type PropertyActivityRange = (typeof PROPERTY_ACTIVITY_RANGES)[number];

export const PROPERTY_ACTIVITY_RANGE_LABELS: Record<PropertyActivityRange, string> = {
  all: "All-time activity",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export function getPropertyActivitySince(range: PropertyActivityRange, now = new Date()): Date | null {
  if (range === "all") return null;
  const days = Number.parseInt(range, 10);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function formatPropertyActivityType(eventType: string | null | undefined): string {
  if (!eventType) return "No activity in this period";
  if (eventType === "email_pdf_summary") return "Email PDF summary draft";
  if (eventType === "calendar_click") return "Calendar button click";
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
