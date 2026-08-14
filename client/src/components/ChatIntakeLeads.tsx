import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Download, FileText, Loader2, Mail, MapPin, MessageCircle, MessageSquareText, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { getCoBrandAgentFilterOptions, getLoanOfficerFilterOptions, matchesSelectedCoBrandPair } from "@shared/roadmapPairFilters";
import { buildLeadWelcomeDraft } from "@shared/leadEmailDraft";
import { PUBLIC_SITE_ORIGIN } from "@shared/publicSiteUrl";

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
  isCoBranded: boolean;
};

type AgentOption = { id: number; name: string; slug: string; email: string; phone: string; bio: string | null; website: string; companyName: string; headshotUrl: string; companyLogoUrl: string; visible: number };

const money = (value: number | null) =>
  value === null
    ? "—"
    : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const formatDateTime = (value: Date | null) => (value ? new Date(value).toLocaleString() : "—");

function TranscriptDialog({ lead, onOpenChange }: { lead: ChatLead | null; onOpenChange: (open: boolean) => void }) {
  const transcript = trpc.chat.transcript.useQuery({ chatLeadId: lead?.id ?? 1 }, { enabled: lead !== null });
  return (
    <Dialog open={lead !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead?.fullName || "Anonymous"}’s intake transcript</DialogTitle>
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
  const query = trpc.chat.list.useQuery();
  const agentsQuery = trpc.agent.list.useQuery();
  const utils = trpc.useUtils();
  const leads = (query.data ?? []) as ChatLead[];
  const agents = ((agentsQuery.data ?? []) as AgentOption[]).filter((agent) => agent.visible === 1);
  const displayLeads = leads;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "incomplete" | "qualified">("all");
  const [loanOfficerFilter, setLoanOfficerFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [selected, setSelected] = useState<ChatLead | null>(null);
  const [resendCandidate, setResendCandidate] = useState<ChatLead | null>(null);
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
  const openEmailDraft = (lead: ChatLead) => {
    if (!lead.email) {
      toast.error("This chat intake does not have an email address yet.");
      return;
    }
    const coMarketingAgent = lead.isCoBranded && lead.agentId
      ? agents.find((agent) => agent.id === lead.agentId) ?? null
      : null;
    const draft = buildLeadWelcomeDraft({
      firstName: lead.fullName?.trim().split(/\s+/)[0] || "there",
      email: lead.email,
      scenarios: null,
      coMarketingAgent,
      siteOrigin: PUBLIC_SITE_ORIGIN,
    });
    window.location.href = draft.mailto;
    toast.success("Welcome email draft opened.");
  };
  const loanOfficerOptions = useMemo(() => getLoanOfficerFilterOptions(displayLeads), [displayLeads]);
  const agentOptions = useMemo(() => getCoBrandAgentFilterOptions(displayLeads, loanOfficerFilter), [displayLeads, loanOfficerFilter]);
  const filtered = useMemo(() => displayLeads.filter((lead) => {
    const haystack = `${lead.fullName ?? ""} ${lead.email ?? ""} ${lead.phone ?? ""} ${lead.loanOfficerName ?? ""} ${lead.agentName ?? ""}`.toLowerCase();
    const officerMatches = loanOfficerFilter === "all" || lead.loanOfficerSlug === loanOfficerFilter || lead.loanOfficerName === loanOfficerFilter;
    const agentMatches = agentFilter === "all" || matchesSelectedCoBrandPair(lead, loanOfficerFilter, agentFilter);
    return (status === "all" || lead.status === status) && officerMatches && agentMatches && haystack.includes(search.toLowerCase());
  }), [displayLeads, search, status, loanOfficerFilter, agentFilter]);
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setLoanOfficerFilter("all");
    setAgentFilter("all");
  };
  const exportCsv = () => {
    const rows = [["Status", "Co-branded source", "Loan officer", "Loan officer URL slug", "Agent", "Agent URL slug", "Recipient email status", "Resend count", "Last resent", "Name", "Email", "Phone", "Purpose", "Property type", "Property value", "Credit range", "Annual income", "Down payment", "Loan amount", "Low/no-down-payment home search", "Search area type", "Target area", "Started", "Completed"], ...filtered.map((lead) => [lead.status, lead.isCoBranded ? "Yes" : "No", lead.loanOfficerName ?? "", lead.loanOfficerSlug ?? "", lead.agentName ?? "", lead.agentSlug ?? "", lead.recipientEmailStatus, lead.resendCount, lead.lastResentAt ? new Date(lead.lastResentAt).toISOString() : "", lead.fullName ?? "", lead.email ?? "", lead.phone ?? "", lead.loanPurpose ?? "", lead.propertyType ?? "", lead.propertyValue ?? "", lead.creditRange ?? "", lead.annualIncome ?? "", lead.downPayment ?? "", lead.loanAmount ?? "", lead.lowDownPaymentHomeSearch === 1 ? "Yes" : lead.lowDownPaymentHomeSearch === 0 ? "No" : "", lead.searchAreaType ?? "", lead.targetArea ?? "", new Date(lead.createdAt).toISOString(), lead.completedAt ? new Date(lead.completedAt).toISOString() : ""])];
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
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}><Download className="mr-1.5 h-4 w-4" /> Export CSV</Button>
      </div>
      <div className="flex flex-col gap-3 border-b border-border/60 px-6 py-4">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone, loan officer, or agent…" /></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-2">{(["all", "qualified", "incomplete"] as const).map((value) => <Button key={value} size="sm" variant={status === value ? "default" : "outline"} onClick={() => setStatus(value)}>{value === "all" ? "All" : value === "qualified" ? "Qualified" : "Incomplete"}</Button>)}</div>
          <Select value={loanOfficerFilter} onValueChange={(value) => { setLoanOfficerFilter(value); setAgentFilter("all"); }}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All loan officers" /></SelectTrigger><SelectContent><SelectItem value="all">All loan officers</SelectItem>{loanOfficerOptions.map((officer) => <SelectItem key={officer.value} value={officer.value}>{officer.label}</SelectItem>)}</SelectContent></Select>
          <Select value={agentFilter} onValueChange={setAgentFilter} disabled={loanOfficerFilter === "all"}><SelectTrigger className="w-full sm:w-56"><SelectValue placeholder={loanOfficerFilter === "all" ? "Select LO first" : "All co-brand agents"} /></SelectTrigger><SelectContent><SelectItem value="all">All co-brand agents</SelectItem>{agentOptions.map((agent) => <SelectItem key={agent.value} value={agent.value}>{agent.label}</SelectItem>)}</SelectContent></Select>
          {(search || status !== "all" || loanOfficerFilter !== "all" || agentFilter !== "all") && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
        </div>
        <p className="text-xs text-muted-foreground">Showing {filtered.length} of {displayLeads.length} chat intake{displayLeads.length === 1 ? "" : "s"}. CSV export follows these filters.</p>
      </div>
      {query.isLoading ? (
        <div className="flex items-center justify-center py-14 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading chat intakes…</div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">No chat intake leads match these filters.</div>
      ) : (
        <div className="max-h-[65vh] overflow-auto overscroll-contain [scrollbar-gutter:stable] lg:max-h-[28rem]">
          <table className="w-full text-sm">
            <thead><tr className="sticky top-0 z-10 border-b border-border bg-muted/95 text-left text-muted-foreground backdrop-blur-sm"><th className="px-5 py-3 font-semibold">Lead</th><th className="px-5 py-3 font-semibold">Co-brand source</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Recipients</th><th className="px-5 py-3 font-semibold">Resends</th><th className="px-5 py-3 font-semibold">Purpose</th><th className="px-5 py-3 font-semibold">Planning snapshot</th><th className="px-5 py-3 font-semibold">Updated</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr></thead>
            <tbody>{filtered.map((lead) => <tr key={lead.id} className="border-b border-border/60 last:border-0">
              <td className="px-5 py-3.5"><div className="font-medium text-foreground">{lead.fullName || "Anonymous visitor"}</div><div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><span>{lead.email || lead.phone || "No contact details yet"}</span>{lead.smsConsent === 1 && lead.phone && <Badge variant="outline" className="border-violet-600/25 bg-violet-600/5 text-violet-700"><MessageSquareText className="mr-1 h-3 w-3" /> Text ready</Badge>}</div></td>
              <td className="px-5 py-3.5">{lead.isCoBranded ? <div className="min-w-44"><Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">Co-branded</Badge><div className="mt-1.5 text-xs font-medium text-foreground">LO: {lead.loanOfficerName || "—"}</div><div className="text-xs text-muted-foreground">Agent: {lead.agentName || "—"}</div></div> : <Badge variant="outline" className="text-muted-foreground">Direct site</Badge>}</td>
              <td className="px-5 py-3.5"><Badge variant="outline" className={lead.status === "qualified" ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700" : "border-accent/40 bg-accent/15 text-accent-foreground"}>{lead.status === "qualified" ? "Qualified" : "Incomplete"}</Badge></td>
              <td className="px-5 py-3.5">{recipientStatus(lead)}</td>
              <td className="px-5 py-3.5"><div className="font-medium text-foreground">{lead.resendCount === 0 ? "Not resent" : `${lead.resendCount} resend${lead.resendCount === 1 ? "" : "s"}`}</div><div className="mt-0.5 text-xs text-muted-foreground">{lead.lastResentAt ? `Last: ${formatDateTime(lead.lastResentAt)}` : "—"}</div></td>
              <td className="px-5 py-3.5 capitalize">{lead.loanPurpose || "—"}</td>
              <td className="px-5 py-3.5 text-xs text-muted-foreground"><div>{lead.propertyType || "—"} · {money(lead.propertyValue)} · {lead.creditRange || "—"} · Income {money(lead.annualIncome)}</div>{lead.lowDownPaymentHomeSearch === 1 && <div className="mt-1 flex items-center gap-1 text-emerald-700"><MapPin className="h-3 w-3" /> Low/no-down search{lead.targetArea ? ` · ${lead.searchAreaType ?? "Area"}: ${lead.targetArea}` : " requested"}</div>}</td>
              <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">{new Date(lead.updatedAt).toLocaleString()}</td>
              <td className="px-5 py-3.5 text-right"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setSelected(lead)}><FileText className="mr-1.5 h-3.5 w-3.5" /> View</Button>{lead.email && <Button variant="outline" size="sm" onClick={() => openEmailDraft(lead)}><Mail className="mr-1.5 h-3.5 w-3.5" /> Email draft</Button>}<Select value={lead.agentId ? String(lead.agentId) : "none"} onValueChange={(value) => assignAgent.mutate({ chatLeadId: lead.id, agentId: value === "none" ? null : Number(value) })} disabled={assignAgent.isPending}><SelectTrigger className="h-8 w-[145px] text-xs"><SelectValue placeholder="No agent" /></SelectTrigger><SelectContent><SelectItem value="none">No agent</SelectItem>{agents.map((agent) => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}</SelectContent></Select>{lead.agentId && <Button variant="outline" size="sm" disabled={sendToAgent.isPending} onClick={() => sendToAgent.mutate({ chatLeadId: lead.id })}>{sendToAgent.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />} Send to agent</Button>}{lead.status === "qualified" && <Button variant="outline" size="sm" disabled={resend.isPending} onClick={() => setResendCandidate(lead)}><Mail className="mr-1.5 h-3.5 w-3.5" /> Resend</Button>}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      <TranscriptDialog lead={selected} onOpenChange={(open) => !open && setSelected(null)} />
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
