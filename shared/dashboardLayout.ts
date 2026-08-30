export const EXECUTIVE_WIDGET_IDS = ["new-today", "open-queue", "mobile-share", "top-source"] as const;

export type ExecutiveWidgetId = (typeof EXECUTIVE_WIDGET_IDS)[number];

export const DEFAULT_EXECUTIVE_WIDGET_ORDER: ExecutiveWidgetId[] = [...EXECUTIVE_WIDGET_IDS];

export function isExecutiveWidgetId(value: unknown): value is ExecutiveWidgetId {
  return typeof value === "string" && (EXECUTIVE_WIDGET_IDS as readonly string[]).includes(value);
}

export function normalizeExecutiveWidgetOrder(value: unknown): ExecutiveWidgetId[] {
  const candidate = Array.isArray(value) ? value.filter(isExecutiveWidgetId) : [];
  const unique = candidate.filter((id, index) => candidate.indexOf(id) === index);
  return [...unique, ...DEFAULT_EXECUTIVE_WIDGET_ORDER.filter((id) => !unique.includes(id))];
}

export function parseExecutiveWidgetOrder(value: string | null | undefined): ExecutiveWidgetId[] {
  if (!value) return [...DEFAULT_EXECUTIVE_WIDGET_ORDER];
  try {
    return normalizeExecutiveWidgetOrder(JSON.parse(value));
  } catch {
    return [...DEFAULT_EXECUTIVE_WIDGET_ORDER];
  }
}

export function serializeExecutiveWidgetOrder(order: unknown): string {
  return JSON.stringify(normalizeExecutiveWidgetOrder(order));
}

export function isValidExecutiveWidgetOrder(value: unknown): value is ExecutiveWidgetId[] {
  return Array.isArray(value)
    && value.length === EXECUTIVE_WIDGET_IDS.length
    && new Set(value).size === EXECUTIVE_WIDGET_IDS.length
    && value.every(isExecutiveWidgetId);
}

export const EXECUTIVE_WIDGET_LABELS: Record<ExecutiveWidgetId, string> = {
  "new-today": "New today",
  "open-queue": "Open lead queue",
  "mobile-share": "Mobile browser share",
  "top-source": "Top stored source",
};

export type ExecutiveEngagementMetric = {
  widgetId: ExecutiveWidgetId;
  value: number;
  rationale: string;
};

export type ExecutiveLayoutOptimizerResult = {
  order: ExecutiveWidgetId[];
  rationale: string;
};

export function deterministicEngagementOrder(metrics: ExecutiveEngagementMetric[]): ExecutiveWidgetId[] {
  const score = new Map(metrics.map((metric) => [metric.widgetId, metric.value]));
  return [...DEFAULT_EXECUTIVE_WIDGET_ORDER].sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0));
}

export const LAYOUT_PREFERENCE_STORAGE_KEY = "executive-workday-widget-order";
