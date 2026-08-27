import { useEffect, useState } from "react";
import { BadgeCheck, CirclePause, Loader2, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Provider = "meta" | "google_ads";
type Stage = "not_started" | "details_saved" | "compliance_pending" | "approved_not_connected";

const PROVIDERS: Array<{ value: Provider; title: string; detail: string }> = [
  { value: "meta", title: "Meta Lead Ads", detail: "Plan the account and approved lead-form reference for a later controlled connection." },
  { value: "google_ads", title: "Google Ads lead forms", detail: "Plan the account and approved form reference for a later controlled connection." },
];

const STAGE_LABELS: Record<Stage, string> = {
  not_started: "Not started",
  details_saved: "Planning details saved",
  compliance_pending: "Compliance approval pending",
  approved_not_connected: "Approved — not connected",
};

function PlanningCard({ provider, title, detail }: { provider: Provider; title: string; detail: string }) {
  const utils = trpc.useUtils();
  const { data } = trpc.adIntegrationSettings.list.useQuery();
  const saved = data?.find((entry) => entry.provider === provider);
  const [stage, setStage] = useState<Stage>("not_started");
  const [accountReference, setAccountReference] = useState("");
  const [formReference, setFormReference] = useState("");
  const [internalNote, setInternalNote] = useState("");

  useEffect(() => {
    setStage(saved?.setupStage ?? "not_started");
    setAccountReference(saved?.accountReference ?? "");
    setFormReference(saved?.formReference ?? "");
    setInternalNote(saved?.internalNote ?? "");
  }, [saved?.accountReference, saved?.formReference, saved?.internalNote, saved?.setupStage]);

  const save = trpc.adIntegrationSettings.save.useMutation({
    onSuccess: async () => {
      await utils.adIntegrationSettings.list.invalidate();
      toast.success(`${title} planning settings saved. Connection remains off.`);
    },
    onError: (error) => toast.error(error.message),
  });

  return <article className="flex flex-col rounded-xl border border-border bg-background/60 p-4">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p></div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200"><CirclePause className="h-3.5 w-3.5" aria-hidden="true" />On hold</span>
    </div>
    <div className="mt-4 grid gap-3">
      <label className="grid gap-1.5 text-xs font-semibold">Setup stage<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={stage} onChange={(event) => setStage(event.target.value as Stage)}>{(Object.keys(STAGE_LABELS) as Stage[]).map((value) => <option key={value} value={value}>{STAGE_LABELS[value]}</option>)}</select></label>
      <label className="grid gap-1.5 text-xs font-semibold">Account reference (non-secret)<Input value={accountReference} maxLength={180} onChange={(event) => setAccountReference(event.target.value)} placeholder="Account label or ID — never a password or token" /></label>
      <label className="grid gap-1.5 text-xs font-semibold">Approved form reference (non-secret)<Input value={formReference} maxLength={240} onChange={(event) => setFormReference(event.target.value)} placeholder="Lead form name or ID" /></label>
      <label className="grid gap-1.5 text-xs font-semibold">Internal planning notes<Textarea value={internalNote} maxLength={2000} onChange={(event) => setInternalNote(event.target.value)} className="min-h-20 resize-y" placeholder="Compliance notes, form mapping decisions, or release dependencies" /></label>
    </div>
    <Button type="button" className="mt-4 self-start" onClick={() => save.mutate({ provider, setupStage: stage, accountReference: accountReference.trim() || null, formReference: formReference.trim() || null, internalNote: internalNote.trim() || null })} disabled={save.isPending}>
      {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}Save planning settings
    </Button>
  </article>;
}

export default function AdvertisingIntegrationSettings() {
  return <section id="advertising-integrations" className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="advertising-integrations-heading">
    <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div><div className="flex items-center gap-2 text-primary"><BadgeCheck className="h-5 w-5" aria-hidden="true" /><span className="text-xs font-bold uppercase tracking-[0.16em]">Administrator only</span></div><h2 id="advertising-integrations-heading" className="mt-2 text-xl font-bold tracking-tight">Advertising integration settings</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Save non-secret account and form planning details as Mike Ford prepares a future, compliance-approved connection for Meta or Google paid-lead workflows.</p></div>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200"><ShieldAlert className="h-4 w-4" aria-hidden="true" />No credentials, webhooks, or lead imports enabled</span>
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">{PROVIDERS.map((provider) => <PlanningCard key={provider.value} provider={provider.value} title={provider.title} detail={provider.detail} />)}</div>
  </section>;
}
