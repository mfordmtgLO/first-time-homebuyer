import { useMemo, useState } from "react";
import { Activity, ChevronDown, Copy, Download, ExternalLink, House, ImageOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { formatPropertyActivityCount, formatPropertyPairingSummary, getPropertyStreetAddress } from "@shared/propertyLeadSource";
import { formatPropertyActivityType, PROPERTY_ACTIVITY_RANGE_LABELS, type PropertyActivityRange } from "@shared/propertyActivity";
import { publicSiteUrl } from "@shared/publicSiteUrl";
import { getPropertyHeroMedia, parsePropertyLandingSnapshot } from "@shared/propertyLandingPage";
import { toast } from "sonner";

type PropertyPageSourceSummaryProps = {
  propertyLandingPageId: number | null;
  address: string;
  propertyPageSlug: string | null;
  listingSnapshot: string | null;
  activityCount: number;
  latestActivityType: string | null;
  latestActivityAt: Date | null;
  activityRange: PropertyActivityRange;
  loanOfficerName: string | null;
  agentName: string | null;
};

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** A compact source-cell control that keeps property-page attribution and period-scoped engagement readable in dashboard tables. */
export default function PropertyPageSourceSummary({
  propertyLandingPageId,
  address,
  propertyPageSlug,
  listingSnapshot,
  activityCount,
  latestActivityType,
  latestActivityAt,
  activityRange,
  loanOfficerName,
  agentName,
}: PropertyPageSourceSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const streetAddress = getPropertyStreetAddress(address);
  const pairingSummary = formatPropertyPairingSummary(loanOfficerName, agentName);
  const propertyUrl = propertyPageSlug ? publicSiteUrl(`/property/${propertyPageSlug}`) : null;
  const snapshot = listingSnapshot ? parsePropertyLandingSnapshot(listingSnapshot) : null;
  const heroMedia = snapshot ? getPropertyHeroMedia(snapshot) : { kind: "unavailable" as const };
  const timeline = trpc.propertyPages.activity.useQuery(
    { propertyLandingPageId: propertyLandingPageId ?? 1, activityRange },
    { enabled: timelineOpen && propertyLandingPageId !== null },
  );
  const periodLabel = PROPERTY_ACTIVITY_RANGE_LABELS[activityRange];
  const latestActivityLabel = latestActivityAt
    ? `${formatPropertyActivityType(latestActivityType)} · ${new Date(latestActivityAt).toLocaleString()}`
    : "No activity in this period";
  const eventTypeOptions = useMemo(
    () => Array.from(new Set((timeline.data ?? []).map((event) => event.eventType))).sort(),
    [timeline.data],
  );
  const filteredTimeline = useMemo(
    () => (timeline.data ?? []).filter((event) => eventTypeFilter === "all" || event.eventType === eventTypeFilter),
    [timeline.data, eventTypeFilter],
  );

  const copyToClipboard = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Unable to copy. Please select and copy the text instead.");
    }
  };

  const downloadTimelineCsv = () => {
    const csv = [
      ["Property address", "Activity type", "Detail", "Timestamp"],
      ...filteredTimeline.map((event) => [address, formatPropertyActivityType(event.eventType), event.detail ?? "", new Date(event.createdAt).toLocaleString()]),
    ].map((row) => row.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${propertyPageSlug ?? "property"}-engagement-${activityRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Filtered engagement timeline exported.");
  };

  const activityButton = (className: string) => (
    <button
      type="button"
      onClick={() => setTimelineOpen(true)}
      disabled={propertyLandingPageId === null}
      className={`btn-press inline-flex items-center gap-1 rounded text-left text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground ${className}`}
      title="Open this property page’s engagement timeline"
    >
      <Activity className="h-3 w-3 shrink-0" />
      {formatPropertyActivityCount(activityCount)}
    </button>
  );

  return (
    <div className="min-w-48 max-w-64">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="btn-press w-full rounded-md p-1 text-left transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="Show the full property-page source and co-brand pairing"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/5 text-[10px] font-semibold text-primary">
            <House className="mr-1 h-3 w-3" /> Single-property website
          </Badge>
          <span className="truncate text-xs font-semibold text-foreground">{streetAddress}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-primary transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[11px] text-muted-foreground">
        {activityButton("font-medium")}
        <span>· {pairingSummary}</span>
      </div>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={latestActivityLabel}>{latestActivityLabel}</p>

      {expanded && (
        <div className="mt-1.5 flex gap-2 rounded-md border border-primary/15 bg-primary/[0.03] p-2 text-[11px] leading-relaxed text-muted-foreground">
          {heroMedia.kind === "saved_listing_photo" ? (
            <img src={heroMedia.url} alt={`Saved listing thumbnail for ${streetAddress}`} className="h-16 w-16 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded bg-muted px-1 text-center text-[9px] text-muted-foreground"><ImageOff className="mb-1 h-3.5 w-3.5" />No saved photo</div>
          )}
          <div className="min-w-0 flex-1">
            <p><span className="font-medium text-foreground">Full address:</span> {address}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5"><span><span className="font-medium text-foreground">Co-brand pairing:</span> {pairingSummary}</span><button type="button" onClick={() => void copyToClipboard(pairingSummary, "LO-agent pairing copied.")} className="btn-press inline-flex items-center gap-1 rounded border border-primary/20 bg-card px-1.5 py-0.5 font-medium text-primary hover:bg-primary/5" title="Copy LO-agent pairing"><Copy className="h-3 w-3" /> Copy pairing</button></div>
            <div className="mt-1 flex flex-wrap items-center gap-1"><span className="font-medium text-foreground">Engagement ({periodLabel}):</span> {activityButton("rounded border border-primary/20 bg-card px-1.5 py-0.5 font-medium hover:bg-primary/5")}<span>· {latestActivityLabel}</span></div>
            {propertyUrl ? (
              <div className="mt-1.5 flex items-start gap-1.5">
                <a href={propertyUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all font-medium text-primary hover:underline">
                  <ExternalLink className="mr-1 inline h-3 w-3 shrink-0" /> {propertyUrl}
                </a>
                <button type="button" onClick={() => void copyToClipboard(propertyUrl, "Property page URL copied.")} className="btn-press inline-flex shrink-0 items-center gap-1 rounded border border-primary/20 bg-card px-1.5 py-1 font-medium text-primary hover:bg-primary/5" title="Copy property page URL">
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
            ) : <p className="mt-1.5">The saved property-page URL is unavailable.</p>}
          </div>
        </div>
      )}

      <Dialog open={timelineOpen} onOpenChange={setTimelineOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{streetAddress} engagement timeline</DialogTitle>
            <DialogDescription>Owner-only, privacy-minimized page activity for {periodLabel.toLowerCase()}.</DialogDescription>
          </DialogHeader>
          {timeline.isLoading ? <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <>
              <div className="flex flex-col gap-2 border-y border-border/70 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger className="h-8 w-full text-xs sm:w-56" aria-label="Filter property timeline by activity type"><SelectValue placeholder="All activity types" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All activity types</SelectItem>{eventTypeOptions.map((eventType) => <SelectItem key={eventType} value={eventType}>{formatPropertyActivityType(eventType)}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={downloadTimelineCsv} disabled={filteredTimeline.length === 0}><Download className="mr-1.5 h-3.5 w-3.5" /> Export filtered CSV</Button>
              </div>
              {filteredTimeline.length ? (
                <ol className="space-y-2 py-3">
                  {filteredTimeline.map((event) => <li key={event.id} className="rounded-md border border-border bg-muted/40 px-3 py-2"><p className="font-medium text-foreground">{formatPropertyActivityType(event.eventType)}</p><p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}{event.detail ? ` · ${event.detail}` : ""}</p></li>)}
                </ol>
              ) : <p className="py-8 text-center text-sm text-muted-foreground">No matching property-page activity was recorded for this period.</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
