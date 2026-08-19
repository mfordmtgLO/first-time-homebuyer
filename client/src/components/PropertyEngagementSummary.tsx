import { useEffect, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, ExternalLink, Flame, Loader2, Minus, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { formatPropertyActivityCount } from "@shared/propertyLeadSource";
import { formatPropertyActivityType } from "@shared/propertyActivity";
import { getEngagementTrend, HIGH_ACTIVITY_WEEKLY_THRESHOLD, isHighWeeklyActivity } from "@shared/propertyEngagement";
import { publicSiteUrl } from "@shared/publicSiteUrl";
import { toast } from "sonner";

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  const trend = getEngagementTrend(current, previous);
  if (trend.direction === "new") return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700"><ArrowUpRight className="h-3 w-3" /> New this week</span>;
  if (trend.direction === "up") return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700"><ArrowUpRight className="h-3 w-3" /> {trend.percentChange}% vs prior week</span>;
  if (trend.direction === "down") return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-700"><ArrowDownRight className="h-3 w-3" /> {Math.abs(trend.percentChange ?? 0)}% vs prior week</span>;
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground"><Minus className="h-3 w-3" /> Flat vs prior week</span>;
}

function ConversionIndicator({ activities, capturedLeads }: { activities: number; capturedLeads: number }) {
  const conversion = activities > 0 ? Math.round((capturedLeads / activities) * 100) : 0;
  return <span className="mt-1 block text-[10px] font-medium text-muted-foreground">{capturedLeads} captured lead{capturedLeads === 1 ? "" : "s"} · {conversion}% conversion</span>;
}

/** Owner-facing leaderboard of active saved property pages, ranked by last-seven-day engagement. */
export default function PropertyEngagementSummary() {
  const utils = trpc.useUtils();
  const weekly = trpc.propertyPages.weeklyEngagement.useQuery();
  const setting = trpc.propertyPages.engagementSetting.useQuery();
  const [thresholdDraft, setThresholdDraft] = useState(String(HIGH_ACTIVITY_WEEKLY_THRESHOLD));
  const highActivityThreshold = setting.data?.highActivityThreshold ?? HIGH_ACTIVITY_WEEKLY_THRESHOLD;
  useEffect(() => setThresholdDraft(String(highActivityThreshold)), [highActivityThreshold]);
  const saveThreshold = trpc.propertyPages.saveEngagementThreshold.useMutation({
    onSuccess: async () => {
      await utils.propertyPages.engagementSetting.invalidate();
      toast.success("High-activity alert threshold saved.");
    },
    onError: (error) => toast.error(error.message || "Unable to save the alert threshold."),
  });
  const submitThreshold = () => {
    const value = Number(thresholdDraft);
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      toast.error("Enter a whole-number threshold from 1 to 1,000 activities.");
      return;
    }
    saveThreshold.mutate({ highActivityThreshold: value });
  };

  return (
    <section id="property-engagement" className="mt-6 rounded-lg border border-primary/20 bg-card shadow-sm scroll-mt-24">
      <div className="flex flex-col justify-between gap-3 border-b border-primary/15 px-6 py-5 xl:flex-row xl:items-center">
        <div>
          <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-foreground"><Trophy className="h-5 w-5 text-primary" /> Weekly property engagement</h2>
          <p className="mt-1 text-sm text-muted-foreground">Active saved property pages ranked by privacy-minimized activity from the last 7 days.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto"><div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"><Activity className="h-3.5 w-3.5" /> Last 7 days</div><label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">Alert at<Input value={thresholdDraft} onChange={(event) => setThresholdDraft(event.target.value)} type="number" min={1} max={1000} inputMode="numeric" className="h-8 w-16 text-center text-xs" aria-label="Weekly high-activity alert threshold" />activities</label><Button variant="outline" size="sm" className="h-8 text-xs" onClick={submitThreshold} disabled={saveThreshold.isPending || thresholdDraft === String(highActivityThreshold)}>{saveThreshold.isPending ? "Saving…" : "Save"}</Button></div>
      </div>
      {weekly.isLoading ? <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div> : weekly.data?.length ? (
        <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
          {weekly.data.map((page, index) => {
            const highActivity = isHighWeeklyActivity(page.weeklyActivityCount, highActivityThreshold);
            return <a key={page.id} href={publicSiteUrl(`/property/${page.slug}`)} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-3 px-6 py-4 transition hover:bg-primary/[0.03]">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>#{index + 1}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-1 truncate font-semibold text-foreground">{page.address}<ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition group-hover:opacity-100" /></span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{page.latestActivityAt ? `${formatPropertyActivityType(page.latestActivityType)} · ${new Date(page.latestActivityAt).toLocaleString()}` : "No recent activity"}</span><span className="mt-1 block"><TrendIndicator current={page.weeklyActivityCount} previous={page.priorWeekActivityCount} /></span><ConversionIndicator activities={page.weeklyActivityCount} capturedLeads={page.weeklyCapturedLeadCount} /></span>
              <span className="shrink-0 text-right"><span className="block font-semibold text-primary">{formatPropertyActivityCount(page.weeklyActivityCount)}</span><span className="text-[10px] uppercase tracking-wide text-muted-foreground">this week</span>{highActivity && <Badge className="mt-1.5 border border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-800" variant="outline" title={`High activity: ${highActivityThreshold}+ weekly events`}><Flame className="mr-1 h-3 w-3" /> High activity</Badge>}</span>
            </a>;
          })}
        </div>
      ) : <div className="px-6 py-8 text-sm text-muted-foreground">No active saved property pages are available for weekly engagement ranking yet.</div>}
    </section>
  );
}
