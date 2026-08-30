/* Private leads dashboard — admin-only. Golden Hour Porch styling to match the brand. */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import AgentSettings from "@/components/AgentSettings";
import LoanOfficerSettings from "@/components/LoanOfficerSettings";
import ChatIntakeLeads from "@/components/ChatIntakeLeads";
import CampaignFunnelSummary from "@/components/CampaignFunnelSummary";
import PlatformLeadInbox from "@/components/PlatformLeadInbox";
import PropertyEngagementSummary from "@/components/PropertyEngagementSummary";
import GeoSphereListings from "@/components/GeoSphereListings";
import TextingWorkspace from "@/components/TextingWorkspace";
import PairingSpendTracker from "@/components/PairingSpendTracker";
import PropertyPageSourceSummary from "@/components/PropertyPageSourceSummary";
import { DashboardWorkdaySidebar } from "@/components/DashboardWorkdaySidebar";
import type { TrendLeadDestination } from "@/components/DashboardBrowserTools";
import { ExecutiveCommandCenter } from "@/components/ExecutiveCommandCenter";
import { TeamMemberWorkspacePanel, TeamWorkspaceActivation, TeamWorkspaceManagement } from "@/components/TeamWorkspaceManagement";
import { TeamTemplateSubmissionPanel } from "@/components/TeamTemplateSubmissionPanel";
import { TeamMemberProvisioningStatus } from "@/components/TeamWorkspaceProvisioning";
import BackupManagementPanel from "@/components/BackupManagementPanel";
import AdvertisingIntegrationSettings from "@/components/AdvertisingIntegrationSettings";
import {
  buildLeadWelcomeDraft,
  type LeadEmailAgent,
} from "@shared/leadEmailDraft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { hasUsableRoadmapPhone } from "@shared/roadmapPhone";
import { captureDeviceLabel } from "@/lib/captureDevice";
import { getPropertyActivitySince, PROPERTY_ACTIVITY_RANGES, PROPERTY_ACTIVITY_RANGE_LABELS, type PropertyActivityRange } from "@shared/propertyActivity";
import { getCoBrandAgentFilterOptions, getLoanOfficerFilterOptions, matchesSelectedCoBrandPair } from "@shared/roadmapPairFilters";
import { PUBLIC_SITE_ORIGIN } from "@shared/publicSiteUrl";
import {
  ArrowUp,
  Calculator,
  Check,
  Copy,
  Download,
  Filter,
  Inbox,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  NotebookPen,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  CircleCheck,
  CirclePause,
  MessageSquareText,
  Moon,
  Sun,
  Users,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const LOGO = "/manus-storage/cornerstone-logo-standard_72b02c9f.png";
const NEW_LEAD_WINDOW_MS = 24 * 60 * 60 * 1000;

function isRecentNewLead(lead: { status: string; createdAt: Date | string }) {
  const age = Date.now() - new Date(lead.createdAt).getTime();
  return lead.status === "new" && age >= 0 && age <= NEW_LEAD_WINDOW_MS;
}

const DASHBOARD_SECTIONS = [
  { id: "all-leads", label: "All leads" },
  { id: "campaign-funnel", label: "Funnel" },
  { id: "roadmap-leads", label: "Roadmap" },
  { id: "co-marketing-agents", label: "Agents" },
  { id: "loan-officers", label: "Loan officers" },
  { id: "texting-workspace", label: "Texting" },
  { id: "chat-intakes", label: "Chat intakes" },
  { id: "saved-qualifying-listings", label: "Listings" },
  { id: "pairing-spend-tracker", label: "Spend tracker" },
] as const;

type LeadStatus = "new" | "contacted" | "booked";
type LeadViewContext = "all" | "roadmap" | "chat";
type CombinedLeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: "Roadmap" | "Mortgage Chat";
  status: string;
  followUpRecorded: boolean;
  followUpLabel: string;
  submittedAt: Date | string;
  captureDevice: "mobile" | "desktop";
  destination: "roadmap" | "chat";
};

type CombinedOutcomeStat = {
  source: CombinedLeadRow["source"];
  captured: number;
  outcomeCount: number;
  outcomeLabel: string;
  followUpCount: number;
};
type CombinedSort = "newest" | "oldest" | "urgency";
type CombinedPageSize = 10 | 25 | 50;
const COMBINED_PAGE_SIZE_STORAGE_KEY = "dashboard-combined-leads-page-size";

function readCombinedPageSize(): CombinedPageSize {
  if (typeof window === "undefined") return 10;
  const stored = window.localStorage.getItem(COMBINED_PAGE_SIZE_STORAGE_KEY);
  return stored === "25" ? 25 : stored === "50" ? 50 : 10;
}

const combinedOutcomePercent = (count: number, total: number) => total === 0 ? "—" : `${Math.round((count / total) * 100)}%`;

function hasRoadmapFollowUp(lead: { status: string; notes?: string | null; notesUpdatedAt?: Date | string | null; sentToAgentAt?: Date | string | null }) {
  return Boolean(lead.notes?.trim() || lead.notesUpdatedAt || lead.sentToAgentAt || lead.status !== "new");
}

function hasChatFollowUp(lead: { notes?: string | null; recipientEmailStatus?: string | null; buyerAgentRequest?: number; buyerAgentRequestedAt?: Date | string | null }) {
  return Boolean(lead.notes?.trim() || lead.recipientEmailStatus === "sent" || lead.recipientEmailStatus === "manual_follow_up" || lead.buyerAgentRequest === 1 || lead.buyerAgentRequestedAt);
}


const STATUS_META: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-accent/15 text-accent-foreground border-accent/40" },
  contacted: { label: "Contacted", className: "bg-primary/10 text-primary border-primary/30" },
  booked: { label: "Booked", className: "bg-emerald-600/10 text-emerald-700 border-emerald-600/30" },
};

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

type Scenario = {
  purchasePrice: number;
  downPayment: number;
  noteRate: number;
  loanAmount: number;
  year1Payment: number;
  year2Payment: number;
  notePayment: number;
  year1MonthlySavings: number;
  year2MonthlySavings: number;
  totalSubsidy: number;
};

type CowScenario = {
  waitYears: number;
  monthlyRent: number;
  purchasePrice: number;
  downPayment: number;
  interestRate: number;
  appreciationRate: number;
  rentIncreaseRate?: number;
  monthlyPayment: number;
  totalRentPaid: number;
  equityGained: number;
  costOfWaiting: number;
};

type ParsedScenarios = { buydown: Scenario | null; costOfWaiting: CowScenario | null };

function parseScenario(raw: string | null): ParsedScenarios | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return null;
    // Combined payload: { buydown?, costOfWaiting? }
    if ("buydown" in s || "costOfWaiting" in s) {
      const buydown = s.buydown && typeof s.buydown.purchasePrice === "number" ? (s.buydown as Scenario) : null;
      const cow =
        s.costOfWaiting && typeof s.costOfWaiting.costOfWaiting === "number"
          ? (s.costOfWaiting as CowScenario)
          : null;
      if (buydown || cow) return { buydown, costOfWaiting: cow };
      return null;
    }
    // Legacy rows: bare buydown object
    if (typeof s.purchasePrice === "number") {
      return { buydown: s as Scenario, costOfWaiting: null };
    }
  } catch {
    // Malformed JSON — treat as no scenario rather than crashing the dashboard.
  }
  return null;
}

const usd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function LeadScenario({ scenarios, leadName }: { scenarios: ParsedScenarios; leadName: string }) {
  const { buydown, costOfWaiting: cow } = scenarios;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 font-medium text-accent-foreground bg-accent/15 border border-accent/40 rounded-full px-2.5 py-0.5 text-xs hover:bg-accent/25"
          aria-label={`Calculator scenarios for ${leadName}`}
        >
          <Calculator className="h-3.5 w-3.5" /> Scenario
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-h-96 overflow-y-auto">
        {buydown && (
          <div>
            <div className="text-sm font-semibold text-foreground">
              {leadName}'s 2-1 buydown scenario
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              {[
                ["Purchase price", usd(buydown.purchasePrice)],
                [
                  "Down payment",
                  `${usd(buydown.downPayment)} (${((buydown.downPayment / Math.max(buydown.purchasePrice, 1)) * 100).toFixed(1)}%)`,
                ],
                ["Loan amount", usd(buydown.loanAmount)],
                ["Note rate", `${buydown.noteRate}%`],
                ["Year 1 payment", `${usd(buydown.year1Payment)}/mo (saves ${usd(buydown.year1MonthlySavings)}/mo)`],
                ["Year 2 payment", `${usd(buydown.year2Payment)}/mo (saves ${usd(buydown.year2MonthlySavings)}/mo)`],
                ["Note-rate payment", `${usd(buydown.notePayment)}/mo`],
                ["Seller subsidy", usd(buydown.totalSubsidy)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {buydown && cow && <div className="my-3 border-t border-border" />}
        {cow && (
          <div>
            <div className="text-sm font-semibold text-foreground">
              {leadName}'s cost-of-waiting scenario
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              {[
                ["Waiting period", `${cow.waitYears} ${cow.waitYears === 1 ? "year" : "years"}`],
                ["Current rent", `${usd(cow.monthlyRent)}/mo`],
                ["Purchase price", usd(cow.purchasePrice)],
                [
                  "Down payment",
                  `${usd(cow.downPayment)} (${((cow.downPayment / Math.max(cow.purchasePrice, 1)) * 100).toFixed(1)}%)`,
                ],
                ["Interest rate", `${cow.interestRate}%`],
                ["Appreciation", `${cow.appreciationRate}%/yr`],
                ["Rent increase", cow.rentIncreaseRate !== undefined ? `${cow.rentIncreaseRate}%/yr` : "—"],
                ["Est. P&I payment", `${usd(cow.monthlyPayment)}/mo`],
                ["Rent paid if waiting", usd(cow.totalRentPaid)],
                ["Equity missed", usd(cow.equityGained)],
                ["Cost of waiting", usd(cow.costOfWaiting)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CopyLeadField({ value, label, leadName }: { value: string; label: "email" | "phone"; leadName: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label === "email" ? "Email" : "Phone"} copied for ${leadName}.`);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(`Couldn't copy the ${label}. Select it manually and copy.`);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Copy ${label} for ${leadName}`}
      title={copied ? "Copied" : `Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
    </button>
  );
}

function LeadNotes({
  leadId,
  leadName,
  notes,
  notesUpdatedAt,
}: {
  leadId: number;
  leadName: string;
  notes: string | null;
  notesUpdatedAt: Date | string | null;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const utils = trpc.useUtils();

  const updateNotes = trpc.leads.updateNotes.useMutation({
    onSuccess: () => {
      toast.success(`Notes saved for ${leadName}.`);
      setOpen(false);
      utils.leads.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Couldn't save notes. Please try again.");
    },
  });

  const hasNotes = Boolean(notes && notes.trim().length > 0);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(notes ?? "");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-2 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            hasNotes ? "text-primary" : "text-muted-foreground"
          }`}
          aria-label={`Notes for ${leadName}`}
        >
          <span className="inline-flex items-center gap-1.5"><NotebookPen className="h-4 w-4" />{hasNotes ? "Follow-up note" : "Add follow-up note"}</span>
          {notesUpdatedAt ? <span className="text-[11px] font-normal text-muted-foreground" title={`Last updated ${new Date(notesUpdatedAt).toLocaleString()}`}>Updated {new Date(notesUpdatedAt).toLocaleDateString()}</span> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-card text-card-foreground">
        <p className="text-sm font-semibold text-foreground">
          Follow-up notes for {leadName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Call details, follow-up reminders — only you can see these.
        </p>
          <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g., Called 7/12 — pre-approval sent, follow up Friday" aria-label={`Follow-up notes for ${leadName}`}
          className="mt-3 min-h-[110px] text-sm"
          maxLength={5000}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={updateNotes.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => updateNotes.mutate({ id: leadId, notes: draft })}
            disabled={updateNotes.isPending || draft === (notes ?? "")}
          >
            {updateNotes.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : null}
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type AgentOption = LeadEmailAgent;

type LeadEmailActionLead = {
  firstName: string;
  email: string;
  scenario: string | null;
  agentId: number | null;
  agentSource: "link" | "manual" | null;
};

function LeadEmailDraftAction({
  lead,
  agents,
}: {
  lead: LeadEmailActionLead;
  agents: AgentOption[];
}) {
  const openDraft = () => {
    const scenarios = parseScenario(lead.scenario);
    // A manual dashboard assignment is internal routing only. The agent profile
    // is introduced to the lead only when their original submission came from
    // that agent's co-branded /with/:slug page.
    const coMarketingAgent =
      lead.agentSource === "link" && lead.agentId
        ? agents.find((agent) => agent.id === lead.agentId) ?? null
        : null;
    const draft = buildLeadWelcomeDraft({
      firstName: lead.firstName,
      email: lead.email,
      scenarios,
      coMarketingAgent,
      siteOrigin: PUBLIC_SITE_ORIGIN,
    });
    window.location.href = draft.mailto;
    toast.success(`Welcome email draft opened for ${lead.firstName}. Both Roadmap resources are included as download links.`);
  };

  return (
    <button
      type="button"
      onClick={openDraft}
      className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
      title="Open a personalized welcome email draft with both Roadmap resources"
    >
      <Mail className="h-4 w-4" /> Email draft
      <span
        aria-hidden="true"
        className="rounded-sm bg-[#0f4d3b]/10 px-1 py-px text-[10px] font-black leading-none text-[#0f4d3b]"
      >
        GO
      </span>
    </button>
  );
}

function LeadAgentCell({
  lead,
  agents,
}: {
  lead: {
    id: number;
    firstName: string;
    agentId: number | null;
    sentToAgentAt: Date | null;
  };
  agents: AgentOption[];
}) {
  const utils = trpc.useUtils();

  const assign = trpc.leads.assignAgent.useMutation({
    onMutate: async (input) => {
      await utils.leads.list.cancel();
      const previous = utils.leads.list.getData();
      utils.leads.list.setData(undefined, (old) =>
        old?.map((l) => (l.id === input.id ? { ...l, agentId: input.agentId } : l))
      );
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        utils.leads.list.setData(undefined, context.previous);
      }
      toast.error(err.message || "Couldn't assign the agent. Please try again.");
    },
    onSettled: () => {
      utils.leads.list.invalidate();
      utils.agent.stats.invalidate();
    },
  });

  const sendToAgent = trpc.leads.sendToAgent.useMutation({
    onSuccess: (result) => {
      if (result.sent) {
        toast.success(`Lead sent to ${assignedAgent?.name ?? "the agent"} by email.`);
        utils.leads.list.invalidate();
        utils.agent.stats.invalidate();
      } else {
        // No auto-send path is available — open a prefilled draft instead.
        window.location.href = result.mailto;
        toast.info(
          result.reason === "unverified_domain"
            ? "Your Resend sender domain is not verified yet — opened a prefilled draft in your mail app instead."
            : "Email sending isn't set up yet — opened a prefilled draft in your mail app instead."
        );
      }
    },
    onError: (err) => {
      toast.error(err.message || "Couldn't send the referral. Please try again.");
    },
  });

  const assignedAgent = agents.find((a) => a.id === lead.agentId);
  const sentAt = lead.sentToAgentAt ? new Date(lead.sentToAgentAt) : null;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={lead.agentId ? String(lead.agentId) : "none"}
        onValueChange={(value) =>
          assign.mutate({ id: lead.id, agentId: value === "none" ? null : Number(value) })
        }
        disabled={assign.isPending}
      >
        <SelectTrigger
          className="h-8 w-[150px] text-xs border rounded-full px-3 bg-card"
          aria-label={`Assigned agent for ${lead.firstName}`}
        >
          <SelectValue placeholder="No agent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No agent</span>
          </SelectItem>
          {agents.map((a) => (
            <SelectItem key={a.id} value={String(a.id)}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {assignedAgent && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full text-xs bg-card"
          disabled={sendToAgent.isPending}
          onClick={() => sendToAgent.mutate({ id: lead.id })}
          title={
            sentAt
              ? `Sent to agent ${sentAt.toLocaleString()} — click to send again`
              : `Email this lead to ${assignedAgent.name}`
          }
        >
          {sendToAgent.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1" />
          )}
          {sentAt ? "Resend" : "Send to agent"}
        </Button>
      )}
      {sentAt && (
        <span
          className="text-[11px] text-emerald-700 font-medium whitespace-nowrap"
          title={`Referred ${sentAt.toLocaleString()}`}
        >
          Sent {sentAt.toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

function LeadViewContextBanner({ context, onViewAll }: { context: Exclude<LeadViewContext, "all">; onViewAll: () => void }) {
  const label = context === "chat" ? "Viewing Chat Intakes" : "Viewing Roadmap leads";
  const description = context === "chat" ? "The Mortgage Chat source selected from the combined lead mix." : "The Roadmap source selected from the combined lead mix.";
  return <div role="status" aria-live="polite" className="mb-4 flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/[0.05] px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"><div><span className="font-semibold text-primary">{label}</span><span className="ml-2 text-muted-foreground">{description}</span></div><Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={onViewAll}>View all captured leads</Button></div>;
}

function CombinedAllLeadsPanel({ rows, comparison, range, onRangeChange, pageSize, onPageSizeChange, dayFilter, onClearDayFilter, clearFiltersToken }: { rows: CombinedLeadRow[]; comparison: CombinedOutcomeStat[]; range: PropertyActivityRange; onRangeChange: (range: PropertyActivityRange) => void; pageSize: CombinedPageSize; onPageSizeChange: (pageSize: CombinedPageSize) => void; dayFilter?: string | null; onClearDayFilter?: () => void; clearFiltersToken?: number }) {
  const [search, setSearch] = useState("");
  const [selectedSources, setSelectedSources] = useState<CombinedLeadRow["source"][]>([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
  const [sort, setSort] = useState<CombinedSort>("newest");
  const [page, setPage] = useState(1);
  const outcomeOptions = ["New", "Contacted", "Booked", "Qualified", "Incomplete"];
  useEffect(() => {
    if (clearFiltersToken === undefined) return;
    setSearch("");
    setSelectedSources([]);
    setSelectedOutcomes([]);
    setSort("newest");
    setPage(1);
  }, [clearFiltersToken]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const sourceMatches = selectedSources.length === 0 || selectedSources.includes(row.source);
      const outcomeMatches = selectedOutcomes.length === 0 || selectedOutcomes.includes(row.status);
      const dayMatches = !dayFilter || new Date(row.submittedAt).toISOString().slice(0, 10) === dayFilter;
      const textMatches = !query || `${row.name} ${row.email ?? ""} ${row.phone ?? ""} ${row.source} ${row.status}`.toLowerCase().includes(query);
      return sourceMatches && outcomeMatches && dayMatches && textMatches;
    });
  }, [rows, search, selectedSources, selectedOutcomes, dayFilter]);
  const sortedRows = useMemo(() => [...filteredRows].sort((left, right) => {
    if (sort === "urgency" && left.followUpRecorded !== right.followUpRecorded) return left.followUpRecorded ? 1 : -1;
    const leftTime = new Date(left.submittedAt).getTime();
    const rightTime = new Date(right.submittedAt).getTime();
    return sort === "oldest" || (sort === "urgency" && !left.followUpRecorded && !right.followUpRecorded) ? leftTime - rightTime : rightTime - leftTime;
  }), [filteredRows, sort]);
  const pageSourceCounts = useMemo(() => sortedRows.reduce((counts, row) => { counts[row.source] += 1; return counts; }, { Roadmap: 0, "Mortgage Chat": 0 } as Record<CombinedLeadRow["source"], number>), [sortedRows]);
  const sourcePercent = (count: number) => combinedOutcomePercent(count, sortedRows.length);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const start = Math.max(1, Math.min(page - 3, totalPages - 6));
    return Array.from({ length: 7 }, (_, index) => start + index);
  }, [page, totalPages]);
  const paginatedRows = useMemo(() => sortedRows.slice((page - 1) * pageSize, page * pageSize), [sortedRows, page, pageSize]);
  useEffect(() => { setPage(1); }, [search, selectedSources, selectedOutcomes, sort, dayFilter, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const toggleSource = (source: CombinedLeadRow["source"]) => setSelectedSources((current) => current.includes(source) ? current.filter((value) => value !== source) : [...current, source]);
  const toggleOutcome = (outcome: string) => setSelectedOutcomes((current) => current.includes(outcome) ? current.filter((value) => value !== outcome) : [...current, outcome]);
  const clearFilters = () => { setSearch(""); setSelectedSources([]); setSelectedOutcomes([]); onClearDayFilter?.(); };
  const downloadCsv = () => {
    const header = "Source,Lead,Email,Phone,Outcome,Follow-up,Browser,Submitted At";
    const csvRows = sortedRows.map((row) => [row.source, row.name, row.email ?? "", row.phone ?? "", row.status, row.followUpLabel, captureDeviceLabel(row.captureDevice), new Date(row.submittedAt).toLocaleString()].map(csvEscape).join(","));
    const blob = new Blob([`${header}\n${csvRows.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `combined-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <section id="all-leads" className="scroll-mt-24 rounded-xl border border-border bg-card p-5 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground"><Inbox className="h-6 w-6 text-primary" /> All captured leads</h2><p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">Mortgage Chat and Roadmap records in one read-only view. Each row keeps its original source so totals remain auditable.</p></div>
      <div className="flex items-center gap-2"><label htmlFor="combined-leads-range" className="text-xs font-semibold text-muted-foreground">Date range</label><Select value={range} onValueChange={(value) => onRangeChange(value as PropertyActivityRange)}><SelectTrigger id="combined-leads-range" className="h-9 w-[170px] bg-background text-xs" aria-label="Filter combined leads by date range"><SelectValue /></SelectTrigger><SelectContent>{PROPERTY_ACTIVITY_RANGES.map((value) => <SelectItem key={value} value={value}>{PROPERTY_ACTIVITY_RANGE_LABELS[value]}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div className="mt-5 flex flex-col gap-2 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="bg-background pl-9" placeholder="Search name, email, phone, source, or outcome" aria-label="Search combined leads" /></div><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="justify-between lg:w-[170px]"><Filter className="mr-2 h-4 w-4" />{selectedSources.length > 0 ? `${selectedSources.length} sources` : "All sources"}</Button></PopoverTrigger><PopoverContent align="end" className="w-56"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</p><div className="mt-2 grid gap-2">{(["Roadmap", "Mortgage Chat"] as const).map((source) => <label key={source} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={selectedSources.includes(source)} onCheckedChange={() => toggleSource(source)} /><span>{source}</span></label>)}</div></PopoverContent></Popover><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="justify-between lg:w-[190px]"><Filter className="mr-2 h-4 w-4" />{selectedOutcomes.length > 0 ? `${selectedOutcomes.length} outcomes` : "All outcomes"}</Button></PopoverTrigger><PopoverContent align="end" className="w-60"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outcome status</p><div className="mt-2 grid gap-2">{outcomeOptions.map((outcome) => <label key={outcome} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={selectedOutcomes.includes(outcome)} onCheckedChange={() => toggleOutcome(outcome)} /><span>{outcome}</span></label>)}</div></PopoverContent></Popover>{(search || selectedSources.length > 0 || selectedOutcomes.length > 0) && <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}</div>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{sortedRows.length === 0 ? "No matching leads" : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, sortedRows.length)} of ${sortedRows.length} matching leads in ${PROPERTY_ACTIVITY_RANGE_LABELS[range].toLowerCase()}${dayFilter ? ` on ${new Date(`${dayFilter}T12:00:00`).toLocaleDateString()}` : ""}.`}</span>{dayFilter && <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearDayFilter}>Clear day</Button>}<div className="ml-auto flex flex-wrap items-center gap-2"><label htmlFor="combined-leads-page-size" className="font-semibold text-muted-foreground">Rows</label><Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value) as CombinedPageSize)}><SelectTrigger id="combined-leads-page-size" className="h-8 w-[76px] bg-background text-xs" aria-label="Rows per combined leads page"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select><label htmlFor="combined-leads-sort" className="font-semibold text-muted-foreground">Sort</label><Select value={sort} onValueChange={(value) => setSort(value as CombinedSort)}><SelectTrigger id="combined-leads-sort" className="h-8 w-[170px] bg-background text-xs" aria-label="Sort combined leads"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="oldest">Oldest first</SelectItem><SelectItem value="urgency">Follow-up urgency</SelectItem></SelectContent></Select><Button type="button" variant="outline" size="sm" className="h-8" onClick={downloadCsv} disabled={sortedRows.length === 0}><Download className="mr-1.5 h-3.5 w-3.5" />Export filtered CSV</Button></div></div>
    <div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Combined captured</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{filteredRows.length}</p><p className="mt-1 text-xs text-muted-foreground">{pageSourceCounts.Roadmap} Roadmap ({sourcePercent(pageSourceCounts.Roadmap)}) + {pageSourceCounts["Mortgage Chat"]} Mortgage Chat ({sourcePercent(pageSourceCounts["Mortgage Chat"])})</p></div><div className="rounded-lg border border-border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outcome comparison</p><p className="mt-1 text-sm text-foreground">Roadmap booked: <strong>{comparison[0]?.outcomeCount ?? 0}</strong> ({combinedOutcomePercent(comparison[0]?.outcomeCount ?? 0, comparison[0]?.captured ?? 0)}) · Chat qualified: <strong>{comparison[1]?.outcomeCount ?? 0}</strong> ({combinedOutcomePercent(comparison[1]?.outcomeCount ?? 0, comparison[1]?.captured ?? 0)})</p><p className="mt-1 text-xs text-muted-foreground">Follow-up recorded: {comparison[0]?.followUpCount ?? 0} Roadmap · {comparison[1]?.followUpCount ?? 0} Mortgage Chat</p></div></div>
    <div className="mt-5 overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border bg-muted/70 text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-semibold">Source</th><th className="px-4 py-3 font-semibold">Lead</th><th className="px-4 py-3 font-semibold">Contact</th><th className="px-4 py-3 font-semibold">Outcome</th><th className="px-4 py-3 font-semibold">Follow-up</th><th className="px-4 py-3 font-semibold">Submitted</th></tr></thead><tbody>{sortedRows.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No leads match the current combined-table filters.</td></tr> : paginatedRows.map((row) => <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30"><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.source === "Mortgage Chat" ? "bg-emerald-600/10 text-emerald-700" : "bg-primary/10 text-primary"}`}>{row.source}</span><div className="mt-1 text-[10px] text-muted-foreground">{captureDeviceLabel(row.captureDevice)}</div></td><td className="px-4 py-3 font-medium text-foreground">{row.name}</td><td className="px-4 py-3 text-xs text-muted-foreground"><div>{row.email ?? "—"}</div><div>{row.phone ?? "—"}</div></td><td className="px-4 py-3"><span className="font-medium text-foreground">{row.status}</span></td><td className="px-4 py-3 text-xs"><span className={row.followUpRecorded ? "font-semibold text-emerald-700" : "text-muted-foreground"}>{row.followUpLabel}</span></td><td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(row.submittedAt).toLocaleString()}</td></tr>)}</tbody></table></div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3" aria-label="Combined leads pagination"><span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Page {page} of {totalPages}</span><span aria-label={`${pageSourceCounts.Roadmap} Roadmap (${sourcePercent(pageSourceCounts.Roadmap)}) and ${pageSourceCounts["Mortgage Chat"]} Mortgage Chat (${sourcePercent(pageSourceCounts["Mortgage Chat"])}) results`}>Roadmap {pageSourceCounts.Roadmap} ({sourcePercent(pageSourceCounts.Roadmap)}) · Mortgage Chat {pageSourceCounts["Mortgage Chat"]} ({sourcePercent(pageSourceCounts["Mortgage Chat"])})</span></span>{sortedRows.length > pageSize && <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5"><Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage(1)} disabled={page === 1} aria-label="First combined leads page"><ChevronsLeft className="h-4 w-4" aria-hidden="true" /></Button><Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Previous combined leads page">Previous</Button>{pageNumbers.map((pageNumber) => <Button key={pageNumber} type="button" variant={pageNumber === page ? "default" : "outline"} size="sm" className="h-8 min-w-8 px-2" onClick={() => setPage(pageNumber)} aria-label={`Go to combined leads page ${pageNumber}`} aria-current={pageNumber === page ? "page" : undefined}>{pageNumber}</Button>)}<Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Next combined leads page">Next</Button><Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="Last combined leads page"><ChevronsRight className="h-4 w-4" aria-hidden="true" /></Button></div>}</div>
    <div className="mt-3 grid gap-1 text-[11px] leading-4 text-muted-foreground"><p><strong className="text-foreground">Outcome definitions:</strong> Roadmap uses <span className="font-medium text-foreground">Booked</span>; Mortgage Chat uses <span className="font-medium text-foreground">Qualified</span>, matching each existing workflow’s native status.</p><p><strong className="text-foreground">Follow-up recorded:</strong> Roadmap notes, status progression, or agent referral; Mortgage Chat notes, recipient delivery, or buyer-agent request.</p></div>
  </section>;
}

export default function Leads() {
  const [dashboardDarkMode, setDashboardDarkMode] = useState(() => localStorage.getItem("dashboard-theme") === "dark");
  useEffect(() => { localStorage.setItem("dashboard-theme", dashboardDarkMode ? "dark" : "light"); }, [dashboardDarkMode]);
  const { user, loading, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeamMember = user?.role === "team_member";
  const { data: advertisingModuleStatus } = trpc.adIntegrationSettings.moduleVisibility.useQuery(undefined, { enabled: Boolean(isAuthenticated && isAdmin) });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [loanOfficerFilter, setLoanOfficerFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [contactMethodFilter, setContactMethodFilter] = useState<"all" | "text" | "email">("all");
  const [propertySourceFilter, setPropertySourceFilter] = useState<"all" | "single-property">("all");
  const [propertyAddressFilter, setPropertyAddressFilter] = useState("all");
  const [activityRange, setActivityRange] = useState<PropertyActivityRange>("all");
  const [combinedRange, setCombinedRange] = useState<PropertyActivityRange>("all");
  const [trendDayFilter, setTrendDayFilter] = useState<string | null>(null);
  const [combinedFilterResetToken, setCombinedFilterResetToken] = useState(0);
  const [leadViewContext, setLeadViewContext] = useState<LeadViewContext>("all");
  const [workdaySidebarCollapsed, setWorkdaySidebarCollapsed] = useState(false);
  const [combinedPageSize, setCombinedPageSize] = useState<CombinedPageSize>(readCombinedPageSize);
  useEffect(() => { window.localStorage.setItem(COMBINED_PAGE_SIZE_STORAGE_KEY, String(combinedPageSize)); }, [combinedPageSize]);

  const leadsQuery = trpc.leads.list.useQuery({ activityRange }, {
    enabled: isAuthenticated && isAdmin,
    retry: false,
  });

  const agentsQuery = trpc.agent.list.useQuery(undefined, {
    enabled: isAuthenticated && isAdmin,
    retry: false,
  });
  const combinedChatQuery = trpc.chat.list.useQuery({ activityRange: "all" }, {
    enabled: isAuthenticated && isAdmin,
    retry: false,
  });
  const agentOptions: AgentOption[] = useMemo(
    () =>
      (agentsQuery.data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        email: a.email,
        phone: a.phone,
        bio: a.bio,
        website: a.website,
        companyName: a.companyName,
        headshotUrl: a.headshotUrl,
        companyLogoUrl: a.companyLogoUrl,
      })),
    [agentsQuery.data]
  );

  const leads = useMemo(
    () => (leadsQuery.data ? [...leadsQuery.data].reverse() : []),
    [leadsQuery.data]
  );

  const loanOfficerOptions = useMemo(() => getLoanOfficerFilterOptions(leads), [leads]);
  const attributionAgentOptions = useMemo(
    () => getCoBrandAgentFilterOptions(leads, loanOfficerFilter),
    [leads, loanOfficerFilter]
  );
  const campaignOptions = useMemo(
    () => Array.from(new Set(leads.map((lead) => [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" · ") || "Direct / untagged"))).sort(),
    [leads]
  );
  const propertyAddressOptions = useMemo(
    () => Array.from(new Set(leads.flatMap((lead) => lead.propertyPageAddress ? [lead.propertyPageAddress] : []))).sort(),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (loanOfficerFilter !== "all" && (l.loanOfficerSlug ?? l.loanOfficerName) !== loanOfficerFilter) return false;
      if (agentFilter !== "all" && !matchesSelectedCoBrandPair(l, loanOfficerFilter, agentFilter)) return false;
      const campaign = [l.utmSource, l.utmMedium, l.utmCampaign].filter(Boolean).join(" · ") || "Direct / untagged";
      if (campaignFilter !== "all" && campaign !== campaignFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (contactMethodFilter !== "all" && (l.preferredContactMethod ?? "text") !== contactMethodFilter) return false;
      if (propertySourceFilter === "single-property" && !l.propertyPageAddress) return false;
      if (propertyAddressFilter !== "all" && l.propertyPageAddress !== propertyAddressFilter) return false;
      if (!q) return true;
      return (
        l.firstName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        (l.propertyPageAddress ?? "").toLowerCase().includes(q) ||
        (l.loanOfficerName ?? "").toLowerCase().includes(q) ||
        (l.agentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter, loanOfficerFilter, agentFilter, campaignFilter, sourceFilter, contactMethodFilter, propertySourceFilter, propertyAddressFilter]);

  const isFiltered = search.trim() !== "" || statusFilter !== "all" || loanOfficerFilter !== "all" || agentFilter !== "all" || campaignFilter !== "all" || sourceFilter !== "all" || contactMethodFilter !== "all" || propertySourceFilter !== "all" || propertyAddressFilter !== "all";

  const combinedRows = useMemo<CombinedLeadRow[]>(() => {
    const since = getPropertyActivitySince(combinedRange);
    const inRange = (value: Date | string) => !since || new Date(value).getTime() >= since.getTime();
    const roadmapRows: CombinedLeadRow[] = leads.filter((lead) => inRange(lead.createdAt)).map((lead) => {
      const followUpRecorded = hasRoadmapFollowUp(lead);
      return {
        id: `roadmap-${lead.id}`,
        name: lead.firstName || "Unnamed Roadmap lead",
        email: lead.email || null,
        phone: lead.phone || null,
        source: "Roadmap",
        status: STATUS_META[lead.status as LeadStatus]?.label ?? lead.status,
        followUpRecorded,
        followUpLabel: followUpRecorded ? "Recorded" : "Not recorded",
        submittedAt: lead.createdAt,
        captureDevice: lead.captureDevice,
        destination: "roadmap",
      };
    });
    const chatRows: CombinedLeadRow[] = (combinedChatQuery.data ?? []).filter((lead) => inRange(lead.createdAt)).map((lead) => {
      const followUpRecorded = hasChatFollowUp(lead);
      return {
        id: `chat-${lead.id}`,
        name: lead.fullName || "Unnamed Mortgage Chat lead",
        email: lead.email || null,
        phone: lead.phone || null,
        source: "Mortgage Chat",
        status: lead.status === "qualified" ? "Qualified" : "Incomplete",
        followUpRecorded,
        followUpLabel: followUpRecorded ? "Recorded" : "Not recorded",
        submittedAt: lead.createdAt,
        captureDevice: lead.captureDevice,
        destination: "chat",
      };
    });
    return [...roadmapRows, ...chatRows].sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());
  }, [combinedChatQuery.data, combinedRange, leads]);

  const combinedComparison = useMemo<CombinedOutcomeStat[]>(() => {
    const roadmap = combinedRows.filter((row) => row.source === "Roadmap");
    const chat = combinedRows.filter((row) => row.source === "Mortgage Chat");
    return [
      { source: "Roadmap", captured: roadmap.length, outcomeCount: roadmap.filter((row) => row.status === "Booked").length, outcomeLabel: "Booked", followUpCount: roadmap.filter((row) => row.followUpRecorded).length },
      { source: "Mortgage Chat", captured: chat.length, outcomeCount: chat.filter((row) => row.status === "Qualified").length, outcomeLabel: "Qualified", followUpCount: chat.filter((row) => row.followUpRecorded).length },
    ];
  }, [combinedRows]);

  const utils = trpc.useUtils();
  const updateStatus = trpc.leads.updateStatus.useMutation({
    onMutate: async (input) => {
      await utils.leads.list.cancel();
      const previous = utils.leads.list.getData();
      utils.leads.list.setData(undefined, (old) =>
        old?.map((l) => (l.id === input.id ? { ...l, status: input.status } : l))
      );
      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        utils.leads.list.setData(undefined, context.previous);
      }
      toast.error(err.message || "Couldn't update status. Please try again.");
    },
    onSettled: () => {
      utils.leads.list.invalidate();
    },
  });

  const downloadCsv = () => {
    const header =
      "First Name,Email,Phone,Preferred Contact Method,Browser,Source,Property Page Address,Property Page URL Slug,UTM Source,UTM Medium,UTM Campaign,UTM Content,UTM Term,Landing Path,Referrer Host,Co-branded Source,Loan Officer,Loan Officer URL Slug,Agent,Agent URL Slug,Status,Notes,Submitted At,Purchase Price,Down Payment,Note Rate %,Loan Amount,Year 1 Payment,Year 2 Payment,Note Payment,Year 1 Savings/mo,Year 2 Savings/mo,Seller Subsidy,Wait Years,Monthly Rent,CoW Purchase Price,CoW Down Payment,CoW Interest Rate %,CoW Appreciation %,CoW Rent Increase %,CoW Monthly Payment,Rent Paid If Waiting,Equity Missed,Cost Of Waiting";
    const rows = filteredLeads.map((l) =>
      {
        const parsed = parseScenario(l.scenario ?? null);
        const s = parsed?.buydown ?? null;
        const c = parsed?.costOfWaiting ?? null;
        return [
        csvEscape(l.firstName),
        csvEscape(l.email),
        csvEscape(l.phone),
        csvEscape(l.preferredContactMethod ?? "text"),
        csvEscape(captureDeviceLabel(l.captureDevice)),
        csvEscape(l.source),
        csvEscape(l.propertyPageAddress ?? ""),
        csvEscape(l.propertyPageSlug ?? ""),
        csvEscape(l.utmSource ?? ""),
        csvEscape(l.utmMedium ?? ""),
        csvEscape(l.utmCampaign ?? ""),
        csvEscape(l.utmContent ?? ""),
        csvEscape(l.utmTerm ?? ""),
        csvEscape(l.landingPath ?? ""),
        csvEscape(l.referrerHost ?? ""),
        l.agentSource === "link" ? "Yes" : "No",
        csvEscape(l.loanOfficerName ?? ""),
        csvEscape(l.loanOfficerSlug ?? ""),
        csvEscape(l.agentName ?? ""),
        csvEscape(l.agentSlug ?? ""),
        csvEscape(STATUS_META[l.status as LeadStatus]?.label ?? l.status),
        csvEscape(l.notes ?? ""),
        csvEscape(new Date(l.createdAt).toLocaleString()),
        s ? String(s.purchasePrice) : "",
        s ? String(s.downPayment) : "",
        s ? String(s.noteRate) : "",
        s ? String(s.loanAmount) : "",
        s ? String(s.year1Payment) : "",
        s ? String(s.year2Payment) : "",
        s ? String(s.notePayment) : "",
        s ? String(s.year1MonthlySavings) : "",
        s ? String(s.year2MonthlySavings) : "",
        s ? String(s.totalSubsidy) : "",
        c ? String(c.waitYears) : "",
        c ? String(c.monthlyRent) : "",
        c ? String(c.purchasePrice) : "",
        c ? String(c.downPayment) : "",
        c ? String(c.interestRate) : "",
        c ? String(c.appreciationRate) : "",
        c && c.rentIncreaseRate !== undefined ? String(c.rentIncreaseRate) : "",
        c ? String(c.monthlyPayment) : "",
        c ? String(c.totalRentPaid) : "",
        c ? String(c.equityGained) : "",
        c ? String(c.costOfWaiting) : "",
        ].join(",");
      });
    const blob = new Blob([header + "\n" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roadmap-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={dashboardDarkMode ? "dark min-h-screen bg-background" : "min-h-screen bg-background"}>
      <header className="bg-card border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={LOGO} alt="Cornerstone First Mortgage logo" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated && (isAdmin || isTeamMember) && <Button variant="outline" size="sm" onClick={() => setDashboardDarkMode((current) => !current)} aria-label={dashboardDarkMode ? "Use light dashboard theme" : "Use dark dashboard theme"}>{dashboardDarkMode ? <Sun className="h-4 w-4 mr-1.5" /> : <Moon className="h-4 w-4 mr-1.5" />}{dashboardDarkMode ? "Light" : "Dark"}</Button>}
            {isAuthenticated && isAdmin && <button type="button" title="Open Advertising integration settings. Provider connections remain inactive." onClick={() => document.getElementById("advertising-integrations")?.scrollIntoView({ behavior: "smooth", block: "start" })} className={`hidden items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring md:inline-flex ${advertisingModuleStatus?.isVisible === false ? "border-muted-foreground/30 bg-muted text-muted-foreground" : "border-primary/30 bg-primary/10 text-primary"}`} aria-label="Open advertising integration settings">{advertisingModuleStatus?.isVisible === false ? <CirclePause className="h-3.5 w-3.5" aria-hidden="true" /> : <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />}Ads module: {advertisingModuleStatus?.isVisible === false ? "Disabled" : "Enabled"}</button>}
            {isAuthenticated && (
              <span className="hidden sm:block text-sm text-muted-foreground">
                {user?.name || user?.email}
              </span>
            )}
            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={() => logout()}>
                <LogOut className="h-4 w-4 mr-1.5" /> Sign out
              </Button>
            )}
          </div>
        </div>
      </header>

      {isAuthenticated && isAdmin && (
        <nav aria-label="Dashboard section navigation" className="fixed left-1/2 top-3 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-border/80 bg-card/95 p-1.5 shadow-lg backdrop-blur-md">
          <Button variant="default" size="sm" className="h-8 shrink-0 rounded-full px-3 text-xs" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp className="mr-1 h-3.5 w-3.5" /> Top</Button>
          {DASHBOARD_SECTIONS.map((section) => <Button key={section.id} variant="ghost" size="sm" className="h-8 shrink-0 rounded-full px-3 text-xs" onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{section.label}</Button>)}
        </nav>
      )}

      <main className="container py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Checking access...
          </div>
        ) : !isAuthenticated ? (
          <div className="max-w-md mx-auto text-center py-24">
            <LockKeyhole className="h-10 w-10 mx-auto text-primary" />
            <h1 className="mt-4 font-display font-semibold text-2xl text-foreground">
              Private leads dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Sign in with your owner account to view Roadmap leads captured by the landing page.
            </p>
            <Button className="mt-6" onClick={() => startLogin()}>
              Sign in to continue
            </Button>
          </div>
        ) : !isAdmin && !isTeamMember ? (
          <div className="max-w-md mx-auto text-center py-24">
            <TeamWorkspaceActivation />
          </div>
        ) : isTeamMember ? (
          <div className="space-y-6"><TeamMemberProvisioningStatus /><TeamMemberWorkspacePanel /><TeamTemplateSubmissionPanel /></div>
        ) : (
          <>
          <ExecutiveCommandCenter defaultPageSize={combinedPageSize} onDefaultPageSizeChange={setCombinedPageSize} leads={leads.map((lead) => ({ id: lead.id, firstName: lead.firstName, email: lead.email, status: lead.status, source: lead.source, createdAt: lead.createdAt, captureDevice: lead.captureDevice }))} />
          <div className={`grid min-w-0 gap-6 transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none ${workdaySidebarCollapsed ? "lg:grid-cols-[3.5rem_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"}`}>
           <DashboardWorkdaySidebar collapsed={workdaySidebarCollapsed} onCollapsedChange={setWorkdaySidebarCollapsed} records={leads.slice(0, 10).map((lead) => ({ label: `Roadmap lead #${lead.id}`, status: lead.status, meta: `${lead.source} · ${new Date(lead.createdAt).toLocaleDateString()}` }))} onLeadSourceSelect={(source) => { if (source === "all") { setSourceFilter("all"); setLeadViewContext("all"); document.getElementById("all-leads")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; } if (source === "Mortgage Chat") { setSourceFilter("all"); setLeadViewContext("chat"); document.getElementById("chat-intakes")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; } setSourceFilter(source === "Roadmap" ? "all" : source); setLeadViewContext("roadmap"); document.getElementById("roadmap-leads")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} onTrendLeadNavigate={(destination: TrendLeadDestination) => { setTrendDayFilter(null); if (destination.section === "roadmap") { setSourceFilter("all"); setLeadViewContext("roadmap"); } else if (destination.section === "chat") { setSourceFilter("all"); setLeadViewContext("chat"); } else { setLeadViewContext("all"); } window.requestAnimationFrame(() => document.getElementById(destination.anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" })); }} onViewAllTrendDay={(day) => { setTrendDayFilter(day); setCombinedFilterResetToken((current) => current + 1); setLeadViewContext("all"); window.requestAnimationFrame(() => document.getElementById("all-leads")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} />
           <div className="min-w-0">
           <CombinedAllLeadsPanel rows={combinedRows} comparison={combinedComparison} range={combinedRange} onRangeChange={setCombinedRange} pageSize={combinedPageSize} onPageSizeChange={setCombinedPageSize} dayFilter={trendDayFilter} onClearDayFilter={() => setTrendDayFilter(null)} clearFiltersToken={combinedFilterResetToken} />
           <CampaignFunnelSummary />
            <PlatformLeadInbox />
            <PropertyEngagementSummary />
           <section id="roadmap-leads" className="scroll-mt-24">
            {leadViewContext === "roadmap" && <LeadViewContextBanner context="roadmap" onViewAll={() => { setLeadViewContext("all"); document.getElementById("all-leads")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="font-display font-semibold text-3xl text-foreground flex items-center gap-3">
                  <Users className="h-7 w-7 text-primary" /> Roadmap leads
                </h1>
                <p className="mt-1.5 text-muted-foreground">
                  Everyone who requested the First-Time Homebuyer Roadmap, newest first.
                </p>
                {leads.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(STATUS_META) as LeadStatus[]).map((s) => {
                      const count = leads.filter((l) => l.status === s).length;
                      return (
                        <span
                          key={s}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[s].className}`}
                        >
                          {STATUS_META[s].label}: {count}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => leadsQuery.refetch()}
                  disabled={leadsQuery.isFetching}
                >
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${leadsQuery.isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button size="sm" onClick={downloadCsv} disabled={filteredLeads.length === 0}>
                  <Download className="h-4 w-4 mr-1.5" /> Export visible CSV
                </Button>
              </div>
            </div>

            {leads.length > 0 && (
              <div className="mt-5 flex flex-col gap-2.5 lg:flex-row lg:items-center">
                <div className="relative flex-1 lg:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, email, loan officer, or agent..."
                    className="pl-9 bg-card"
                    aria-label="Search leads by name, email, loan officer, or agent"
                  />
                </div>
                <div className="flex gap-1.5">
                  {(["all", "new", "contacted", "booked"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                        statusFilter === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:text-foreground"
                      }`}
                      aria-pressed={statusFilter === s}
                    >
                      {s === "all" ? "All" : STATUS_META[s].label}
                    </button>
                  ))}
                </div>
                <Select value={loanOfficerFilter} onValueChange={(value) => { setLoanOfficerFilter(value); setAgentFilter("all"); }}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[180px]" aria-label="Filter Roadmap leads by loan officer">
                    <SelectValue placeholder="All loan officers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All loan officers</SelectItem>
                    {loanOfficerOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={agentFilter} onValueChange={setAgentFilter} disabled={loanOfficerFilter === "all"}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[230px]" aria-label="Filter Roadmap leads by co-brand agent for the selected loan officer">
                    <SelectValue placeholder={loanOfficerFilter === "all" ? "Select LO first" : "All co-brand agents"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All co-brand agents</SelectItem>
                    {attributionAgentOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[210px]" aria-label="Filter Roadmap leads by campaign attribution"><SelectValue placeholder="All campaigns" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All campaigns</SelectItem>{campaignOptions.map((campaign) => <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={contactMethodFilter} onValueChange={(value) => setContactMethodFilter(value as typeof contactMethodFilter)}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[190px]" aria-label="Filter Roadmap leads by preferred contact method"><SelectValue placeholder="All contact methods" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All contact methods</SelectItem><SelectItem value="text">Text preferred</SelectItem><SelectItem value="email">Email preferred</SelectItem></SelectContent>
                </Select>
                <Select value={propertySourceFilter} onValueChange={(value) => setPropertySourceFilter(value as typeof propertySourceFilter)}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[190px]" aria-label="Filter Roadmap leads by source type"><SelectValue placeholder="All lead sources" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All lead sources</SelectItem><SelectItem value="single-property">Single-property website</SelectItem></SelectContent>
                </Select>
                <Select value={propertyAddressFilter} onValueChange={(value) => { setPropertyAddressFilter(value); if (value !== "all") setPropertySourceFilter("single-property"); }} disabled={propertyAddressOptions.length === 0}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[240px]" aria-label="Filter Roadmap leads by property address"><SelectValue placeholder="All property addresses" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All property addresses</SelectItem>{propertyAddressOptions.map((address) => <SelectItem key={address} value={address}>{address}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={activityRange} onValueChange={(value) => setActivityRange(value as PropertyActivityRange)}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[180px]" aria-label="Set property activity period"><SelectValue placeholder="Activity period" /></SelectTrigger>
                  <SelectContent>{PROPERTY_ACTIVITY_RANGES.map((range) => <SelectItem key={range} value={range}>{PROPERTY_ACTIVITY_RANGE_LABELS[range]}</SelectItem>)}</SelectContent>
                </Select>
                {isFiltered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setLoanOfficerFilter("all");
                      setAgentFilter("all");
                      setCampaignFilter("all");
                      setSourceFilter("all");
                      setContactMethodFilter("all");
                      setPropertySourceFilter("all");
                      setPropertyAddressFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            <div className="mt-6 rounded-lg bg-card border border-border shadow-sm overflow-hidden">
              {leadsQuery.isLoading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading leads...
                </div>
              ) : leadsQuery.isError ? (
                <div className="py-20 text-center text-muted-foreground">
                  Couldn't load leads: {leadsQuery.error.message}
                </div>
              ) : leads.length === 0 ? (
                <div className="py-20 text-center">
                  <Inbox className="h-9 w-9 mx-auto text-muted-foreground/60" />
                  <p className="mt-3 font-medium text-foreground">No leads yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    New Roadmap requests will appear here the moment they're submitted.
                  </p>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="py-20 text-center">
                  <Search className="h-9 w-9 mx-auto text-muted-foreground/60" />
                  <p className="mt-3 font-medium text-foreground">No matching leads</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a different search or status filter.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setLoanOfficerFilter("all");
                      setAgentFilter("all");
                      setCampaignFilter("all");
                      setSourceFilter("all");
                      setContactMethodFilter("all");
                      setPropertySourceFilter("all");
                      setPropertyAddressFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="max-h-[65vh] overflow-auto overscroll-contain [scrollbar-gutter:stable] lg:max-h-[28rem]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="sticky top-0 z-10 border-b border-border bg-muted/95 text-left text-muted-foreground backdrop-blur-sm">
                        <th className="px-5 py-3 font-semibold">#</th>
                        <th className="px-5 py-3 font-semibold">First name</th>
                        <th className="px-5 py-3 font-semibold">Email</th>
                        <th className="px-5 py-3 font-semibold">Source</th>
                        <th className="px-5 py-3 font-semibold">Campaign</th>
                        <th className="px-5 py-3 font-semibold">Co-brand source</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Agent</th>
                        <th className="px-5 py-3 font-semibold">Submitted</th>
                        <th className="px-5 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead, i) => (
                        <tr key={lead.id} id={`roadmap-lead-${lead.id}`} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                          <td className="px-5 py-3.5 text-muted-foreground">{filteredLeads.length - i}</td>
                          <td className="px-5 py-3.5 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{lead.firstName}</span>
                              {isRecentNewLead(lead) ? <span className="inline-flex items-center rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700" title="Submitted within the last 24 hours" aria-label="New lead submitted within the last 24 hours">New</span> : null}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-foreground/85">
                            <div className="flex min-w-0 items-center gap-1"><span className="min-w-0 break-all">{lead.email}</span><CopyLeadField value={lead.email} label="email" leadName={lead.firstName} /></div>
                            {lead.phone && <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><span>{lead.phone}</span><CopyLeadField value={lead.phone} label="phone" leadName={lead.firstName} /></span>{hasUsableRoadmapPhone(lead.phone) && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-1.5 py-0.5 font-medium text-emerald-700" title="Usable phone number provided"><Phone className="h-3 w-3" aria-hidden="true" /> Phone ready</span>}{hasUsableRoadmapPhone(lead.phone) && lead.smsConsent === 1 && <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/10 px-1.5 py-0.5 font-medium text-violet-700" title="SMS consent recorded"><MessageSquareText className="h-3 w-3" aria-hidden="true" /> Text ready</span>}</div>}
                            {lead.preferredContactMethod && <div className="mt-1 text-xs text-muted-foreground">Preferred: <span className="font-semibold text-foreground">{lead.preferredContactMethod === "email" ? "Email" : "Text"}</span></div>}
                            <div className="mt-1">
                              <LeadEmailDraftAction lead={lead} agents={agentOptions} />
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="inline-flex rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">{lead.source}</span>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${lead.captureDevice === "mobile" ? "bg-emerald-600/10 text-emerald-700" : "bg-slate-600/10 text-slate-700"}`}>{captureDeviceLabel(lead.captureDevice)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">
                            {[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" · ") || "Direct / untagged"}
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            {lead.propertyPageAddress ? (
                              <PropertyPageSourceSummary
                                propertyLandingPageId={lead.propertyPageId}
                                address={lead.propertyPageAddress}
                                propertyPageSlug={lead.propertyPageSlug}
                                listingSnapshot={lead.propertyPageListingSnapshot}
                                activityCount={lead.propertyPageActivityCount}
                                latestActivityType={lead.propertyPageLatestActivityType}
                                latestActivityAt={lead.propertyPageLatestActivityAt}
                                activityRange={activityRange}
                                loanOfficerName={lead.loanOfficerName}
                                agentName={lead.agentName}
                              />
                            ) : lead.agentSource === "link" ? (
                              <div className="space-y-1">
                                <span className="inline-flex rounded-full bg-emerald-600/10 px-2 py-0.5 font-semibold text-emerald-700">Co-branded</span>
                                <div className="text-muted-foreground">LO: <span className="font-medium text-foreground">{lead.loanOfficerName ?? "Not linked"}</span></div>
                                <div className="text-muted-foreground">Agent: <span className="font-medium text-foreground">{lead.agentName ?? "Not linked"}</span></div>
                              </div>
                            ) : (
                              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">Direct site</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <Select
                              value={lead.status}
                              onValueChange={(value) =>
                                updateStatus.mutate({ id: lead.id, status: value as LeadStatus })
                              }
                            >
                              <SelectTrigger
                                className={`h-8 w-[130px] text-xs font-semibold border rounded-full px-3 ${STATUS_META[lead.status as LeadStatus]?.className ?? ""}`}
                                aria-label={`Status for ${lead.firstName}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="booked">Booked</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-5 py-3.5">
                            <LeadAgentCell lead={lead} agents={agentOptions} />
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                            {new Date(lead.createdAt).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-4">
                              {(() => {
                                const parsed = parseScenario(lead.scenario ?? null);
                                return parsed ? (
                                  <LeadScenario scenarios={parsed} leadName={lead.firstName} />
                                ) : null;
                              })()}
                              <LeadNotes
                                leadId={lead.id}
                                leadName={lead.firstName}
                                notes={lead.notes}
                                notesUpdatedAt={lead.notesUpdatedAt}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {leads.length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                {isFiltered
                  ? `Showing ${filteredLeads.length} of ${leads.length} lead${leads.length === 1 ? "" : "s"}. CSV export follows these filters.`
                  : `${leads.length} lead${leads.length === 1 ? "" : "s"} captured in total.`}
              </p>
            )}

            <div id="co-marketing-agents" className="scroll-mt-24"><AgentSettings /></div>
            <div id="loan-officers" className="scroll-mt-24"><LoanOfficerSettings /><TeamWorkspaceManagement /><BackupManagementPanel /><AdvertisingIntegrationSettings /></div>
            <div id="texting-workspace" className="scroll-mt-24"><TextingWorkspace /></div>
            <div id="chat-intakes" className="scroll-mt-24">{leadViewContext === "chat" && <LeadViewContextBanner context="chat" onViewAll={() => { setLeadViewContext("all"); document.getElementById("all-leads")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />}<ChatIntakeLeads /></div>
            <div id="saved-qualifying-listings" className="scroll-mt-24"><GeoSphereListings /></div>
            <div id="pairing-spend-tracker" className="scroll-mt-24"><PairingSpendTracker /></div>
          </section>
           </div>
          </div>
          </>
        )}
      </main>
    </div>
  );
}
