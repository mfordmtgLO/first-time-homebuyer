import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Inbox, Loader2, Plus, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const LEAD_SOURCE_LABELS = {
  facebook: "Facebook",
  google_ads: "Google Ads",
  organic: "Organic",
} as const;

type LeadSource = keyof typeof LEAD_SOURCE_LABELS;

function displayDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "—";
}

export default function PlatformLeadInbox() {
  const utils = trpc.useUtils();
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualLead, setManualLead] = useState({ leadSource: "facebook" as LeadSource, fullName: "", email: "", phone: "", externalFormId: "", externalCampaignId: "", notes: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | LeadSource>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");

  const leadsQuery = trpc.platformLeads.list.useQuery();
  const officersQuery = trpc.loanOfficer.list.useQuery();
  const agentsQuery = trpc.agent.list.useQuery();
  const archiveMutation = trpc.platformLeads.setArchived.useMutation({
    onSuccess: () => { void utils.platformLeads.list.invalidate(); toast.success("Platform lead archived."); },
    onError: (error) => toast.error(error.message || "Could not archive the platform lead."),
  });
  const createManualMutation = trpc.platformLeads.createManual.useMutation({
    onSuccess: () => {
      void utils.platformLeads.list.invalidate();
      setManualLead({ leadSource: "facebook", fullName: "", email: "", phone: "", externalFormId: "", externalCampaignId: "", notes: "" });
      setManualEntryOpen(false);
      toast.success("Manual platform lead added to the private inbox.");
    },
    onError: (error) => toast.error(error.message || "Could not add the manual lead."),
  });
  const assignmentMutation = trpc.platformLeads.updateAssignments.useMutation({
    onSuccess: () => { void utils.platformLeads.list.invalidate(); toast.success("Platform lead assignment updated."); },
    onError: (error) => toast.error(error.message || "Could not update the assignment."),
  });

  const officers = officersQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const officerNames = useMemo(() => new Map(officers.map((officer) => [officer.id, officer.name])), [officers]);
  const agentNames = useMemo(() => new Map(agents.map((agent) => [agent.id, agent.name])), [agents]);
  const leads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return (leadsQuery.data ?? []).filter((lead) => {
      const matchesSource = sourceFilter === "all" || lead.leadSource === sourceFilter;
      const hasAssignment = Boolean(lead.assignedLoanOfficerId || lead.assignedAgentId);
      const matchesAssignment = assignmentFilter === "all" || (assignmentFilter === "assigned" ? hasAssignment : !hasAssignment);
      const searchable = [lead.fullName, lead.firstName, lead.lastName, lead.email, lead.phone, lead.externalFormId, lead.externalCampaignId, lead.externalLeadId].filter(Boolean).join(" ").toLowerCase();
      return matchesSource && matchesAssignment && (!query || searchable.includes(query));
    });
  }, [assignmentFilter, leadsQuery.data, searchTerm, sourceFilter]);

  return (
    <section id="platform-leads" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground"><Inbox className="h-5 w-5 text-primary" /> Ad platform leads</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Private native Meta Lead Ads and Google lead-form submissions appear here after their secure webhook receivers are configured. Native form and manual leads remain separate from website Roadmap and Mortgage Chat submissions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="w-fit gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" /> Verified receivers</Badge>
          <Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add manual lead</Button></DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
              <DialogHeader><DialogTitle>Add platform lead manually</DialogTitle><DialogDescription>Use this while webhooks are paused. The record will be labeled as manually entered and will not be counted as a website Roadmap or chat submission.</DialogDescription></DialogHeader>
              <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); createManualMutation.mutate(manualLead); }}>
                <div className="grid gap-2"><Label htmlFor="manual-source">Lead Source</Label><Select value={manualLead.leadSource} onValueChange={(value) => setManualLead((current) => ({ ...current, leadSource: value as LeadSource }))}><SelectTrigger id="manual-source"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="facebook">Facebook</SelectItem><SelectItem value="google_ads">Google Ads</SelectItem><SelectItem value="organic">Organic</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2"><Label htmlFor="manual-name">Lead name</Label><Input id="manual-name" value={manualLead.fullName} onChange={(event) => setManualLead((current) => ({ ...current, fullName: event.target.value }))} placeholder="First and last name" required maxLength={240} /></div>
                <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="manual-email">Email</Label><Input id="manual-email" type="email" value={manualLead.email} onChange={(event) => setManualLead((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" maxLength={320} /></div><div className="grid gap-2"><Label htmlFor="manual-phone">Phone</Label><Input id="manual-phone" value={manualLead.phone} onChange={(event) => setManualLead((current) => ({ ...current, phone: event.target.value }))} placeholder="(555) 555-5555" maxLength={40} /></div></div>
                <p className="-mt-2 text-xs text-muted-foreground">Enter at least one contact method. Do not assume SMS consent; record outreach only under the consent terms actually captured by the original form.</p>
                <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="manual-form">Platform form ID <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="manual-form" value={manualLead.externalFormId} onChange={(event) => setManualLead((current) => ({ ...current, externalFormId: event.target.value }))} placeholder="e.g., Lead form 2026" maxLength={80} /></div><div className="grid gap-2"><Label htmlFor="manual-campaign">Campaign ID/name <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="manual-campaign" value={manualLead.externalCampaignId} onChange={(event) => setManualLead((current) => ({ ...current, externalCampaignId: event.target.value }))} placeholder="e.g., FTB chat campaign" maxLength={80} /></div></div>
                <div className="grid gap-2"><Label htmlFor="manual-notes">Internal intake note <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="manual-notes" value={manualLead.notes} onChange={(event) => setManualLead((current) => ({ ...current, notes: event.target.value }))} placeholder="Record only approved internal context; do not paste sensitive form responses." maxLength={1000} /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setManualEntryOpen(false)}>Cancel</Button><Button type="submit" disabled={createManualMutation.isPending}>{createManualMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Add to inbox</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-5 grid gap-2 rounded-xl border border-border bg-muted/30 p-3 lg:grid-cols-[minmax(0,1fr)_11rem_11rem]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-9" placeholder="Search name, email, phone, form, campaign, or lead ID" aria-label="Search platform leads" /></div><Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}><SelectTrigger aria-label="Filter platform leads by source"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem><SelectItem value="facebook">Facebook</SelectItem><SelectItem value="google_ads">Google Ads</SelectItem><SelectItem value="organic">Organic</SelectItem></SelectContent></Select><Select value={assignmentFilter} onValueChange={(value) => setAssignmentFilter(value as typeof assignmentFilter)}><SelectTrigger aria-label="Filter platform leads by assignment"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All assignments</SelectItem><SelectItem value="assigned">Assigned</SelectItem><SelectItem value="unassigned">Unassigned</SelectItem></SelectContent></Select></div>

      {leadsQuery.isLoading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading platform leads…</div> : leads.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">No platform leads match these filters. You can add a Facebook, Google Ads, or Organic lead manually while webhooks remain on hold.</div> : <div className="mt-5 max-h-[38rem] space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]" aria-label="Native platform lead inbox">{leads.map((lead) => {
        const sourceLabel = lead.leadSource ? LEAD_SOURCE_LABELS[lead.leadSource] : lead.provider === "meta" ? "Facebook" : lead.provider === "google" ? "Google Ads" : "Manual";
        const sourceClass = lead.leadSource === "facebook" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : lead.leadSource === "google_ads" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : "bg-stone-100 text-stone-800 hover:bg-stone-100";
        return <article key={lead.id} className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-foreground">{lead.fullName || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed platform lead"}</p><Badge className={sourceClass}>{sourceLabel}</Badge>{lead.ingestionMethod === "manual" ? <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">Manual entry</Badge> : null}<Badge variant="outline" className={lead.status === "test" ? "border-sky-200 bg-sky-50 text-sky-800" : lead.status === "archived" ? "text-muted-foreground" : "border-emerald-200 bg-emerald-50 text-emerald-800"}>{lead.status}</Badge></div><p className="mt-1 break-words text-sm text-muted-foreground">{[lead.email, lead.phone].filter(Boolean).join(" · ") || "No approved contact field received"}</p><p className="mt-1 text-xs text-muted-foreground">Form {lead.externalFormId || "—"} · Campaign {lead.externalCampaignId || "—"} · Received {displayDate(lead.receivedAt)}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="grid gap-1"><Label className="text-xs">Loan officer assignment</Label><Select value={lead.assignedLoanOfficerId ? String(lead.assignedLoanOfficerId) : "unassigned"} onValueChange={(value) => assignmentMutation.mutate({ id: lead.id, assignedLoanOfficerId: value === "unassigned" ? null : Number(value), assignedAgentId: lead.assignedAgentId ?? null })} disabled={assignmentMutation.isPending}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{officers.map((officer) => <SelectItem key={officer.id} value={String(officer.id)}>{officer.name}</SelectItem>)}</SelectContent></Select>{lead.assignedLoanOfficerId ? <span className="text-xs text-muted-foreground">Assigned: {officerNames.get(lead.assignedLoanOfficerId) || "Former loan officer"}</span> : null}</div><div className="grid gap-1"><Label className="text-xs">Co-branded agent assignment</Label><Select value={lead.assignedAgentId ? String(lead.assignedAgentId) : "unassigned"} onValueChange={(value) => assignmentMutation.mutate({ id: lead.id, assignedLoanOfficerId: lead.assignedLoanOfficerId ?? null, assignedAgentId: value === "unassigned" ? null : Number(value) })} disabled={assignmentMutation.isPending}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{agents.map((agent) => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}</SelectContent></Select>{lead.assignedAgentId ? <span className="text-xs text-muted-foreground">Assigned: {agentNames.get(lead.assignedAgentId) || "Former co-branded agent"}</span> : null}</div></div></div>{lead.status !== "archived" ? <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate({ id: lead.id, archived: true })} disabled={archiveMutation.isPending}><Archive className="mr-1.5 h-3.5 w-3.5" /> Archive</Button> : null}</article>;
      })}</div>}
    </section>
  );
}
