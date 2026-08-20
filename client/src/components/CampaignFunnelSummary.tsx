import { useMemo, useState } from "react";
import { BarChart3, Download, DollarSign, FileText, Link2, MapPinned, MessageCircle, Trash2, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { roadmapCohort, type RoadmapCohort } from "@shared/campaignCohorts";

type CampaignDateRange = "all" | "7d" | "30d" | "90d";

type AttributionFields = {
  createdAt: Date | string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

const CAMPAIGN_DATE_RANGES: Array<{ value: CampaignDateRange; label: string; days: number | null }> = [
  { value: "all", label: "All time", days: null },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

const CAMPAIGN_PRESETS = [
  { label: "Facebook", source: "facebook", medium: "paid_social", campaign: "firsthome", content: "" },
  { label: "Google", source: "google", medium: "paid_search", campaign: "firsthome", content: "" },
  { label: "Email", source: "email", medium: "email", campaign: "firsthome", content: "" },
] as const;

const AD_PLATFORM_PRESETS = [
  { key: "facebook", label: "Facebook Ads", source: "facebook", medium: "paid_social" },
  { key: "google", label: "Google Ads", source: "google", medium: "paid_search" },
] as const;

function campaignLabel(row: { utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null }) {
  if (!row.utmSource && !row.utmCampaign) return "Direct / untagged";
  return [row.utmSource, row.utmMedium, row.utmCampaign].filter(Boolean).join(" · ");
}

function isTaggedSubmission(lead: AttributionFields) {
  return Boolean(lead.utmSource || lead.utmMedium || lead.utmCampaign || lead.utmContent || lead.utmTerm);
}

function isWithinDateRange(lead: AttributionFields, range: CampaignDateRange) {
  return isDateWithinRange(lead.createdAt, range);
}

function isDateWithinRange(value: Date | string, range: CampaignDateRange) {
  const days = CAMPAIGN_DATE_RANGES.find((item) => item.value === range)?.days;
  if (!days) return true;
  const timestamp = new Date(value).getTime();
  return !Number.isFinite(timestamp) || timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function campaignIdentity(row: { utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null }) {
  const source = row.utmSource?.trim().toLowerCase() ?? "";
  const medium = row.utmMedium?.trim().toLowerCase() ?? "";
  const campaign = row.utmCampaign?.trim().toLowerCase() ?? "";
  return { key: `${source}\u0001${medium}\u0001${campaign}`, source, medium, campaign, label: [source, medium, campaign].filter(Boolean).join(" · ") || "Tagged campaign" };
}

function formatCurrency(cents: number | null) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

type UTMGuidanceProps = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  generatedUrl: string;
  copyStatus: string | null;
  onSourceChange: (value: string) => void;
  onMediumChange: (value: string) => void;
  onCampaignChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onPreset: (preset: (typeof CAMPAIGN_PRESETS)[number]) => void;
  onCopy: () => void;
};

function UTMGuidance({ source, medium, campaign, content, term, generatedUrl, copyStatus, onSourceChange, onMediumChange, onCampaignChange, onContentChange, onTermChange, onPreset, onCopy }: UTMGuidanceProps) {
  return (
    <details className="mt-4 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-foreground">How to tag a campaign link</summary>
      <p className="mt-2 text-muted-foreground">Set a source, medium, and campaign before sharing an approved public landing-page link. Tagged Roadmap and completed chat submissions automatically unlock the full attribution report.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Standard presets</span>
        {CAMPAIGN_PRESETS.map((preset) => <Button key={preset.label} type="button" size="sm" variant="outline" onClick={() => onPreset(preset)}>{preset.label}</Button>)}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-medium text-muted-foreground">UTM source<input value={source} onChange={(event) => onSourceChange(event.target.value)} placeholder="facebook" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
        <label className="text-xs font-medium text-muted-foreground">UTM medium<input value={medium} onChange={(event) => onMediumChange(event.target.value)} placeholder="paid_social" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
        <label className="text-xs font-medium text-muted-foreground">UTM campaign<input value={campaign} onChange={(event) => onCampaignChange(event.target.value)} placeholder="firsthome" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
        <label className="text-xs font-medium text-muted-foreground">UTM content <span className="font-normal">(optional)</span><input value={content} onChange={(event) => onContentChange(event.target.value)} placeholder="video_a" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
        <label className="text-xs font-medium text-muted-foreground">UTM term <span className="font-normal">(optional)</span><input value={term} onChange={(event) => onTermChange(event.target.value)} placeholder="first_time_buyer" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input aria-label="Generated UTM campaign link" readOnly value={generatedUrl} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-muted/40 px-2.5 text-xs text-foreground" />
        <Button type="button" size="sm" onClick={onCopy}><Link2 className="mr-1.5 h-3.5 w-3.5" />{copyStatus ?? "Copy tagged link"}</Button>
      </div>
    </details>
  );
}

export default function CampaignFunnelSummary() {
  const roadmapQuery = trpc.leads.list.useQuery();
  const chatQuery = trpc.chat.list.useQuery();
  const utils = trpc.useUtils();
  const campaignSpendQuery = trpc.campaignSpend.list.useQuery();
  const [dateRange, setDateRange] = useState<CampaignDateRange>("all");
  const [utmSource, setUtmSource] = useState("facebook");
  const [utmMedium, setUtmMedium] = useState("paid_social");
  const [utmCampaign, setUtmCampaign] = useState("firsthome");
  const [utmContent, setUtmContent] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [spendSource, setSpendSource] = useState("facebook");
  const [spendMedium, setSpendMedium] = useState("paid_social");
  const [spendCampaign, setSpendCampaign] = useState("firsthome");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendDate, setSpendDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [spendNotes, setSpendNotes] = useState("");
  const [spendError, setSpendError] = useState<string | null>(null);
  const addSpendMutation = trpc.campaignSpend.add.useMutation({ onSuccess: () => utils.campaignSpend.list.invalidate() });
  const deleteSpendMutation = trpc.campaignSpend.delete.useMutation({ onSuccess: () => utils.campaignSpend.list.invalidate() });
  const roadmap = roadmapQuery.data ?? [];
  const chats = chatQuery.data ?? [];
  const spendEntries = campaignSpendQuery.data ?? [];
  const qualifiedChats = chats.filter((lead) => lead.status === "qualified");
  const attributionSubmissions = [...roadmap, ...qualifiedChats];
  const taggedSubmissionCount = attributionSubmissions.filter(isTaggedSubmission).length;
  const showFullAttribution = taggedSubmissionCount > 0;
  const filteredRoadmap = roadmap.filter((lead) => isWithinDateRange(lead, dateRange));
  const filteredChats = chats.filter((lead) => isWithinDateRange(lead, dateRange));
  const filteredQualifiedChats = filteredChats.filter((lead) => lead.status === "qualified");
  const homesListRequests = filteredChats.filter((lead) => lead.lowDownPaymentHomeSearch === 1);
  const buyerAgentRequests = filteredChats.filter((lead) => lead.buyerAgentRequest === 1);
  const taggedRows = [
    ...filteredRoadmap.filter(isTaggedSubmission).map((lead) => ({
      submittedAt: lead.createdAt,
      submissionType: "Roadmap request",
      name: lead.firstName,
      email: lead.email,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      utmContent: lead.utmContent,
      utmTerm: lead.utmTerm,
      landingPath: lead.landingPath,
      referrerHost: lead.referrerHost,
    })),
    ...filteredQualifiedChats.filter(isTaggedSubmission).map((lead) => ({
      submittedAt: lead.completedAt ?? lead.createdAt,
      submissionType: "Completed chat intake",
      name: lead.fullName,
      email: lead.email,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      utmContent: lead.utmContent,
      utmTerm: lead.utmTerm,
      landingPath: lead.landingPath,
      referrerHost: lead.referrerHost,
    })),
  ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  const filteredSpendEntries = spendEntries.filter((entry) => isDateWithinRange(entry.spentOn, dateRange));
  const campaignPerformanceMap = new Map<string, { key: string; label: string; source: string; medium: string; campaign: string; submissions: number; spendCents: number; spendEntries: number }>();
  const ensureCampaignPerformance = (row: { utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null }) => {
    const identity = campaignIdentity(row);
    const current = campaignPerformanceMap.get(identity.key) ?? { ...identity, submissions: 0, spendCents: 0, spendEntries: 0 };
    campaignPerformanceMap.set(identity.key, current);
    return current;
  };
  taggedRows.forEach((row) => { ensureCampaignPerformance(row).submissions += 1; });
  filteredSpendEntries.forEach((entry) => {
    const current = ensureCampaignPerformance(entry);
    current.spendCents += entry.spendCents;
    current.spendEntries += 1;
  });
  const campaignPerformance = Array.from(campaignPerformanceMap.values()).sort((a, b) => b.submissions - a.submissions || b.spendCents - a.spendCents || a.label.localeCompare(b.label));
  const campaignChartRows = campaignPerformance.filter((row) => row.submissions > 0);
  const maxCampaignVolume = Math.max(1, ...campaignChartRows.map((row) => row.submissions));
  const totalCampaignSpendCents = filteredSpendEntries.reduce((sum, entry) => sum + entry.spendCents, 0);
  const platformMetrics = AD_PLATFORM_PRESETS.map((platform) => {
    const matchesPlatform = (row: { utmSource?: string | null }) => row.utmSource?.trim().toLowerCase() === platform.source;
    const platformTaggedRows = taggedRows.filter(matchesPlatform);
    const platformSpendEntries = filteredSpendEntries.filter(matchesPlatform);
    const platformSpendCents = platformSpendEntries.reduce((sum, entry) => sum + entry.spendCents, 0);
    const platformHomesList = filteredChats.filter((lead) => matchesPlatform(lead) && lead.lowDownPaymentHomeSearch === 1).length;
    const platformBuyerAgent = filteredChats.filter((lead) => matchesPlatform(lead) && lead.buyerAgentRequest === 1).length;
    return {
      ...platform,
      taggedLeads: platformTaggedRows.length,
      roadmapLeads: platformTaggedRows.filter((row) => row.submissionType === "Roadmap request").length,
      completedChats: platformTaggedRows.filter((row) => row.submissionType === "Completed chat intake").length,
      homesListRequests: platformHomesList,
      buyerAgentRequests: platformBuyerAgent,
      spendCents: platformSpendCents,
      costPerLeadCents: platformTaggedRows.length && platformSpendCents ? Math.round(platformSpendCents / platformTaggedRows.length) : null,
    };
  });

  const generatedUrl = useMemo(() => {
    const url = new URL("https://firsttimehomebuyer.manus.space/");
    if (utmSource.trim()) url.searchParams.set("utm_source", utmSource.trim());
    if (utmMedium.trim()) url.searchParams.set("utm_medium", utmMedium.trim());
    if (utmCampaign.trim()) url.searchParams.set("utm_campaign", utmCampaign.trim());
    if (utmContent.trim()) url.searchParams.set("utm_content", utmContent.trim());
    if (utmTerm.trim()) url.searchParams.set("utm_term", utmTerm.trim());
    return url.toString();
  }, [utmCampaign, utmContent, utmMedium, utmSource, utmTerm]);

  const copyGeneratedUrl = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopyStatus("Copied!");
    } catch {
      setCopyStatus("Select link to copy");
    }
    window.setTimeout(() => setCopyStatus(null), 1800);
  };

  const applyCampaignPreset = (preset: (typeof CAMPAIGN_PRESETS)[number]) => {
    setUtmSource(preset.source);
    setUtmMedium(preset.medium);
    setUtmCampaign(preset.campaign);
    setUtmContent(preset.content);
    setUtmTerm("");
  };

  const applySpendPlatformPreset = (preset: (typeof AD_PLATFORM_PRESETS)[number]) => {
    setSpendSource(preset.source);
    setSpendMedium(preset.medium);
    setSpendCampaign("firsthome");
  };

  const downloadTaggedRows = () => {
    const headers = ["Submitted at", "Submission type", "Name", "Email", "UTM source", "UTM medium", "UTM campaign", "UTM content", "UTM term", "Landing path", "Referrer host"];
    const csv = [headers, ...taggedRows.map((row) => [
      new Date(row.submittedAt).toISOString(), row.submissionType, row.name, row.email, row.utmSource, row.utmMedium, row.utmCampaign, row.utmContent, row.utmTerm, row.landingPath, row.referrerHost,
    ])].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campaign-attribution-${dateRange}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const saveCampaignSpend = () => {
    const normalizedAmount = Number(spendAmount.replace(/[$,\s]/g, ""));
    if (!spendSource.trim() || !spendMedium.trim() || !spendCampaign.trim()) {
      setSpendError("Source, medium, and campaign are required.");
      return;
    }
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setSpendError("Enter a positive dollar amount.");
      return;
    }
    setSpendError(null);
    addSpendMutation.mutate({
      utmSource: spendSource.trim(),
      utmMedium: spendMedium.trim(),
      utmCampaign: spendCampaign.trim(),
      spentOn: spendDate,
      spendCents: Math.round(normalizedAmount * 100),
      notes: spendNotes.trim() || undefined,
    }, {
      onSuccess: () => {
        setSpendAmount("");
        setSpendNotes("");
      },
      onError: (error) => setSpendError(error.message),
    });
  };

  const byCampaign = new Map<string, { roadmap: number; completedChats: number; homesList: number; buyerAgent: number }>();
  const byCampaignScenario = new Map<string, Record<RoadmapCohort, number>>();
  const add = (label: string, field: "roadmap" | "completedChats" | "homesList" | "buyerAgent") => {
    const current = byCampaign.get(label) ?? { roadmap: 0, completedChats: 0, homesList: 0, buyerAgent: 0 };
    current[field] += 1;
    byCampaign.set(label, current);
  };
  filteredRoadmap.forEach((lead) => {
    const label = campaignLabel(lead);
    add(label, "roadmap");
    const cohorts = byCampaignScenario.get(label) ?? { buydown: 0, costOfWaiting: 0, both: 0, noCalculator: 0 };
    cohorts[roadmapCohort(lead.scenario)] += 1;
    byCampaignScenario.set(label, cohorts);
  });
  filteredChats.forEach((lead) => {
    const label = campaignLabel(lead);
    if (lead.status === "qualified") add(label, "completedChats");
    if (lead.lowDownPaymentHomeSearch === 1) add(label, "homesList");
    if (lead.buyerAgentRequest === 1) add(label, "buyerAgent");
  });
  const rows = Array.from(byCampaign.entries())
    .map(([label, counts]) => ({ label, ...counts, total: counts.roadmap + counts.completedChats }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  const cohortRows = Array.from(byCampaignScenario.entries())
    .map(([label, counts]) => ({ label, ...counts, total: counts.buydown + counts.costOfWaiting + counts.both + counts.noCalculator }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  const cards = [
    { label: "Roadmap requests", value: filteredRoadmap.length, icon: FileText, tone: "text-primary bg-primary/10" },
    { label: "Completed chat intakes", value: filteredQualifiedChats.length, icon: MessageCircle, tone: "text-violet-700 bg-violet-600/10" },
    { label: "Homes-list requests", value: homesListRequests.length, icon: MapPinned, tone: "text-emerald-700 bg-emerald-600/10" },
    { label: "Buyer-agent requests", value: buyerAgentRequests.length, icon: UsersRound, tone: "text-amber-800 bg-amber-500/15" },
  ];

  const campaignReportingTools = (
    <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-lg border border-border bg-background/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tagged campaign volume comparison</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Qualifying Roadmap and completed chat submissions in the selected range.</p>
          </div>
          <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{taggedRows.length} tagged leads</span>
        </div>
        {campaignChartRows.length ? <div className="mt-4 space-y-3">{campaignChartRows.map((row) => (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-medium text-foreground">{row.label}</span><span className="shrink-0 text-muted-foreground">{row.submissions} lead{row.submissions === 1 ? "" : "s"}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${Math.max(6, (row.submissions / maxCampaignVolume) * 100)}%` }} /></div>
          </div>
        ))}</div> : <p className="mt-4 rounded-md bg-muted/50 px-3 py-3 text-sm text-muted-foreground">The chart will populate after the first UTM-tagged qualifying submission.</p>}
      </section>
      <section className="rounded-lg border border-border bg-background/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><DollarSign className="h-4 w-4 text-primary" /> Campaign budget & spend</h2><p className="mt-0.5 text-xs text-muted-foreground">Private dashboard input only. Total in range: {formatCurrency(totalCampaignSpendCents)}.</p></div>
          <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">CPL = spend ÷ tagged leads</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Ad platform quick fill</span>{AD_PLATFORM_PRESETS.map((platform) => <Button key={platform.key} type="button" size="sm" variant="outline" onClick={() => applySpendPlatformPreset(platform)}>{platform.label}</Button>)}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-medium text-muted-foreground">Source<input value={spendSource} onChange={(event) => setSpendSource(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
          <label className="text-xs font-medium text-muted-foreground">Medium<input value={spendMedium} onChange={(event) => setSpendMedium(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
          <label className="text-xs font-medium text-muted-foreground">Campaign<input value={spendCampaign} onChange={(event) => setSpendCampaign(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
          <label className="text-xs font-medium text-muted-foreground">Spend<input inputMode="decimal" value={spendAmount} onChange={(event) => setSpendAmount(event.target.value)} placeholder="450.00" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
          <label className="text-xs font-medium text-muted-foreground">Date<input type="date" value={spendDate} onChange={(event) => setSpendDate(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
          <label className="text-xs font-medium text-muted-foreground">Notes <span className="font-normal">(optional)</span><input value={spendNotes} onChange={(event) => setSpendNotes(event.target.value)} placeholder="June Meta budget" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground" /></label>
        </div>
        {spendError && <p className="mt-2 text-xs font-medium text-destructive">{spendError}</p>}
        <Button type="button" size="sm" className="mt-3" disabled={addSpendMutation.isPending} onClick={saveCampaignSpend}>{addSpendMutation.isPending ? "Saving…" : "Add private spend"}</Button>
      </section>
      <section className="xl:col-span-2 rounded-lg border border-border bg-background/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-foreground">Google Ads and Facebook Ads outcome comparison</h2><p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">Private ROI-style lead outcomes for the selected range. Spend per tagged lead and captured Roadmap/chat outcomes are shown; this is not revenue, booked-loan, click, or platform-reported conversion-value ROI.</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">UTM-attributed</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{platformMetrics.map((platform) => <div key={platform.key} className="rounded-lg border border-border bg-card p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-foreground">{platform.label}</h3><p className="mt-0.5 text-xs text-muted-foreground">Budget/spend: {formatCurrency(platform.spendCents)}</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">CPL {formatCurrency(platform.costPerLeadCents)}</span></div><dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><dt className="text-muted-foreground">Tagged leads</dt><dd className="mt-0.5 font-semibold text-foreground">{platform.taggedLeads}</dd></div><div><dt className="text-muted-foreground">Roadmap</dt><dd className="mt-0.5 font-semibold text-foreground">{platform.roadmapLeads}</dd></div><div><dt className="text-muted-foreground">Completed chat</dt><dd className="mt-0.5 font-semibold text-foreground">{platform.completedChats}</dd></div><div><dt className="text-muted-foreground">Homes list / agent</dt><dd className="mt-0.5 font-semibold text-foreground">{platform.homesListRequests} / {platform.buyerAgentRequests}</dd></div></dl></div>)}</div>
      </section>
      <section className="xl:col-span-2 overflow-x-auto rounded-lg border border-border bg-background/60">
        <div className="border-b border-border px-4 py-3"><h2 className="text-sm font-semibold text-foreground">Campaign cost per tagged lead</h2><p className="mt-0.5 text-xs text-muted-foreground">Spend and qualifying submissions are matched by UTM source, medium, and campaign for the selected range.</p></div>
        <table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground"><th className="px-4 py-2.5 font-semibold">Campaign</th><th className="px-4 py-2.5 text-right font-semibold">Tagged leads</th><th className="px-4 py-2.5 text-right font-semibold">Spend</th><th className="px-4 py-2.5 text-right font-semibold">Cost per lead</th></tr></thead><tbody>{campaignPerformance.length ? campaignPerformance.map((row) => <tr key={row.key} className="border-b border-border/60 last:border-0"><td className="px-4 py-3 font-medium text-foreground">{row.label}</td><td className="px-4 py-3 text-right">{row.submissions}</td><td className="px-4 py-3 text-right">{formatCurrency(row.spendCents || null)}</td><td className="px-4 py-3 text-right font-medium">{row.submissions && row.spendCents ? formatCurrency(Math.round(row.spendCents / row.submissions)) : "—"}</td></tr>) : <tr><td colSpan={4} className="px-4 py-7 text-center text-muted-foreground">Add private spend or capture a tagged lead to begin cost-per-lead reporting.</td></tr>}</tbody></table>
      </section>
      {filteredSpendEntries.length > 0 && <section className="xl:col-span-2 overflow-x-auto rounded-lg border border-border bg-background/60"><div className="border-b border-border px-4 py-3"><h2 className="text-sm font-semibold text-foreground">Recorded spend in range</h2></div><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground"><th className="px-4 py-2.5 font-semibold">Date</th><th className="px-4 py-2.5 font-semibold">Campaign</th><th className="px-4 py-2.5 font-semibold">Notes</th><th className="px-4 py-2.5 text-right font-semibold">Spend</th><th className="px-4 py-2.5" /></tr></thead><tbody>{filteredSpendEntries.map((entry) => <tr key={entry.id} className="border-b border-border/60 last:border-0"><td className="px-4 py-3">{new Date(entry.spentOn).toLocaleDateString()}</td><td className="px-4 py-3 font-medium text-foreground">{campaignIdentity(entry).label}</td><td className="px-4 py-3 text-muted-foreground">{entry.notes || "—"}</td><td className="px-4 py-3 text-right">{formatCurrency(entry.spendCents)}</td><td className="px-4 py-3 text-right"><Button type="button" size="icon" variant="ghost" aria-label={`Delete campaign spend entry ${entry.id}`} disabled={deleteSpendMutation.isPending} onClick={() => deleteSpendMutation.mutate({ id: entry.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></td></tr>)}</tbody></table></section>}
    </div>
  );

  const guidance = <UTMGuidance source={utmSource} medium={utmMedium} campaign={utmCampaign} content={utmContent} term={utmTerm} generatedUrl={generatedUrl} copyStatus={copyStatus} onSourceChange={setUtmSource} onMediumChange={setUtmMedium} onCampaignChange={setUtmCampaign} onContentChange={setUtmContent} onTermChange={setUtmTerm} onPreset={applyCampaignPreset} onCopy={copyGeneratedUrl} />;

  if (!showFullAttribution) {
    return (
      <section id="campaign-funnel" className="scroll-mt-24 mb-10 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 font-display text-xl font-semibold text-foreground"><BarChart3 className="h-5 w-5 text-primary" /> Campaign attribution</h1>
            <p className="mt-1 text-sm text-muted-foreground">No UTM-tagged Roadmap or completed chat submissions have arrived yet. Operational totals remain available in the Roadmap leads and Mortgage chat intake sections.</p>
          </div>
          <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Tag-ready</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span><strong className="text-foreground">{attributionSubmissions.length}</strong> qualifying submissions monitored</span>
          <span><strong className="text-foreground">0</strong> tagged campaign submissions</span>
          <span className="text-muted-foreground">The full campaign and calculator-cohort reports appear automatically after the first tagged submission.</span>
        </div>
        {campaignReportingTools}
        {guidance}
      </section>
    );
  }

  return (
    <section id="campaign-funnel" className="scroll-mt-24 mb-10 rounded-xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-foreground"><BarChart3 className="h-6 w-6 text-primary" /> Campaign funnel</h1>
          <p className="mt-1 text-sm text-muted-foreground">First-touch campaign attribution from Roadmap and mortgage-chat submissions. Browser conversion events remain tag-ready only until approved platform tracking is configured.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">Range<select aria-label="Campaign date range" value={dateRange} onChange={(event) => setDateRange(event.target.value as CampaignDateRange)} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="all">All time</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option></select></label>
          <Button type="button" size="sm" variant="outline" disabled={taggedRows.length === 0} onClick={downloadTaggedRows}><Download className="mr-1.5 h-3.5 w-3.5" />Export tagged CSV ({taggedRows.length})</Button>
          <span className="text-xs text-muted-foreground">{roadmapQuery.isFetching || chatQuery.isFetching ? "Refreshing…" : "Dashboard attribution"}</span>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-border bg-background/60 p-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></div>
            <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      {campaignReportingTools}
      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[680px] text-sm">
          <thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-2.5 font-semibold">First-touch campaign</th><th className="px-4 py-2.5 text-right font-semibold">Roadmap</th><th className="px-4 py-2.5 text-right font-semibold">Completed chat</th><th className="px-4 py-2.5 text-right font-semibold">Homes list</th><th className="px-4 py-2.5 text-right font-semibold">Buyer agent</th></tr></thead>
          <tbody>{rows.length ? rows.map((row) => <tr key={row.label} className="border-b border-border/60 last:border-0"><td className="px-4 py-3 font-medium text-foreground">{row.label}</td><td className="px-4 py-3 text-right">{row.roadmap}</td><td className="px-4 py-3 text-right">{row.completedChats}</td><td className="px-4 py-3 text-right">{row.homesList}</td><td className="px-4 py-3 text-right">{row.buyerAgent}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No qualifying campaign submissions match this date range.</td></tr>}</tbody>
        </table>
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Roadmap calculator cohorts by campaign</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Use this view to compare which tagged campaigns lead visitors to engage with the 2-1 buydown or cost-of-waiting education before requesting the Roadmap.</p>
        </div>
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-2.5 font-semibold">First-touch campaign</th><th className="px-4 py-2.5 text-right font-semibold">2-1 buydown</th><th className="px-4 py-2.5 text-right font-semibold">Cost of waiting</th><th className="px-4 py-2.5 text-right font-semibold">Both calculators</th><th className="px-4 py-2.5 text-right font-semibold">No calculator</th><th className="px-4 py-2.5 text-right font-semibold">Roadmap total</th></tr></thead>
          <tbody>{cohortRows.length ? cohortRows.map((row) => <tr key={row.label} className="border-b border-border/60 last:border-0"><td className="px-4 py-3 font-medium text-foreground">{row.label}</td><td className="px-4 py-3 text-right">{row.buydown}</td><td className="px-4 py-3 text-right">{row.costOfWaiting}</td><td className="px-4 py-3 text-right">{row.both}</td><td className="px-4 py-3 text-right">{row.noCalculator}</td><td className="px-4 py-3 text-right font-medium">{row.total}</td></tr>) : <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No Roadmap calculator cohorts match this date range.</td></tr>}</tbody>
        </table>
      </div>
      {guidance}
    </section>
  );
}
