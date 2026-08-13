/* Private leads dashboard — admin-only. Golden Hour Porch styling to match the brand. */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import AgentSettings from "@/components/AgentSettings";
import LoanOfficerSettings from "@/components/LoanOfficerSettings";
import ChatIntakeLeads from "@/components/ChatIntakeLeads";
import GeoSphereListings from "@/components/GeoSphereListings";
import {
  buildLeadWelcomeDraft,
  type LeadEmailAgent,
} from "@shared/leadEmailDraft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Calculator,
  Download,
  Inbox,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  NotebookPen,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Users,
} from "lucide-react";

const LOGO = "/manus-storage/cornerstone-logo-standard_8b43a164.png";

type LeadStatus = "new" | "contacted" | "booked";

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

function LeadNotes({
  leadId,
  leadName,
  notes,
}: {
  leadId: number;
  leadName: string;
  notes: string | null;
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
          className={`inline-flex items-center gap-1.5 font-medium hover:underline ${
            hasNotes ? "text-primary" : "text-muted-foreground"
          }`}
          aria-label={`Notes for ${leadName}`}
        >
          <NotebookPen className="h-4 w-4" />
          {hasNotes ? "Notes" : "Add note"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-card text-card-foreground">
        <p className="text-sm font-semibold text-foreground">
          Notes for {leadName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Call details, follow-up reminders — only you can see these.
        </p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g., Called 7/12 — pre-approval sent, follow up Friday"
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
      siteOrigin: window.location.origin,
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

export default function Leads() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [loanOfficerFilter, setLoanOfficerFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const leadsQuery = trpc.leads.list.useQuery(undefined, {
    enabled: isAuthenticated && isAdmin,
    retry: false,
  });

  const agentsQuery = trpc.agent.list.useQuery(undefined, {
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

  const loanOfficerOptions = useMemo(
    () => Array.from(new Map(
      leads
        .filter((lead) => lead.loanOfficerName)
        .map((lead) => [lead.loanOfficerSlug ?? lead.loanOfficerName!, { value: lead.loanOfficerSlug ?? lead.loanOfficerName!, label: lead.loanOfficerName! }])
    ).values()),
    [leads]
  );
  const attributionAgentOptions = useMemo(
    () => Array.from(new Map(
      leads
        .filter((lead) => lead.agentName)
        .map((lead) => [lead.agentSlug ?? lead.agentName!, { value: lead.agentSlug ?? lead.agentName!, label: lead.agentName! }])
    ).values()),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (loanOfficerFilter !== "all" && (l.loanOfficerSlug ?? l.loanOfficerName) !== loanOfficerFilter) return false;
      if (agentFilter !== "all" && (l.agentSlug ?? l.agentName) !== agentFilter) return false;
      if (!q) return true;
      return (
        l.firstName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        (l.loanOfficerName ?? "").toLowerCase().includes(q) ||
        (l.agentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter, loanOfficerFilter, agentFilter]);

  const isFiltered = search.trim() !== "" || statusFilter !== "all" || loanOfficerFilter !== "all" || agentFilter !== "all";

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
      "First Name,Email,Source,Co-branded Source,Loan Officer,Loan Officer URL Slug,Agent,Agent URL Slug,Status,Notes,Submitted At,Purchase Price,Down Payment,Note Rate %,Loan Amount,Year 1 Payment,Year 2 Payment,Note Payment,Year 1 Savings/mo,Year 2 Savings/mo,Seller Subsidy,Wait Years,Monthly Rent,CoW Purchase Price,CoW Down Payment,CoW Interest Rate %,CoW Appreciation %,CoW Rent Increase %,CoW Monthly Payment,Rent Paid If Waiting,Equity Missed,Cost Of Waiting";
    const rows = filteredLeads.map((l) =>
      {
        const parsed = parseScenario(l.scenario ?? null);
        const s = parsed?.buydown ?? null;
        const c = parsed?.costOfWaiting ?? null;
        return [
        csvEscape(l.firstName),
        csvEscape(l.email),
        csvEscape(l.source),
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
    <div className="min-h-screen" style={{ background: "oklch(0.945 0.018 85)" }}>
      <header className="bg-card border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={LOGO} alt="Cornerstone First Mortgage logo" className="h-8 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
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
        ) : !isAdmin ? (
          <div className="max-w-md mx-auto text-center py-24">
            <ShieldAlert className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="mt-4 font-display font-semibold text-2xl text-foreground">
              Access restricted
            </h1>
            <p className="mt-2 text-muted-foreground">
              This dashboard is only available to the site owner. If that's you, make sure you're
              signed in with the owner account.
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-6">Back to the site</Button>
            </Link>
          </div>
        ) : (
          <>
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
                  <Download className="h-4 w-4 mr-1.5" /> Export CSV
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
                <Select value={loanOfficerFilter} onValueChange={setLoanOfficerFilter}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[180px]" aria-label="Filter Roadmap leads by loan officer">
                    <SelectValue placeholder="All loan officers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All loan officers</SelectItem>
                    {loanOfficerOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[180px]" aria-label="Filter Roadmap leads by agent">
                    <SelectValue placeholder="All agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agents</SelectItem>
                    {attributionAgentOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                        <th className="px-5 py-3 font-semibold">Co-brand source</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Agent</th>
                        <th className="px-5 py-3 font-semibold">Submitted</th>
                        <th className="px-5 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead, i) => (
                        <tr key={lead.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                          <td className="px-5 py-3.5 text-muted-foreground">{filteredLeads.length - i}</td>
                          <td className="px-5 py-3.5 font-medium text-foreground">{lead.firstName}</td>
                          <td className="px-5 py-3.5 text-foreground/85">
                            <div>{lead.email}</div>
                            <div className="mt-1">
                              <LeadEmailDraftAction lead={lead} agents={agentOptions} />
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                              {lead.source}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            {lead.agentSource === "link" ? (
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

            <AgentSettings />
            <LoanOfficerSettings />
            <ChatIntakeLeads />
            <GeoSphereListings />
          </>
        )}
      </main>
    </div>
  );
}
