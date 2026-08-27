import { useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, CircleCheck, CirclePause, KeyRound, Loader2, PlugZap, Save, ShieldAlert } from "lucide-react";
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

function getReadiness(accountReference: string, apiKeyConfigured: boolean, stage: Stage) {
  if (!accountReference.trim()) return { label: "Inactive — Account ID missing", detail: "Add a non-secret advertising Account ID after the provider account is created.", tone: "text-muted-foreground", Icon: CircleAlert };
  if (!apiKeyConfigured) return { label: "Inactive — secure API key missing", detail: "A protected key may be added only after the account and approval requirements are ready.", tone: "text-amber-800 dark:text-amber-200", Icon: CircleAlert };
  if (stage === "approved_not_connected") return { label: "Ready to connect — still off", detail: "All planning fields are present, but no provider request, webhook, or import is enabled.", tone: "text-emerald-700 dark:text-emerald-300", Icon: CircleCheck };
  return { label: "Inactive — planning in progress", detail: "Secure key is present; complete compliance and form-mapping steps before a future connection review.", tone: "text-primary", Icon: CirclePause };
}

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

  const readiness = getReadiness(accountReference, Boolean(saved?.apiKeyConfigured), stage);

  return <article className="flex flex-col rounded-xl border border-border bg-background/60 p-4">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p></div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200"><CirclePause className="h-3.5 w-3.5" aria-hidden="true" />On hold</span>
    </div>
    <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
      <div className={`flex items-center gap-2 text-xs font-bold ${readiness.tone}`}><readiness.Icon className="h-4 w-4" aria-hidden="true" />{readiness.label}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{readiness.detail}</p>
    </div>
    <div className="mt-4 grid gap-3">
      <label className="grid gap-1.5 text-xs font-semibold">Setup stage<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={stage} onChange={(event) => setStage(event.target.value as Stage)}>{(Object.keys(STAGE_LABELS) as Stage[]).map((value) => <option key={value} value={value}>{STAGE_LABELS[value]}</option>)}</select></label>
      <label className="grid gap-1.5 text-xs font-semibold">Account ID (non-secret)<Input value={accountReference} maxLength={180} onChange={(event) => setAccountReference(event.target.value)} placeholder="Advertising account ID or label — never a password or token" /></label>
      <label className="grid gap-1.5 text-xs font-semibold">Approved form reference (non-secret)<Input value={formReference} maxLength={240} onChange={(event) => setFormReference(event.target.value)} placeholder="Lead form name or ID" /></label>
      <label className="grid gap-1.5 text-xs font-semibold">Internal planning notes<Textarea value={internalNote} maxLength={2000} onChange={(event) => setInternalNote(event.target.value)} className="min-h-20 resize-y" placeholder="Compliance notes, form mapping decisions, or release dependencies" /></label>
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-xs font-bold"><KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />Secure API key</div>
        <Input className="mt-2 font-mono" type="password" value={saved?.apiKeyConfigured ? "••••••••••••" : ""} readOnly aria-label={`${title} secure API key status`} placeholder="Not configured in secure storage" />
        <p className="mt-2 text-xs leading-5 text-muted-foreground">API key values are never stored here, in GitHub, or in dashboard data. {saved?.apiKeyConfigured ? "A protected key is configured and remains hidden." : "Use protected project secret storage when an approved key is ready."} <strong>Once saved, no editing—delete and re-enter to change the API key.</strong></p>
      </div>
    </div>
    <Button type="button" className="mt-4 self-start" onClick={() => save.mutate({ provider, setupStage: stage, accountReference: accountReference.trim() || null, formReference: formReference.trim() || null, internalNote: internalNote.trim() || null })} disabled={save.isPending}>
      {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}Save planning settings
    </Button>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Button type="button" variant="outline" disabled title="Available only after a future administrator-approved connection is enabled."><PlugZap className="mr-2 h-4 w-4" aria-hidden="true" />Test connection</Button>
      <Button type="button" variant="outline" disabled title="Protected key changes are handled only through the secure project secret store."><KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />Revoke secure key</Button>
    </div>
    <p className="mt-2 text-xs leading-5 text-muted-foreground">These controls stay unavailable while the integration is on hold. They do not make provider requests or change secure keys.</p>
  </article>;
}

export default function AdvertisingIntegrationSettings() {
  return <section id="advertising-integrations" className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="advertising-integrations-heading">
    <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div><div className="flex items-center gap-2 text-primary"><BadgeCheck className="h-5 w-5" aria-hidden="true" /><span className="text-xs font-bold uppercase tracking-[0.16em]">Administrator only</span></div><h2 id="advertising-integrations-heading" className="mt-2 text-xl font-bold tracking-tight">Advertising integration settings</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Save non-secret account and form planning details as Mike Ford prepares a future, compliance-approved connection for Meta or Google paid-lead workflows.</p></div>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200"><ShieldAlert className="h-4 w-4" aria-hidden="true" />No credentials, webhooks, or lead imports enabled</span>
    </div>
    <div className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/35 p-4 lg:grid-cols-[auto_minmax(0,1fr)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldAlert className="h-4 w-4" aria-hidden="true" /></div>
      <div><h3 className="font-bold">Future connection checklist</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Create the provider account, record its non-secret Account ID, obtain required compliance approval, identify approved lead forms and mappings, then add a protected API key only when the administrator approves a future connection. Until that point, both providers remain inactive and no leads are imported.</p></div>
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">{PROVIDERS.map((provider) => <PlanningCard key={provider.value} provider={provider.value} title={provider.title} detail={provider.detail} />)}</div>
  </section>;
}
