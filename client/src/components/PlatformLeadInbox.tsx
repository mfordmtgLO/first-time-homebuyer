import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, Inbox, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function displayDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "—";
}

export default function PlatformLeadInbox() {
  const utils = trpc.useUtils();
  const leadsQuery = trpc.platformLeads.list.useQuery();
  const archiveMutation = trpc.platformLeads.setArchived.useMutation({
    onSuccess: () => {
      void utils.platformLeads.list.invalidate();
      toast.success("Native platform lead archived.");
    },
    onError: (error) => toast.error(error.message || "Could not archive the platform lead."),
  });
  const leads = leadsQuery.data ?? [];

  return (
    <section id="platform-leads" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground"><Inbox className="h-5 w-5 text-primary" /> Ad platform leads</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Private native Meta Lead Ads and Google lead-form submissions appear here after their secure webhook receivers are configured. These are intentionally separate from website Roadmap and Mortgage Chat leads because native forms do not establish a website UTM session.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" /> Verified receivers</Badge>
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
