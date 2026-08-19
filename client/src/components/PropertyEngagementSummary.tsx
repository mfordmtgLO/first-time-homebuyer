import { Activity, ExternalLink, Loader2, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatPropertyActivityCount } from "@shared/propertyLeadSource";
import { formatPropertyActivityType } from "@shared/propertyActivity";
import { publicSiteUrl } from "@shared/publicSiteUrl";

/** Owner-facing leaderboard of active saved property pages, ranked by last-seven-day engagement. */
export default function PropertyEngagementSummary() {
  const weekly = trpc.propertyPages.weeklyEngagement.useQuery();

  return (
    <section id="property-engagement" className="mt-6 rounded-lg border border-primary/20 bg-card shadow-sm scroll-mt-24">
      <div className="flex flex-col justify-between gap-3 border-b border-primary/15 px-6 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-foreground"><Trophy className="h-5 w-5 text-primary" /> Weekly property engagement</h2>
          <p className="mt-1 text-sm text-muted-foreground">Active saved property pages ranked by privacy-minimized activity from the last 7 days.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary sm:self-auto"><Activity className="h-3.5 w-3.5" /> Last 7 days</div>
      </div>
      {weekly.isLoading ? <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div> : weekly.data?.length ? (
        <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
          {weekly.data.map((page, index) => (
            <a key={page.id} href={publicSiteUrl(`/property/${page.slug}`)} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-3 px-6 py-4 transition hover:bg-primary/[0.03]">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>#{index + 1}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-1 truncate font-semibold text-foreground">{page.address}<ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition group-hover:opacity-100" /></span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{page.latestActivityAt ? `${formatPropertyActivityType(page.latestActivityType)} · ${new Date(page.latestActivityAt).toLocaleString()}` : "No recent activity"}</span></span>
              <span className="shrink-0 text-right"><span className="block font-semibold text-primary">{formatPropertyActivityCount(page.weeklyActivityCount)}</span><span className="text-[10px] uppercase tracking-wide text-muted-foreground">this week</span></span>
            </a>
          ))}
        </div>
      ) : <div className="px-6 py-8 text-sm text-muted-foreground">No active saved property pages are available for weekly engagement ranking yet.</div>}
    </section>
  );
}
