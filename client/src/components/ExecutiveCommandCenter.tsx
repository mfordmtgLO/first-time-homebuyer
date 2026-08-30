import { useEffect, useMemo, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Check, GripVertical, Loader2, MessageSquareText, Megaphone, Rocket, RotateCcw, Sparkles, Users, Workflow } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_EXECUTIVE_WIDGET_ORDER, EXECUTIVE_WIDGET_LABELS, LAYOUT_PREFERENCE_STORAGE_KEY, normalizeExecutiveWidgetOrder, type ExecutiveWidgetId } from "../../../shared/dashboardLayout";

type Lead = {
  id: number;
  firstName: string;
  email: string;
  status: string;
  source: string;
  createdAt: Date | string;
  captureDevice?: "mobile" | "desktop" | null;
};

type Props = {
  leads: Lead[];
};

type WidgetId = "new-today" | "open-queue" | "mobile-share" | "top-source";

const DEFAULT_WIDGET_ORDER: WidgetId[] = [...DEFAULT_EXECUTIVE_WIDGET_ORDER];
const WIDGET_LABELS: Record<WidgetId, string> = EXECUTIVE_WIDGET_LABELS;

const sectionLinks = [
  { id: "roadmap-leads", label: "Roadmap queue", icon: Workflow },
  { id: "chat-intakes", label: "Chat intakes", icon: MessageSquareText },
  { id: "campaign-funnel", label: "Campaign funnel", icon: Megaphone },
  { id: "team-workspaces", label: "Team management", icon: Users },
] as const;

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function displaySource(source: string) {
  return source.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isWidgetId(value: string): value is WidgetId {
  return DEFAULT_WIDGET_ORDER.includes(value as WidgetId);
}

export function ExecutiveCommandCenter({ leads }: Props) {
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [customizing, setCustomizing] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);
  const [layoutHydrated, setLayoutHydrated] = useState(false);
  const [optimizerRationale, setOptimizerRationale] = useState<string | null>(null);
  const [optimizerEnabled, setOptimizerEnabled] = useState(false);
  const [optimizerNotice, setOptimizerNotice] = useState<string | null>(null);
  const review = trpc.workflowAi.review.useMutation({
    onError: (error) => toast.error(error.message || "The executive review could not be prepared."),
  });
  const layoutQuery = trpc.dashboardLayout.get.useQuery(undefined, { staleTime: Infinity, retry: 1 });
  const saveLayout = trpc.dashboardLayout.save.useMutation({
    onError: (error) => toast.error(error.message || "The command-center layout could not be saved."),
  });
  const resetLayout = trpc.dashboardLayout.reset.useMutation({
    onSuccess: () => {
      setOptimizerNotice("Command-center widgets reset to the default layout.");
      toast.success("Command-center layout reset to default.");
    },
    onError: (error) => toast.error(error.message || "The command-center layout could not be reset."),
  });
  const setOptimizer = trpc.dashboardLayout.setOptimizerEnabled.useMutation({
    onSuccess: (result) => {
      setOptimizerEnabled(result.optimizerEnabled);
      setOptimizerNotice(result.optimizerEnabled ? "AI layout optimizer enabled for this dashboard profile." : "AI layout optimizer disabled. Widget order will not be changed by AI.");
      toast.success(result.optimizerEnabled ? "AI layout optimizer enabled." : "AI layout optimizer disabled.");
    },
    onError: (error) => toast.error(error.message || "The AI layout optimizer setting could not be saved."),
  });
  const optimizeLayout = trpc.dashboardLayout.optimize.useMutation({
    onSuccess: (result) => {
      const next = normalizeExecutiveWidgetOrder(result.order) as WidgetId[];
      setWidgetOrder(next);
      setOptimizerRationale(result.rationale);
      setOptimizerNotice("AI reordered the command-center widgets using the supplied engagement metrics.");
      toast.success("AI reordered the command-center KPIs from the supplied engagement metrics.");
    },
    onError: (error) => toast.error(error.message || "The AI layout optimizer could not prepare an order."),
  });

  useEffect(() => {
    if (layoutQuery.isLoading || layoutHydrated) return;
    const fromDatabase = layoutQuery.data?.order;
    setOptimizerEnabled(layoutQuery.data?.optimizerEnabled ?? false);
    if (fromDatabase?.length) {
      setWidgetOrder(normalizeExecutiveWidgetOrder(fromDatabase) as WidgetId[]);
    } else {
      try {
        const saved = JSON.parse(window.localStorage.getItem(LAYOUT_PREFERENCE_STORAGE_KEY) ?? "null") as unknown;
        setWidgetOrder(normalizeExecutiveWidgetOrder(saved) as WidgetId[]);
      } catch {
        setWidgetOrder([...DEFAULT_WIDGET_ORDER]);
      }
    }
    setLayoutHydrated(true);
  }, [layoutHydrated, layoutQuery.data, layoutQuery.isLoading]);

  useEffect(() => {
    if (!layoutHydrated) return;
    try { window.localStorage.setItem(LAYOUT_PREFERENCE_STORAGE_KEY, JSON.stringify(widgetOrder)); } catch { /* database remains the source of truth */ }
    saveLayout.mutate({ order: widgetOrder });
  }, [layoutHydrated, widgetOrder]);

  const metrics = useMemo(() => {
    const today = startOfToday();
    const newToday = leads.filter((lead) => lead.status === "new" && new Date(lead.createdAt).getTime() >= today).length;
    const open = leads.filter((lead) => lead.status === "new" || lead.status === "contacted").length;
    const mobile = leads.filter((lead) => lead.captureDevice === "mobile").length;
    const desktop = leads.filter((lead) => lead.captureDevice !== "mobile").length;
    const sourceCounts = Array.from(leads.reduce((counts, lead) => counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1), new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]);
    const dailyCounts = Array.from(leads.reduce((counts, lead) => { const day = new Date(lead.createdAt); day.setHours(0, 0, 0, 0); const key = day.toISOString(); counts.set(key, (counts.get(key) ?? 0) + 1); return counts; }, new Map<string, number>()).values());
    const dailyPeak = dailyCounts.length ? Math.max(...dailyCounts) : 0;
    const records = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map((lead) => ({ label: `${lead.firstName || "Unnamed lead"} · ${lead.source}`, status: lead.status, meta: `${lead.email || "No email"} · ${lead.captureDevice === "mobile" ? "Mobile Browser" : "Desktop Browser"}` }));
    return { newToday, open, mobile, desktop, sourceCounts, dailyPeak, records };
  }, [leads]);

  const runExecutiveReview = () => {
    review.mutate({ section: "roadmap-leads", records: metrics.records });
  };

  const runLayoutOptimizer = () => {
    if (!optimizerEnabled) {
      toast.message("Enable the AI layout optimizer first.");
      return;
    }
    optimizeLayout.mutate({ metrics: [
      { widgetId: "new-today", value: metrics.newToday, dailyPeak: metrics.dailyPeak, label: WIDGET_LABELS["new-today"] },
      { widgetId: "open-queue", value: metrics.open, dailyPeak: metrics.dailyPeak, label: WIDGET_LABELS["open-queue"] },
      { widgetId: "mobile-share", value: mobilePercent, dailyPeak: metrics.dailyPeak, label: WIDGET_LABELS["mobile-share"] },
      { widgetId: "top-source", value: metrics.sourceCounts[0]?.[1] ?? 0, dailyPeak: metrics.dailyPeak, label: WIDGET_LABELS["top-source"] },
    ] });
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const totalDeviceTagged = metrics.mobile + metrics.desktop;
  const mobilePercent = totalDeviceTagged ? Math.round((metrics.mobile / totalDeviceTagged) * 100) : 0;

  const moveWidget = (widgetId: WidgetId, direction: -1 | 1) => {
    setWidgetOrder((current) => {
      const index = current.indexOf(widgetId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const dropWidget = (targetId: WidgetId) => {
    if (!draggedWidget || draggedWidget === targetId) return;
    setWidgetOrder((current) => {
      const next = [...current];
      const from = next.indexOf(draggedWidget);
      const to = next.indexOf(targetId);
      if (from < 0 || to < 0) return current;
      next.splice(from, 1);
      next.splice(to, 0, draggedWidget);
      return next;
    });
    setDraggedWidget(null);
  };

  const renderWidget = (id: WidgetId): ReactNode => {
    if (id === "new-today") return <><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">New today</p><p className="mt-1 text-2xl font-semibold text-foreground">{metrics.newToday}</p><p className="mt-1 text-xs text-muted-foreground">Roadmap submissions</p></>;
    if (id === "open-queue") return <><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Open lead queue</p><p className="mt-1 text-2xl font-semibold text-foreground">{metrics.open}</p><p className="mt-1 text-xs text-muted-foreground">New or contacted</p></>;
    if (id === "mobile-share") return <><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mobile browser share</p><p className="mt-1 text-2xl font-semibold text-foreground">{mobilePercent}%</p><p className="mt-1 text-xs text-muted-foreground">{metrics.mobile} mobile · {metrics.desktop} desktop</p></>;
    return <><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top stored source</p><p className="mt-1 truncate text-lg font-semibold text-foreground">{metrics.sourceCounts[0] ? displaySource(metrics.sourceCounts[0][0]) : "No leads yet"}</p><p className="mt-1 text-xs text-muted-foreground">{metrics.sourceCounts[0]?.[1] ?? 0} recorded lead{metrics.sourceCounts[0]?.[1] === 1 ? "" : "s"}</p></>;
  };

  return <section className="mb-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 shadow-sm sm:p-6" aria-labelledby="executive-command-center-title">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl"><div className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /><h2 id="executive-command-center-title" className="font-display text-xl font-semibold text-foreground">Executive workday command center</h2></div><p className="mt-1.5 text-sm leading-6 text-muted-foreground">A real-data operating view for prioritizing lead response, campaign review, and team oversight. AI suggestions are internal workflow guidance only and never send, save, qualify, or approve anything automatically.</p></div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end"><Button type="button" size="sm" variant={customizing ? "default" : "outline"} onClick={() => setCustomizing((value) => !value)} aria-pressed={customizing}><GripVertical className="mr-1.5 h-4 w-4" />{customizing ? "Done customizing" : "Customize layout"}</Button><Button type="button" size="sm" variant={optimizerEnabled ? "default" : "outline"} onClick={() => setOptimizer.mutate({ enabled: !optimizerEnabled })} disabled={setOptimizer.isPending || layoutQuery.isLoading} role="switch" aria-checked={optimizerEnabled} className="w-full shrink-0 sm:w-auto"><Sparkles className="mr-1.5 h-4 w-4" />{setOptimizer.isPending ? "Saving setting…" : `AI optimizer: ${optimizerEnabled ? "On" : "Off"}`}</Button><Button type="button" size="sm" variant="outline" onClick={runLayoutOptimizer} disabled={!optimizerEnabled || optimizeLayout.isPending || layoutQuery.isLoading} className="w-full shrink-0 sm:w-auto"><Sparkles className="mr-1.5 h-4 w-4" />{optimizeLayout.isPending ? "Optimizing layout…" : "Optimize layout with AI"}</Button><Button type="button" size="sm" onClick={runExecutiveReview} disabled={review.isPending} className="w-full shrink-0 sm:w-auto"><Sparkles className="mr-1.5 h-4 w-4" />{review.isPending ? "Preparing review…" : "AI review today’s queue"}</Button></div>
    </div>
    {customizing && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/35 bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground" role="status"><GripVertical className="h-4 w-4 text-primary" />Drag a widget to reorder it, or use the keyboard move controls. Your layout is saved to your dashboard profile.<Button type="button" size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => { setWidgetOrder([...DEFAULT_WIDGET_ORDER]); resetLayout.mutate(); }} disabled={resetLayout.isPending}><RotateCcw className="mr-1 h-3.5 w-3.5" />{resetLayout.isPending ? "Resetting…" : "Reset to Default Layout"}</Button></div>}
    {optimizerNotice && <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700" role="status" aria-live="polite"><Check className="h-3.5 w-3.5" />{optimizerNotice}</p>}
    {optimizerRationale && <p className="mt-3 text-xs text-muted-foreground" role="status" aria-live="polite"><Sparkles className="mr-1 inline h-3.5 w-3.5 text-violet-600" />AI layout note: {optimizerRationale}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Executive metrics">
      {widgetOrder.map((id, index) => <div key={id} draggable={customizing} onDragStart={() => setDraggedWidget(id)} onDragEnd={() => setDraggedWidget(null)} onDragOver={(event) => { if (customizing) event.preventDefault(); }} onDrop={() => dropWidget(id)} className={`rounded-xl border border-border bg-background/80 p-3 ${customizing ? "cursor-grab border-primary/35 focus-within:ring-2 focus-within:ring-ring active:cursor-grabbing" : ""}`} tabIndex={customizing ? 0 : undefined} aria-label={`${WIDGET_LABELS[id]}${customizing ? ". Draggable widget." : ""}`}>
        <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1">{renderWidget(id)}</div>{customizing && <div className="flex shrink-0 items-center gap-0.5"><GripVertical className="h-4 w-4 text-primary" aria-hidden="true" /><Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveWidget(id, -1)} disabled={index === 0} aria-label={`Move ${WIDGET_LABELS[id]} earlier`}><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveWidget(id, 1)} disabled={index === widgetOrder.length - 1} aria-label={`Move ${WIDGET_LABELS[id]} later`}><ArrowDown className="h-3.5 w-3.5" /></Button></div>}</div>
      </div>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Executive command shortcuts"><span className="mr-1 text-xs font-semibold text-muted-foreground">Open:</span>{sectionLinks.map(({ id, label, icon: Icon }) => <Button key={id} type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => scrollTo(id)}><Icon className="mr-1.5 h-3.5 w-3.5" />{label}</Button>)}</div>
    {review.isPending ? <div className="mt-4 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2.5 text-xs text-violet-950" role="status" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin" /> Reviewing the current private Roadmap queue…</div> : review.data ? <div className="mt-4 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] p-3" aria-live="polite"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-700" /><p className="text-sm font-semibold text-foreground">AI review: today’s queue</p></div><p className="mt-1 text-sm font-medium text-foreground">{review.data.headline}</p><ol className="mt-2 grid gap-2 md:grid-cols-2">{review.data.actions.map((action, index) => <li key={`${action.title}-${index}`} className="text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">{index + 1}. {action.title}</span><br />{action.detail}</li>)}</ol><p className="mt-3 text-[11px] text-muted-foreground">Generated from the displayed private lead summaries. Review the underlying records before acting.</p></div> : null}
  </section>;
}
