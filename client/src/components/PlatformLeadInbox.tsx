import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Inbox, Loader2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function displayDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "—";
}

export default function PlatformLeadInbox() {
  const utils = trpc.useUtils();
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualLead, setManualLead] = useState({ provider: "meta" as "meta" | "google", fullName: "", email: "", phone: "", externalFormId: "", externalCampaignId: "", notes: "" });
  const leadsQuery = trpc.platformLeads.list.useQuery();
  const archiveMutation = trpc.platformLeads.setArchived.useMutation({
    onSuccess: () => {
      void utils.platformLeads.list.invalidate();
      toast.success("Native platform lead archived.");
    },
    onError: (error) => toast.error(error.message || "Could not archive the platform lead."),
  });
  const createManualMutation = trpc.platformLeads.createManual.useMutation({
    onSuccess: () => {
      void utils.platformLeads.list.invalidate();
      setManualLead({ provider: "meta", fullName: "", email: "", phone: "", externalFormId: "", externalCampaignId: "", notes: "" });
      setManualEntryOpen(false);
      toast.success("Manual platform lead added to the private inbox.");
    },
    onError: (error) => toast.error(error.message || "Could not add the manual lead."),
  });
  const leads = leadsQuery.data ?? [];

  return (
    <section id="platform-leads" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground"><Inbox className="h-5 w-5 text-primary" /> Ad platform leads</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Private native Meta Lead Ads and Google lead-form submissions appear here after their secure webhook receivers are configured. These are intentionally separate from website Roadmap and Mortgage Chat leads because native forms do not establish a website UTM session.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="w-fit gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" /> Verified receivers</Badge>
          <Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add manual lead</Button></DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Add native platform lead manually</DialogTitle>
                <DialogDescription>Use this while native webhooks are paused. The record will be labeled as manually entered and will not be counted as a website Roadmap or chat submission.</DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); createManualMutation.mutate(manualLead); }}>
                <div className="grid gap-2"><Label htmlFor="manual-provider">Original platform</Label><Select value={manualLead.provider} onValueChange={(value) => setManualLead((current) => ({ ...current, provider: value as "meta" | "google" }))}><SelectTrigger id="manual-provider"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="meta">Meta / Facebook Lead Ad</SelectItem><SelectItem value="google">Google Ads lead form</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2"><Label htmlFor="manual-name">Lead name</Label><Input id="manual-name" value={manualLead.fullName} onChange={(event) => setManualLead((current) => ({ ...current, fullName: event.target.value }))} placeholder="First and last name" required maxLength={240} /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2"><Label htmlFor="manual-email">Email</Label><Input id="manual-email" type="email" value={manualLead.email} onChange={(event) => setManualLead((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" maxLength={320} /></div>
                  <div className="grid gap-2"><Label htmlFor="manual-phone">Phone</Label><Input id="manual-phone" value={manualLead.phone} onChange={(event) => setManualLead((current) => ({ ...current, phone: event.target.value }))} placeholder="(555) 555-5555" maxLength={40} /></div>
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">Enter at least one contact method. Do not assume SMS consent; record outreach only under the consent terms actually captured by the original form.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2"><Label htmlFor="manual-form">Platform form ID <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="manual-form" value={manualLead.externalFormId} onChange={(event) => setManualLead((current) => ({ ...current, externalFormId: event.target.value }))} placeholder="e.g., Lead form 2026" maxLength={80} /></div>
                  <div className="grid gap-2"><Label htmlFor="manual-campaign">Campaign ID/name <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="manual-campaign" value={manualLead.externalCampaignId} onChange={(event) => setManualLead((current) => ({ ...current, externalCampaignId: event.target.value }))} placeholder="e.g., FTB chat campaign" maxLength={80} /></div>
                </div>
                <div className="grid gap-2"><Label htmlFor="manual-notes">Internal intake note <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="manual-notes" value={manualLead.notes} onChange={(event) => setManualLead((current) => ({ ...current, notes: event.target.value }))} placeholder="Record only approved internal context; do not paste sensitive form responses." maxLength={1000} /></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setManualEntryOpen(false)}>Cancel</Button><Button type="submit" disabled={createManualMutation.isPending}>{createManualMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Add to inbox</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {leadsQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading native platform leads…</div>
      ) : leads.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
          No native platform leads have arrived. Website UTM-tagged Roadmap and completed chat leads remain in their existing funnel sections. Configure Meta or Google webhook secrets before testing the receivers.
        </div>
      ) : (
        <div className="mt-5 max-h-[32rem] space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]" aria-label="Native platform lead inbox">
          {leads.map((lead) => (
            <article key={lead.id} className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{lead.fullName || [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed platform lead"}</p>
                  <Badge className={lead.provider === "meta" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>{lead.provider === "meta" ? "Meta" : "Google"}</Badge>
                  {lead.ingestionMethod === "manual" ? <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">Manual entry</Badge> : null}
                  <Badge variant="outline" className={lead.status === "test" ? "border-sky-200 bg-sky-50 text-sky-800" : lead.status === "archived" ? "text-muted-foreground" : "border-emerald-200 bg-emerald-50 text-emerald-800"}>{lead.status}</Badge>
                </div>
                <p className="mt-1 break-words text-sm text-muted-foreground">{[lead.email, lead.phone].filter(Boolean).join(" · ") || "No approved contact field received"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Form {lead.externalFormId || "—"} · Campaign {lead.externalCampaignId || "—"} · Received {displayDate(lead.receivedAt)}</p>
              </div>
              {lead.status !== "archived" ? <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate({ id: lead.id, archived: true })} disabled={archiveMutation.isPending}><Archive className="mr-1.5 h-3.5 w-3.5" /> Archive</Button> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
