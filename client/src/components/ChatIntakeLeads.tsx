import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calculator, Download, FileText, Loader2, Mail, MapPin, MessageCircle, MessageSquareText, NotebookPen, Search, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { getCoBrandAgentFilterOptions, getLoanOfficerFilterOptions, matchesSelectedCoBrandPair } from "@shared/roadmapPairFilters";
import { buildLeadWelcomeDraft } from "@shared/leadEmailDraft";
import { PUBLIC_SITE_ORIGIN } from "@shared/publicSiteUrl";
import { hasUsableRoadmapPhone } from "@shared/roadmapPhone";
import { qualifiesForUsdaDashboardBadge } from "@shared/usdaEligibility";
import { PROPERTY_ACTIVITY_RANGES, PROPERTY_ACTIVITY_RANGE_LABELS, type PropertyActivityRange } from "@shared/propertyActivity";
import PropertyPageSourceSummary from "@/components/PropertyPageSourceSummary";

type ChatLead = {
  id: number;
  sessionId: string;
  status: "incomplete" | "qualified";
  loanPurpose: "purchase" | "refinance" | null;
  propertyType: string | null;
  propertyValue: number | null;
  creditRange: string | null;
  annualIncome: number | null;
  downPayment: number | null;
  loanAmount: number | null;
  lowDownPaymentHomeSearch: number | null;
  searchAreaType: string | null;
  targetArea: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  smsConsent: number;
  smsConsentAt: Date | null;
  recipientEmailStatus: "not_attempted" | "sent" | "manual_follow_up";
  recipientEmailDetail: string | null;
  resendCount: number;
  lastResentAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  loanOfficerName: string | null;
  loanOfficerSlug: string | null;
  agentName: string | null;
  agentSlug: string | null;
  agentId: number | null;
  buyerAgentRequest: number;
  buyerAgentRequestedAt: Date | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPath: string | null;
  referrerHost: string | null;
  propertyPageAddress: string | null;
  propertyPageId: number | null;
  propertyPageSlug: string | null;
  propertyPageListingSnapshot: string | null;
  propertyPageActivityCount: number;
  propertyPageLatestActivityType: string | null;
  propertyPageLatestActivityAt: Date | null;
  scenario: string | null;
  isCoBranded: boolean;
};

type AgentOption = { id: number; name: string; slug: string; email: string; phone: string; bio: string | null; website: string; companyName: string; headshotUrl: string; companyLogoUrl: string; visible: number };

const money = (value: number | null) =>
  value === null
    ? "—"
    : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const formatDateTime = (value: Date | null) => (value ? new Date(value).toLocaleString() : "—");

function UsdaBadge({ lead }: { lead: ChatLead }) {
  if (!qualifiesForUsdaDashboardBadge(lead)) return null;
  return <Badge title="USDA screening indicator based on the configured city and income criteria; program and property eligibility require verification." variant="outline" className="border-emerald-600/30 bg-emerald-600/10 text-emerald-700">USDA</Badge>;
}

function CalculatorScenarioSummary({ scenario }: { scenario: string | null }) {
  if (!scenario) return null;
  try {
    const parsed = JSON.parse(scenario) as { buydown?: Record<string, number>; costOfWaiting?: Record<string, number> };
    const buydown = parsed.buydown;
    const costOfWaiting = parsed.costOfWaiting;
    if (!buydown && !costOfWaiting) return null;
    const count = Number(Boolean(buydown)) + Number(Boolean(costOfWaiting));
    return <details className="group mt-1.5 rounded-md border border-primary/15 bg-primary/[0.04] text-[11px] text-muted-foreground"><summary className="flex cursor-pointer list-none items-center gap-1 px-2 py-1.5 font-semibold text-primary marker:content-none"><Calculator className="h-3 w-3" /> {count} saved calculator scenario{count === 1 ? "" : "s"}<span className="ml-auto text-[10px] font-medium text-muted-foreground group-open:hidden">View</span><span className="ml-auto hidden text-[10px] font-medium text-muted-foreground group-open:inline">Hide</span></summary><div className="border-t border-primary/10 px-2 py-1.5 leading-relaxed">{buydown?.purchasePrice ? <div>2-1 Buydown: ${buydown.purchasePrice.toLocaleString()} purchase · Year 1 savings ${(buydown.year1MonthlySavings ?? 0).toLocaleString()}/mo</div> : null}{costOfWaiting?.costOfWaiting ? <div className={buydown ? "mt-1" : ""}>Cost of Waiting: ${costOfWaiting.costOfWaiting.toLocaleString()} over {costOfWaiting.waitYears ?? "selected"} year(s)</div> : null}</div></details>;
  } catch {
    return null;
  }
}

function TranscriptDialog({ lead, onOpenChange }: { lead: ChatLead | null; onOpenChange: (open: boolean) => void }) {
  const transcript = trpc.chat.transcript.useQuery({ chatLeadId: lead?.id ?? 1 }, { enabled: lead !== null });
  return (
    <Dialog open={lead !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2"><span>{lead?.fullName || "Anonymous"}’s intake transcript</span>{lead && <UsdaBadge lead={lead} />}</DialogTitle>
          <DialogDescription>Full chat history for this saved intake session.</DialogDescription>
        </DialogHeader>
        {transcript.isLoading ? (
          <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3 py-2">
            {(transcript.data ?? []).map((message) => (
              <div key={message.id} className={`rounded-lg px-3 py-2 text-sm ${message.role === "user" ? "ml-10 bg-primary text-primary-foreground" : "mr-10 bg-muted text-foreground"}`}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">{message.role}</p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ChatIntakeLeads() {
  const [activityRange, setActivityRange] = useState<PropertyActivityRange>("all");
  const query = trpc.chat.list.useQuery({ activityRange });
  const agentsQuery = trpc.agent.list.useQuery();
  const utils = trpc.useUtils();
  const leads = (query.data ?? []) as ChatLead[];
  const agents = ((agentsQuery.data ?? []) as AgentOption[]).filter((agent) => agent.visible === 1);
  const displayLeads = leads;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "incomplete" | "qualified">("all");
  const [loanOfficerFilter, setLoanOfficerFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [propertySourceFilter, setPropertySourceFilter] = useState<"all" | "single-property">("all");
  const [propertyAddressFilter, setPropertyAddressFilter] = useState("all");
  const [selected, setSelected] = useState<ChatLead | null>(null);
  const [resendCandidate, setResendCandidate] = useState<ChatLead | null>(null);
  const [notesLead, setNotesLead] = useState<ChatLead | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const resend = trpc.chat.resend.useMutation({
    onSuccess: async (result) => {
      await utils.chat.list.invalidate();
      setResendCandidate(null);
      if (result.recipientEmailStatus === "sent") toast.success("Completed intake email resent.");
      else toast.warning("Resend needs manual follow-up. Review the recipient status for details.");
    },
    onError: (error) => toast.error(error.message || "Unable to resend the completed intake email."),
  });
  const assignAgent = trpc.chat.assignAgent.useMutation({
    onSuccess: () => {
      void utils.chat.list.invalidate();
      toast.success("Agent assignment updated.");
    },
    onError: (error) => toast.error(error.message || "Unable to assign the agent."),
  });
  const sendToAgent = trpc.chat.sendToAgent.useMutation({
    onSuccess: (result, input) => {
      const lead = leads.find((candidate) => candidate.id === input.chatLeadId);
      if (result.sent) {
        toast.success(`Chat intake sent to ${lead?.agentName || "the agent"}.`);
        void utils.chat.list.invalidate();
      } else {
        window.location.href = result.mailto;
        toast.info("Opened a prefilled intake referral draft because automatic email delivery is unavailable.");
      }
    },
    onError: (error) => toast.error(error.message || "Unable to send this intake to the agent."),
  });
  const updateNotes = trpc.chat.updateNotes.useMutation({
    onSuccess: () => {
      void utils.chat.list.invalidate();
      setNotesLead(null);
      toast.success("Chat intake notes saved.");
    },
    onError: (error) => toast.error(error.message || "Unable to save notes."),
  });
  const openEmailDraft = async (lead: ChatLead) => {
    if (!lead.email) {
      toast.error("This chat intake does not have an email address yet.");
      return;
    }
    try {
      const transcript = await utils.chat.transcript.fetch({ chatLeadId: lead.id });
      const coMarketingAgent = lead.isCoBranded && lead.agentId
        ? agents.find((agent) => agent.id === lead.agentId) ?? null
        : null;
      const draft = buildLeadWelcomeDraft({
        firstName: lead.fullName?.trim().split(/\s+/)[0] || "there",
        email: lead.email,
        scenarios: null,
        coMarketingAgent,
        siteOrigin: PUBLIC_SITE_ORIGIN,
        draftSource: "chat",
        chatTranscript: transcript.map((message) => ({ role: message.role, content: message.content })),
      });
      window.location.href = draft.mailto;
      toast.success("Chat recap email draft opened.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load this chat conversation for the email draft.");
    }
  };
  const loanOfficerOptions = useMemo(() => getLoanOfficerFilterOptions(displayLeads), [displayLeads]);
  const agentOptions = useMemo(() => getCoBrandAgentFilterOptions(displayLeads, loanOfficerFilter), [displayLeads, loanOfficerFilter]);
  const campaignOptions = useMemo(() => Array.from(new Set(displayLeads.map((lead) => [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" · ") || "Direct / untagged"))).sort(), [displayLeads]);
  const propertyAddressOptions = useMemo(() => Array.from(new Set(displayLeads.flatMap((lead) => lead.propertyPageAddress ? [lead.propertyPageAddress] : []))).sort(), [displayLeads]);
  const filtered = useMemo(() => displayLeads.filter((lead) => {
    const campaign = [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" · ") || "Direct / untagged";
    const haystack = `${lead.fullName ?? ""} ${lead.email ?? ""} ${lead.phone ?? ""} ${lead.loanOfficerName ?? ""} ${lead.agentName ?? ""} ${lead.propertyPageAddress ?? ""} ${campaign}`.toLowerCase();
    const officerMatches = loanOfficerFilter === "all" || lead.loanOfficerSlug === loanOfficerFilter || lead.loanOfficerName === loanOfficerFilter;
    const agentMatches = agentFilter === "all" || matchesSelectedCoBrandPair(lead, loanOfficerFilter, agentFilter);
    const propertySourceMatches = propertySourceFilter === "all" || Boolean(lead.propertyPageAddress);
    const propertyAddressMatches = propertyAddressFilter === "all" || lead.propertyPageAddress === propertyAddressFilter;
    return (status === "all" || lead.status === status) && officerMatches && agentMatches && propertySourceMatches && propertyAddressMatches && (campaignFilter === "all" || campaign === campaignFilter) && haystack.includes(search.toLowerCase());
  }), [displayLeads, search, status, loanOfficerFilter, agentFilter, campaignFilter, propertySourceFilter, propertyAddressFilter]);
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setLoanOfficerFilter("all");
    setAgentFilter("all");
    setCampaignFilter("all");
    setPropertySourceFilter("all");
    setPropertyAddressFilter("all");
  };
  const exportCsv = () => {
    const rows = [["Status", "UTM source", "UTM medium", "UTM campaign", "UTM content", "UTM term", "Landing path", "Referrer host", "Buyer-agent requested", "Buyer-agent requested at", "Co-branded source", "Loan officer", "Loan officer URL slug", "Agent", "Agent URL slug", "Recipient email status", "Resend count", "Last resent", "Name", "Email", "Phone", "Purpose", "Property type", "Property value", "Credit range", "Annual income", "Down payment", "Loan amount", "Low/no-down-payment home search", "Search area type", "Target area", "Started", "Completed"], ...filtered.map((lead) => [lead.status, lead.utmSource ?? "", lead.utmMedium ?? "", lead.utmCampaign ?? "", lead.utmContent ?? "", lead.utmTerm ?? "", lead.landingPath ?? "", lead.referrerHost ?? "", lead.buyerAgentRequest === 1 ? "Yes" : "No", lead.buyerAgentRequestedAt ? new Date(lead.buyerAgentRequestedAt).toISOString() : "", lead.isCoBranded ? "Yes" : "No", lead.loanOfficerName ?? "", lead.loanOfficerSlug ?? "", lead.agentName ?? "", lead.agentSlug ?? "", lead.recipientEmailStatus, lead.resendCount, lead.lastResentAt ? new Date(lead.lastResentAt).toISOString() : "", lead.fullName ?? "", lead.email ?? "", lead.phone ?? "", lead.loanPurpose ?? "", lead.propertyType ?? "", lead.propertyValue ?? "", lead.creditRange ?? "", lead.annualIncome ?? "", lead.downPayment ?? "", lead.loanAmount ?? "", lead.lowDownPaymentHomeSearch === 1 ? "Yes" : lead.lowDownPaymentHomeSearch === 0 ? "No" : "", lead.searchAreaType ?? "", lead.targetArea ?? "", new Date(lead.createdAt).toISOString(), lead.completedAt ? new Date(lead.completedAt).toISOString() : ""])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "mortgage-chat-intakes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const recipientStatus = (lead: ChatLead) => (
    <Badge title={lead.recipientEmailDetail || undefined} variant="outline" className={lead.recipientEmailStatus === "sent" ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700" : lead.recipientEmailStatus === "manual_follow_up" ? "border-amber-600/30 bg-amber-600/10 text-amber-800" : "border-border bg-muted text-muted-foreground"}>
      {lead.recipientEmailStatus === "sent" ? "Email sent" : lead.recipientEmailStatus === "manual_follow_up" ? "Follow up" : "Pending"}
    </Badge>
  );
  return (
    <section className="mt-10 rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-foreground"><MessageCircle className="h-5 w-5 text-primary" /> Mortgage chat intakes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Partial conversations are saved as incomplete; filter by any saved loan officer or agent and export exactly the list currently in view.</p>
        </div>
        <Button size="sm" onClick={exportCsv} disabled={filtered.length === 0}><Download className="mr-1.5 h-4 w-4" /> Export visible CSV</Button>
      </div>
      <div className="flex flex-col gap-3 border-b border-border/60 px-6 py-4">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone, loan officer, or agent…" /></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 xl:items-center">
          <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1">{(["all", "qualified", "incomplete"] as const).map((value) => <Button key={value} size="sm" variant={status === value ? "default" : "outline"} onClick={() => setStatus(value)}>{value === "all" ? "All" : value === "qualified" ? "Qualified" : "Incomplete"}</Button>)}</div>
          <Select value={loanOfficerFilter} onValueChange={(value) => { setLoanOfficerFilter(value); setAgentFilter("all"); }}><SelectTrigger className="w-full"><SelectValue placeholder="All loan officers" /></SelectTrigger><SelectContent><SelectItem value="all">All loan officers</SelectItem>{loanOfficerOptions.map((officer) => <SelectItem key={officer.value} value={officer.value}>{officer.label}</SelectItem>)}</SelectContent></Select>
          <Select value={agentFilter} onValueChange={setAgentFilter} disabled={loanOfficerFilter === "all"}><SelectTrigger className="w-full"><SelectValue placeholder={loanOfficerFilter === "all" ? "Select LO first" : "All co-brand agents"} /></SelectTrigger><SelectContent><SelectItem value="all">All co-brand agents</SelectItem>{agentOptions.map((agent) => <SelectItem key={agent.value} value={agent.value}>{agent.label}</SelectItem>)}</SelectContent></Select>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}><SelectTrigger className="w-full"><SelectValue placeholder="All campaigns" /></SelectTrigger><SelectContent><SelectItem value="all">All campaigns</SelectItem>{campaignOptions.map((campaign) => <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>)}</SelectContent></Select>
          <Select value={propertySourceFilter} onValueChange={(value) => setPropertySourceFilter(value as typeof propertySourceFilter)}><SelectTrigger className="w-full"><SelectValue placeholder="All lead sources" /></SelectTrigger><SelectContent><SelectItem value="all">All lead sources</SelectItem><SelectItem value="single-property">Single-property website</SelectItem></SelectContent></Select>
          <Select value={propertyAddressFilter} onValueChange={(value) => { setPropertyAddressFilter(value); if (value !== "all") setPropertySourceFilter("single-property"); }} disabled={propertyAddressOptions.length === 0}><SelectTrigger className="w-full"><SelectValue placeholder="All property addresses" /></SelectTrigger><SelectContent><SelectItem value="all">All property addresses</SelectItem>{propertyAddressOptions.map((address) => <SelectItem key={address} value={address}>{address}</SelectItem>)}</SelectContent></Select>
          <div className="flex min-w-0 items-center gap-2 xl:col-span-2"><Select value={activityRange} onValueChange={(value) => setActivityRange(value as PropertyActivityRange)}><SelectTrigger className="w-full"><SelectValue placeholder="Activity period" /></SelectTrigger><SelectContent>{PROPERTY_ACTIVITY_RANGES.map((range) => <SelectItem key={range} value={range}>{PROPERTY_ACTIVITY_RANGE_LABELS[range]}</SelectItem>)}</SelectContent></Select>{(search || status !== "all" || loanOfficerFilter !== "all" || agentFilter !== "all" || campaignFilter !== "all" || propertySourceFilter !== "all" || propertyAddressFilter !== "all") && <Button variant="ghost" size="sm" className="shrink-0" onClick={clearFilters}>Clear</Button>}</div>
        </div>
        <p className="text-xs text-muted-foreground">Showing {filtered.length} of {displayLeads.length} chat intake{displayLeads.length === 1 ? "" : "s"}. CSV export follows these filters.</p>
      </div>
      {query.isLoading ? (
        <div className="flex items-center justify-center py-14 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading chat intakes…</div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">No chat intake leads match these filters.</div>
      ) : (
        <div className="max-h-[65vh] overflow-auto overscroll-contain [scrollbar-gutter:stable] lg:max-h-[28rem]">
          <table className="min-w-[1500px] w-full text-sm">
            <thead><tr className="sticky top-0 z-10 border-b border-border bg-muted/95 text-left text-muted-foreground backdrop-blur-sm"><th className="px-5 py-3 font-semibold">Lead</th><th className="px-5 py-3 font-semibold">Campaign</th><th className="px-5 py-3 font-semibold">Co-brand source</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Recipients</th><th className="px-5 py-3 font-semibold">Resends</th><th className="px-5 py-3 font-semibold">Purpose</th><th className="min-w-[14rem] px-5 py-3 font-semibold">Planning snapshot</th><th className="px-5 py-3 font-semibold">Updated</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr></thead>
            <tbody>{filtered.map((lead) => <tr key={lead.id} className="border-b border-border/60 last:border-0">
              <td className="px-5 py-3.5"><div className="flex flex-wrap items-center gap-2"><div className="font-medium text-foreground">{lead.fullName || "Anonymous visitor"}</div><UsdaBadge lead={lead} /></div><div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><span>{lead.email || "No email"}</span><span>{lead.phone || "No phone"}</span>{hasUsableRoadmapPhone(lead.phone) && <Badge variant="outline" className="border-emerald-600/25 bg-emerald-600/5 text-emerald-700"><Smartphone className="mr-1 h-3 w-3" /> Phone ready</Badge>}{lead.smsConsent === 1 && hasUsableRoadmapPhone(lead.phone) && <Badge variant="outline" className="border-violet-600/25 bg-violet-600/5 text-violet-700"><MessageSquareText className="mr-1 h-3 w-3" /> Text ready</Badge>}</div><div className="mt-2 flex flex-wrap gap-1.5"><Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled={!lead.email} title={lead.email ? "Open a welcome email draft" : "This intake needs an email address first"} onClick={() => openEmailDraft(lead)}><Mail className="mr-1 h-3 w-3" /> Email draft</Button><Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => { setNotesLead(lead); setNotesDraft(lead.notes ?? ""); }}><NotebookPen className="mr-1 h-3 w-3" /> {lead.notes?.trim() ? "Notes" : "Add note"}</Button><Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled={!lead.agentId || sendToAgent.isPending} title={lead.agentId ? "Email this intake to the assigned agent" : "Assign an agent first"} onClick={() => sendToAgent.mutate({ chatLeadId: lead.id })}>{sendToAgent.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />} Send to agent</Button></div></td>
              <td className="px-5 py-3.5 text-xs text-muted-foreground">{[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" · ") || "Direct / untagged"}</td>
              <td className="px-5 py-3.5">{lead.propertyPageAddress ? <PropertyPageSourceSummary propertyLandingPageId={lead.propertyPageId} address={lead.propertyPageAddress} propertyPageSlug={lead.propertyPageSlug} listingSnapshot={lead.propertyPageListingSnapshot} activityCount={lead.propertyPageActivityCount} latestActivityType={lead.propertyPageLatestActivityType} latestActivityAt={lead.propertyPageLatestActivityAt} activityRange={activityRange} loanOfficerName={lead.loanOfficerName} agentName={lead.agentName} /> : lead.isCoBranded ? <div className="min-w-44"><Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">Co-branded</Badge><div className="mt-1.5 text-xs font-medium text-foreground">LO: {lead.loanOfficerName || "—"}</div><div className="text-xs text-muted-foreground">Agent: {lead.agentName || "—"}</div></div> : <Badge variant="outline" className="text-muted-foreground">Direct site</Badge>}</td>
              <td className="px-5 py-3.5"><Badge variant="outline" className={lead.status === "qualified" ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700" : "border-accent/40 bg-accent/15 text-accent-foreground"}>{lead.status === "qualified" ? "Qualified" : "Incomplete"}</Badge></td>
              <td className="px-5 py-3.5">{recipientStatus(lead)}</td>
              <td className="px-5 py-3.5"><div className="font-medium text-foreground">{lead.resendCount === 0 ? "Not resent" : `${lead.resendCount} resend${lead.resendCount === 1 ? "" : "s"}`}</div><div className="mt-0.5 text-xs text-muted-foreground">{lead.lastResentAt ? `Last: ${formatDateTime(lead.lastResentAt)}` : "—"}</div></td>
              <td className="px-5 py-3.5 capitalize">{lead.loanPurpose || "—"}</td>
              <td className="min-w-[14rem] px-5 py-3.5 text-xs text-muted-foreground"><div className="leading-relaxed">{lead.propertyType || "—"} · {money(lead.propertyValue)} · {lead.creditRange || "—"} · Income {money(lead.annualIncome)}</div>{lead.lowDownPaymentHomeSearch === 1 && <div className="mt-1 flex items-center gap-1 text-emerald-700"><MapPin className="h-3 w-3" /> Low/no-down search{lead.targetArea ? ` · ${lead.searchAreaType ?? "Area"}: ${lead.targetArea}` : " requested"}</div>}{lead.buyerAgentRequest === 1 && <div className="mt-1 text-amber-800">Buyer-agent connection requested</div>}<CalculatorScenarioSummary scenario={lead.scenario} /></td>
              <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">{new Date(lead.updatedAt).toLocaleString()}</td>
              <td className="px-5 py-3.5 text-right"><div className="flex min-w-[180px] flex-wrap justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setSelected(lead)}><FileText className="mr-1.5 h-3.5 w-3.5" /> View</Button><Select value={lead.agentId ? String(lead.agentId) : "none"} onValueChange={(value) => assignAgent.mutate({ chatLeadId: lead.id, agentId: value === "none" ? null : Number(value) })} disabled={assignAgent.isPending}><SelectTrigger className="h-8 w-[145px] text-xs"><SelectValue placeholder="No agent" /></SelectTrigger><SelectContent><SelectItem value="none">No agent</SelectItem>{agents.map((agent) => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}</SelectContent></Select>{lead.status === "qualified" && <Button variant="outline" size="sm" disabled={resend.isPending} onClick={() => setResendCandidate(lead)}><Mail className="mr-1.5 h-3.5 w-3.5" /> Resend</Button>}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      <TranscriptDialog lead={selected} onOpenChange={(open) => !open && setSelected(null)} />
      <Dialog open={notesLead !== null} onOpenChange={(open) => !open && setNotesLead(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Notes for {notesLead?.fullName || "this chat intake"}</DialogTitle>
            <DialogDescription>Private follow-up notes are visible only in this dashboard and never to the visitor.</DialogDescription>
          </DialogHeader>
          <Textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} maxLength={5000} placeholder="e.g., Called 8/14 — reviewing payment options before follow-up Friday" className="min-h-32" />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setNotesLead(null)} disabled={updateNotes.isPending}>Cancel</Button><Button onClick={() => notesLead && updateNotes.mutate({ chatLeadId: notesLead.id, notes: notesDraft })} disabled={!notesLead || updateNotes.isPending || notesDraft === (notesLead.notes ?? "")}>{updateNotes.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Save notes</Button></div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={resendCandidate !== null} onOpenChange={(open) => !open && setResendCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend completed intake email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the saved completed intake for {resendCandidate?.fullName || "this visitor"} to the assigned loan officer and, when applicable, the co-branded agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resend.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={resend.isPending || !resendCandidate} onClick={() => resendCandidate && resend.mutate({ chatLeadId: resendCandidate.id })}>
              {resend.isPending ? "Resending…" : "Confirm resend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
