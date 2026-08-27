import { useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, CircleCheck, CircleHelp, CirclePause, CirclePlay, ExternalLink, KeyRound, Loader2, PlugZap, RotateCcw, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

const CREDENTIAL_HELP: Record<Provider, { summary: string; location: string; href: string; linkLabel: string }> = {
  meta: {
    summary: "Meta uses an access token for Marketing API calls; the dashboard never displays or stores that token.",
    location: "Create or select the app in Meta for Developers, add the Marketing API, then use Graph API Explorer to select the app, choose a User Token, select the required ad permissions, and generate a token only when the approved connection is ready. Find the non-secret Ad Account ID in Meta Ads Manager.",
    href: "https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authentication",
    linkLabel: "Open Meta authentication guide",
  },
  google_ads: {
    summary: "Google Ads API uses OAuth 2.0 plus a developer token; the dashboard never displays or stores a credential.",
    location: "Find the non-secret Google Ads Customer ID in the Google Ads account. When approved, create OAuth credentials in Google Cloud Console under APIs & Services → Credentials and obtain the developer token in the Google Ads manager account API Center.",
    href: "https://developers.google.com/google-ads/api/docs/oauth/overview",
    linkLabel: "Open Google Ads OAuth guide",
  },
};

const CHECKLIST_STEPS = [
  { key: "accountCreated", label: "Create the provider advertising account and identify its non-secret Account ID." },
  { key: "complianceApproved", label: "Obtain corporate compliance approval for campaign copy, consent language, and the lead form." },
  { key: "formMappingReady", label: "Record the approved form reference and map its fields to the dashboard intake." },
  { key: "secureKeyApproved", label: "Obtain administrator approval to enter a provider credential through protected secret storage." },
  { key: "connectionReviewReady", label: "Complete the administrator connection review before any test request, webhook, or lead import is considered." },
] as const;

type ChecklistState = Record<(typeof CHECKLIST_STEPS)[number]["key"], boolean>;
const EMPTY_CHECKLIST: ChecklistState = { accountCreated: false, complianceApproved: false, formMappingReady: false, secureKeyApproved: false, connectionReviewReady: false };

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
  const credentialHelp = CREDENTIAL_HELP[provider];

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
        <div className="flex items-center gap-2 text-xs font-bold"><KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />Secure API key
          <Tooltip><TooltipTrigger asChild><button type="button" className="rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Where to find ${title} credentials`}><CircleHelp className="h-4 w-4" aria-hidden="true" /></button></TooltipTrigger><TooltipContent side="top" className="max-w-96 p-3 leading-5"><p className="font-bold">Where to find {title} credentials</p><p className="mt-1">{credentialHelp.summary}</p><p className="mt-2">{credentialHelp.location}</p><a className="mt-2 inline-flex items-center gap-1 font-bold underline" href={credentialHelp.href} target="_blank" rel="noreferrer">{credentialHelp.linkLabel}<ExternalLink className="h-3 w-3" aria-hidden="true" /></a></TooltipContent></Tooltip>
        </div>
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
  const utils = trpc.useUtils();
  const { data: moduleVisibility, isLoading: isVisibilityLoading } = trpc.adIntegrationSettings.moduleVisibility.useQuery();
  const [renderModule, setRenderModule] = useState(true);
  const [moduleOpen, setModuleOpen] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const setModuleVisibility = trpc.adIntegrationSettings.setModuleVisibility.useMutation({
    onSuccess: async (result) => {
      await utils.adIntegrationSettings.moduleVisibility.invalidate();
      toast.success(result.isVisible ? "Advertising setup module shown. Connections remain inactive." : "Advertising setup module hidden. Connections remain inactive.");
    },
    onError: (error) => toast.error(error.message),
  });
  const isVisible = moduleVisibility?.isVisible ?? true;
  const checklist = (moduleVisibility?.checklist ?? EMPTY_CHECKLIST) as ChecklistState;
  const saveChecklist = trpc.adIntegrationSettings.saveChecklist.useMutation({
    onSuccess: async () => {
      await utils.adIntegrationSettings.moduleVisibility.invalidate();
      toast.success("Advertising readiness checklist updated. Integrations remain inactive.");
    },
    onError: (error) => toast.error(error.message),
  });
  const completedSteps = CHECKLIST_STEPS.filter((step) => checklist[step.key]).length;
  const checklistProgress = Math.round((completedSteps / CHECKLIST_STEPS.length) * 100);
  const remainingSteps = CHECKLIST_STEPS.filter((step) => !checklist[step.key]);
  const reminderAt = moduleVisibility?.checklistReminderAt ? new Date(moduleVisibility.checklistReminderAt) : null;
  const checklistReminderDeferred = Boolean(reminderAt && reminderAt.getTime() > Date.now());
  const checklistReminderDue = Boolean(reminderAt && reminderAt.getTime() <= Date.now());
  const remindLater = trpc.adIntegrationSettings.remindLater.useMutation({
    onSuccess: async (result) => {
      await utils.adIntegrationSettings.moduleVisibility.invalidate();
      toast.success(`Checklist hidden until ${new Date(result.checklistReminderAt).toLocaleDateString()}. A dashboard reminder will appear on your next visit after that date.`);
    },
    onError: (error) => toast.error(error.message),
  });
  const resetChecklist = trpc.adIntegrationSettings.resetChecklist.useMutation({
    onSuccess: async () => {
      await utils.adIntegrationSettings.moduleVisibility.invalidate();
      setResetConfirmationOpen(false);
      toast.success("Checklist reset. Your integration status and planning details were not changed.");
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (isVisible) {
      setRenderModule(true);
      const frame = requestAnimationFrame(() => setModuleOpen(true));
      return () => cancelAnimationFrame(frame);
    }
    setModuleOpen(false);
    const timer = window.setTimeout(() => setRenderModule(false), 200);
    return () => window.clearTimeout(timer);
  }, [isVisible]);

  useEffect(() => {
    if (checklistReminderDue) {
      toast.message("Advertising setup reminder", { description: "Your deferred Getting Started checklist is ready to review." });
    }
  }, [checklistReminderDue]);

  const updateChecklist = (key: keyof ChecklistState, checked: boolean) => saveChecklist.mutate({ ...checklist, [key]: checked });

  return <section id="advertising-integrations" className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5" aria-labelledby="advertising-integrations-heading">
    <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div><div className="flex items-center gap-2 text-primary"><BadgeCheck className="h-5 w-5" aria-hidden="true" /><span className="text-xs font-bold uppercase tracking-[0.16em]">Administrator only</span></div><h2 id="advertising-integrations-heading" className="mt-2 text-xl font-bold tracking-tight">Advertising integration settings</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Save non-secret account and form planning details as Mike Ford prepares a future, compliance-approved connection for Meta or Google paid-lead workflows.</p></div>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200"><ShieldAlert className="h-4 w-4" aria-hidden="true" />No credentials, webhooks, or lead imports enabled</span>
    </div>
    <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/35 p-4">
      <div><p className="font-bold">Show advertising setup module</p><p className="mt-1 text-sm leading-5 text-muted-foreground">This hides or shows planning controls only. It never activates Meta or Google.</p></div>
      <Switch checked={isVisible} disabled={isVisibilityLoading || setModuleVisibility.isPending} onCheckedChange={(checked) => setModuleVisibility.mutate({ isVisible: checked })} aria-label="Show advertising integration settings" />
    </div>
    {!renderModule ? <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/25 p-4 text-sm text-muted-foreground" role="status">Advertising integration settings are hidden by the administrator. Use the switch above to show the inactive planning controls again.</div> : <div className={`grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none ${moduleOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0 pointer-events-none"}`} aria-hidden={!moduleOpen}>
      <div className="min-h-0 overflow-hidden">
        <div className="grid gap-3 rounded-xl border border-border bg-muted/35 p-4 lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldAlert className="h-4 w-4" aria-hidden="true" /></div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Getting Started checklist</h3><span className="text-xs font-bold text-muted-foreground">{completedSteps} of {CHECKLIST_STEPS.length} complete</span></div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
                <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><CirclePlay className="mr-1.5 h-4 w-4" aria-hidden="true" />Watch tutorial</Button></DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader><DialogTitle>Advertising integration setup walkthrough</DialogTitle><DialogDescription>This placeholder will hold an approved setup tutorial before Meta or Google connections are enabled.</DialogDescription></DialogHeader>
                  <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-border bg-muted/35 p-6 text-center"><div><CirclePlay className="mx-auto h-10 w-10 text-primary" aria-hidden="true" /><p className="mt-3 font-bold">Tutorial video placeholder</p><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Future walkthrough: create the provider account, collect non-secret references, obtain compliance approval, use protected credential storage, confirm form mapping, and complete the administrator review.</p></div></div>
                  <div className="rounded-xl border border-border bg-muted/25 p-4"><p className="font-bold">Official setup references</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Use these provider guides only when corporate approval and the connection review are ready.</p><div className="mt-3 grid gap-2"><a className="inline-flex items-center gap-1.5 text-sm font-bold text-primary underline underline-offset-4" href={CREDENTIAL_HELP.meta.href} target="_blank" rel="noreferrer">Meta Marketing API authentication guide <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a><a className="inline-flex items-center gap-1.5 text-sm font-bold text-primary underline underline-offset-4" href={CREDENTIAL_HELP.google_ads.href} target="_blank" rel="noreferrer">Google Ads API OAuth guide <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a></div></div>
                  <p className="text-xs leading-5 text-muted-foreground">No tutorial video is attached yet. This panel does not connect accounts or collect credentials.</p>
                  <div className="flex justify-end"><DialogClose asChild><Button type="button" variant="outline">Close tutorial</Button></DialogClose></div>
                </DialogContent>
              </Dialog>
              <Dialog open={resetConfirmationOpen} onOpenChange={setResetConfirmationOpen}>
                <DialogTrigger asChild><Button type="button" variant="ghost" size="sm" disabled={resetChecklist.isPending}><RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />Reset checklist</Button></DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Reset advertising checklist?</DialogTitle><DialogDescription>This clears the five readiness checkmarks and the seven-day reminder only. Account IDs, form references, planning notes, secure-key status, and the inactive integration state will not change.</DialogDescription></DialogHeader>
                  <div className="flex flex-wrap justify-end gap-2"><DialogClose asChild><Button type="button" variant="outline" disabled={resetChecklist.isPending}>Cancel</Button></DialogClose><Button type="button" onClick={() => resetChecklist.mutate()} disabled={resetChecklist.isPending}>{resetChecklist.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />}Confirm reset</Button></div>
                </DialogContent>
              </Dialog>
            </div>
            {checklistReminderDue && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary" role="status"><span><strong>Reminder:</strong> your checklist is ready to continue.</span><span className="text-xs font-bold">{remainingSteps.length} remaining</span></div>}
            {checklistReminderDeferred ? <div className="mt-3 rounded-lg border border-dashed border-border bg-background/60 px-3 py-3 text-sm leading-6 text-muted-foreground" role="status">Checklist temporarily hidden. It will return with a dashboard reminder on your next visit after <strong>{reminderAt?.toLocaleDateString()}</strong>.</div> : <>
              <Tooltip><TooltipTrigger asChild><div tabIndex={0} role="img" aria-label={`Advertising setup readiness: ${completedSteps} completed and ${remainingSteps.length} remaining`} className="mt-3 cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"><Progress value={checklistProgress} className="h-2" /></div></TooltipTrigger><TooltipContent side="top" className="max-w-80 p-3"><p className="font-bold">Checklist progress</p><p className="mt-1">{completedSteps} completed · {remainingSteps.length} remaining</p>{remainingSteps.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4">{remainingSteps.map((step) => <li key={step.key}>{step.label}</li>)}</ul>}</TooltipContent></Tooltip>
              <div className="mt-3 grid gap-2">{CHECKLIST_STEPS.map((step) => <label key={step.key} className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-muted-foreground"><Checkbox checked={checklist[step.key]} disabled={saveChecklist.isPending || remindLater.isPending || resetChecklist.isPending} onCheckedChange={(checked) => updateChecklist(step.key, checked === true)} aria-label={step.label} /><span>{step.label}</span></label>)}</div>
              <div className="mt-3 flex justify-end"><Button type="button" variant="ghost" size="sm" disabled={remindLater.isPending || resetChecklist.isPending} onClick={() => remindLater.mutate()}>{remindLater.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : null}Remind me later</Button></div>
            </>}
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">{PROVIDERS.map((provider) => <PlanningCard key={provider.value} provider={provider.value} title={provider.title} detail={provider.detail} />)}</div>
      </div>
    </div>}
  </section>;
}
