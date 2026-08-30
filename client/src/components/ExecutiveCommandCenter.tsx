import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquareText, Megaphone, Rocket, Sparkles, Users, Workflow } from "lucide-react";
import { toast } from "sonner";

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

export function ExecutiveCommandCenter({ leads }: Props) {
  const review = trpc.workflowAi.review.useMutation({
    onError: (error) => toast.error(error.message || "The executive review could not be prepared."),
  });
  const metrics = useMemo(() => {
    const today = startOfToday();
    const newToday = leads.filter((lead) => lead.status === "new" && new Date(lead.createdAt).getTime() >= today).length;
    const open = leads.filter((lead) => lead.status === "new" || lead.status === "contacted").length;
    const mobile = leads.filter((lead) => lead.captureDevice === "mobile").length;
    const desktop = leads.filter((lead) => lead.captureDevice !== "mobile").length;
    const sourceCounts = Array.from(leads.reduce((counts, lead) => counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1), new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1]);
    const records = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10).map((lead) => ({ label: `${lead.firstName || "Unnamed lead"} · ${lead.source}`, status: lead.status, meta: `${lead.email || "No email"} · ${lead.captureDevice === "mobile" ? "Mobile Browser" : "Desktop Browser"}` }));
    return { newToday, open, mobile, desktop, sourceCounts, records };
  }, [leads]);

  const runExecutiveReview = () => {
    review.mutate({ section: "roadmap-leads", records: metrics.records });
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const totalDeviceTagged = metrics.mobile + metrics.desktop;
  const mobilePercent = totalDeviceTagged ? Math.round((metrics.mobile / totalDeviceTagged) * 100) : 0;

  return <section className="mb-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 shadow-sm sm:p-6" aria-labelledby="executive-command-center-title">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl"><div className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /><h2 id="executive-command-center-title" className="font-display text-xl font-semibold text-foreground">Executive workday command center</h2></div><p className="mt-1.5 text-sm leading-6 text-muted-foreground">A real-data operating view for prioritizing lead response, campaign review, and team oversight. AI suggestions are internal workflow guidance only and never send, save, qualify, or approve anything automatically.</p></div>
      <Button type="button" size="sm" onClick={runExecutiveReview} disabled={review.isPending} className="w-full shrink-0 sm:w-auto"><Sparkles className="mr-1.5 h-4 w-4" />{review.isPending ? "Preparing review…" : "AI review today’s queue"}</Button>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-border bg-background/80 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">New today</p><p className="mt-1 text-2xl font-semibold text-foreground">{metrics.newToday}</p><p className="mt-1 text-xs text-muted-foreground">Roadmap submissions</p></div>
      <div className="rounded-xl border border-border bg-background/80 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Open lead queue</p><p className="mt-1 text-2xl font-semibold text-foreground">{metrics.open}</p><p className="mt-1 text-xs text-muted-foreground">New or contacted</p></div>
      <div className="rounded-xl border border-border bg-background/80 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mobile browser share</p><p className="mt-1 text-2xl font-semibold text-foreground">{mobilePercent}%</p><p className="mt-1 text-xs text-muted-foreground">{metrics.mobile} mobile · {metrics.desktop} desktop</p></div>
      <div className="rounded-xl border border-border bg-background/80 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top stored source</p><p className="mt-1 truncate text-lg font-semibold text-foreground">{metrics.sourceCounts[0] ? displaySource(metrics.sourceCounts[0][0]) : "No leads yet"}</p><p className="mt-1 text-xs text-muted-foreground">{metrics.sourceCounts[0]?.[1] ?? 0} recorded lead{metrics.sourceCounts[0]?.[1] === 1 ? "" : "s"}</p></div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Executive command shortcuts"><span className="mr-1 text-xs font-semibold text-muted-foreground">Open:</span>{sectionLinks.map(({ id, label, icon: Icon }) => <Button key={id} type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => scrollTo(id)}><Icon className="mr-1.5 h-3.5 w-3.5" />{label}</Button>)}</div>
    {review.isPending ? <div className="mt-4 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2.5 text-xs text-violet-950" role="status" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin" /> Reviewing the current private Roadmap queue…</div> : review.data ? <div className="mt-4 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] p-3" aria-live="polite"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-700" /><p className="text-sm font-semibold text-foreground">AI review: today’s queue</p></div><p className="mt-1 text-sm font-medium text-foreground">{review.data.headline}</p><ol className="mt-2 grid gap-2 md:grid-cols-2">{review.data.actions.map((action, index) => <li key={`${action.title}-${index}`} className="text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">{index + 1}. {action.title}</span><br />{action.detail}</li>)}</ol><p className="mt-3 text-[11px] text-muted-foreground">Generated from the displayed private lead summaries. Review the underlying records before acting.</p></div> : null}
  </section>;
}
