import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock3, Contact, ExternalLink, FileText, ImagePlus, Loader2, Mail, MessageSquareText, Paperclip, Save, Send, ShieldCheck, Smartphone, Users, X } from "lucide-react";
import { toast } from "sonner";
import { buildLeadWelcomeDraft, type LeadWelcomeDraftInput } from "@shared/leadEmailDraft";
import { PUBLIC_SITE_ORIGIN } from "@shared/publicSiteUrl";
import { getCoBrandAgentFilterOptions, getLoanOfficerFilterOptions, matchesSelectedCoBrandPair } from "@shared/roadmapPairFilters";
import { qualifiesForUsdaDashboardBadge } from "@shared/usdaEligibility";

type Recipient = {
  sourceType: "roadmap" | "chat";
  sourceLeadId: number;
  name: string;
  phone: string;
  email: string | null;
  consentedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  scenario: string | null;
  loanOfficerName: string | null;
  loanOfficerSlug: string | null;
  agentId: number | null;
  agentName: string | null;
  agentSlug: string | null;
  agentSource: "link" | "manual" | null;
  isCoBranded: boolean;
  annualIncome: number | null;
  lowDownPaymentHomeSearch: number | null;
  searchAreaType: string | null;
  targetArea: string | null;
};

type AgentOption = { id: number; name: string; slug: string; email: string; phone: string; bio: string | null; website: string; companyName: string; headshotUrl: string; companyLogoUrl: string; visible: number };

type UploadedAttachment = {
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: "image/jpeg";
  sizeBytes: number;
};

type TextChainAttachment = {
  id: number;
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type TextChainEntry = {
  id: string;
  direction: "incoming" | "outgoing";
  body: string;
  status: string;
  senderLabel: string;
  occurredAt: Date;
  attachments: TextChainAttachment[];
  providerName: string | null;
};

const recipientKey = (recipient: Pick<Recipient, "sourceType" | "sourceLeadId">) => `${recipient.sourceType}:${recipient.sourceLeadId}`;

function formatDate(value: Date | null) {
  return value ? new Date(value).toLocaleDateString() : "Recorded";
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The JPG could not be read."));
    reader.onload = () => {
      const result = String(reader.result || "");
      const marker = ",";
      resolve(result.includes(marker) ? result.slice(result.indexOf(marker) + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function parseRecipientScenario(raw: string | null): LeadWelcomeDraftInput["scenarios"] {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { buydown?: unknown; costOfWaiting?: unknown };
    return { buydown: parsed.buydown ?? null, costOfWaiting: parsed.costOfWaiting ?? null } as LeadWelcomeDraftInput["scenarios"];
  } catch {
    return null;
  }
}

function LinkifiedText({ body }: { body: string }) {
  const segments = body.split(/(https?:\/\/[^\s<]+)/gi);
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {segments.map((segment, index) => /^https?:\/\//i.test(segment) ? (
        <a key={`${segment}-${index}`} href={segment} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-current/60 underline-offset-2 hover:opacity-80">
          {segment}
        </a>
      ) : segment)}
    </p>
  );
}

function TextChainDialog({ recipient, deliveryEnabled, onOpenChange }: { recipient: Recipient | null; deliveryEnabled: boolean; onOpenChange: (open: boolean) => void }) {
  const chain = trpc.texting.chain.useQuery(
    { sourceType: recipient?.sourceType ?? "roadmap", sourceLeadId: recipient?.sourceLeadId ?? 1 },
    { enabled: recipient !== null }
  );
  const entries = (chain.data ?? []) as TextChainEntry[];
  return (
    <Dialog open={recipient !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[82vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5">
          <DialogTitle className="flex flex-wrap items-center gap-2"><MessageSquareText className="h-5 w-5 text-primary" /> Text Chain · {recipient?.name || "Lead"}</DialogTitle>
          <DialogDescription>Timestamped one-to-one message history. Website links are clickable; images, vCards, and files remain attached to their original message.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 px-4 py-5 sm:px-5">
          {chain.isLoading ? (
            <div className="flex justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading text chain…</div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-5 text-center text-sm leading-relaxed text-muted-foreground">No text messages are saved for this lead yet. Provider-unconfigured drafts and future sent or received SMS/MMS messages will appear here in order.</div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const outgoing = entry.direction === "outgoing";
                return <article key={entry.id} className={outgoing ? "ml-8" : "mr-8"}>
                  <div className={`rounded-xl px-4 py-3 shadow-sm ${outgoing ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}>
                    <div className={`mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] font-semibold ${outgoing ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                      <span>{entry.senderLabel}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {new Date(entry.occurredAt).toLocaleString()}</span>
                    </div>
                    <LinkifiedText body={entry.body} />
                    {entry.attachments.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{entry.attachments.map((attachment) => {
                      const image = attachment.mimeType.startsWith("image/");
                      const vcard = attachment.mimeType.includes("vcard") || attachment.fileName.toLowerCase().endsWith(".vcf");
                      return <a key={attachment.id} href={attachment.url} target="_blank" rel="noopener noreferrer" className={`group rounded-lg border p-2 transition hover:brightness-95 ${outgoing ? "border-primary-foreground/25 bg-primary-foreground/10" : "border-border bg-muted/40"}`}>
                        {image ? <img src={attachment.url} alt={attachment.fileName} className="h-28 w-full rounded object-cover" /> : <div className="flex min-h-16 items-center gap-2"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${outgoing ? "bg-primary-foreground/15" : "bg-background"}`}>{vcard ? <Contact className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><span className="min-w-0"><span className="block truncate text-xs font-medium">{attachment.fileName}</span><span className="mt-0.5 flex items-center gap-1 text-[11px] opacity-70">{vcard ? "vCard contact" : "Open attachment"} <ExternalLink className="h-3 w-3" /></span></span></div>}
                        {image && <span className="mt-1.5 flex items-center gap-1 text-[11px] opacity-75"><ExternalLink className="h-3 w-3" /> {attachment.fileName}</span>}
                      </a>;
                    })}</div>}
                  </div>
                  <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">{entry.status.replace(/_/g, " ")}{entry.providerName ? ` · ${entry.providerName}` : ""}</p>
                </article>;
              })}
            </div>
          )}
        </div>
        <div className="border-t border-border bg-card px-5 py-3 text-xs text-muted-foreground">Use the Compose panel to prepare the next one-to-one message. {deliveryEnabled ? "Every send requires a separate owner confirmation and Twilio delivery updates appear here." : "Saving a draft never sends a message."}</div>
      </DialogContent>
    </Dialog>
  );
}

export default function TextingWorkspace() {
  const utils = trpc.useUtils();
  const statusQuery = trpc.texting.status.useQuery();
  const recipientsQuery = trpc.texting.recipients.useQuery();
  const draftsQuery = trpc.texting.listDrafts.useQuery();
  const agentsQuery = trpc.agent.list.useQuery();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"all" | "roadmap" | "chat">("all");
  const [status, setStatus] = useState("all");
  const [loanOfficerFilter, setLoanOfficerFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [chainRecipient, setChainRecipient] = useState<Recipient | null>(null);
  const [sendConfirmationOpen, setSendConfirmationOpen] = useState(false);
  const uploadJpg = trpc.texting.uploadJpg.useMutation({
    onError: (error) => toast.error(error.message || "Unable to upload the JPG attachment."),
  });
  const saveDraft = trpc.texting.saveDraft.useMutation({
    onSuccess: async () => {
      await utils.texting.listDrafts.invalidate();
      setBody("");
      setAttachments([]);
      setSelectedKeys(new Set());
      toast.success("Text draft saved. It was not sent because no provider is configured.");
    },
    onError: (error) => toast.error(error.message || "Unable to save the text draft."),
  });
  const sendConfirmed = trpc.texting.sendConfirmed.useMutation({
    onSuccess: async (result) => {
      await Promise.all([utils.texting.listDrafts.invalidate(), utils.texting.chain.invalidate()]);
      setBody("");
      setAttachments([]);
      setSelectedKeys(new Set());
      setSendConfirmationOpen(false);
      if (result.failedCount > 0) {
        const firstFailure = result.outcomes.find((outcome) => !outcome.sent)?.detail;
        toast.warning(`${result.sentCount} message${result.sentCount === 1 ? "" : "s"} accepted by Twilio; ${result.failedCount} recipient${result.failedCount === 1 ? "" : "s"} need review.${firstFailure ? ` ${firstFailure}` : " Open each text chain for the recorded delivery detail."}`);
      } else {
        toast.success(`${result.sentCount} individual message${result.sentCount === 1 ? "" : "s"} accepted by Twilio. Delivery updates will appear in each text chain.`);
      }
    },
    onError: (error) => toast.error(error.message || "Twilio could not accept this message. No automatic retry was made."),
  });
  const roadmapAssignAgent = trpc.leads.assignAgent.useMutation({ onSuccess: () => void Promise.all([utils.texting.recipients.invalidate(), utils.leads.list.invalidate()]), onError: (error) => toast.error(error.message || "Unable to assign the agent.") });
  const chatAssignAgent = trpc.chat.assignAgent.useMutation({ onSuccess: () => void Promise.all([utils.texting.recipients.invalidate(), utils.chat.list.invalidate()]), onError: (error) => toast.error(error.message || "Unable to assign the agent.") });
  const roadmapSendToAgent = trpc.leads.sendToAgent.useMutation({
    onSuccess: (result) => {
      if (result.sent) toast.success("Lead sent to the assigned agent.");
      else { window.location.href = result.mailto; toast.info("Opened a prefilled referral draft because automatic email delivery is unavailable."); }
    },
    onError: (error) => toast.error(error.message || "Unable to send this lead to the agent."),
  });
  const chatSendToAgent = trpc.chat.sendToAgent.useMutation({
    onSuccess: (result) => {
      if (result.sent) toast.success("Chat intake sent to the assigned agent.");
      else { window.location.href = result.mailto; toast.info("Opened a prefilled intake referral draft because automatic email delivery is unavailable."); }
    },
    onError: (error) => toast.error(error.message || "Unable to send this intake to the agent."),
  });

  const recipients = (recipientsQuery.data ?? []) as Recipient[];
  const agents = ((agentsQuery.data ?? []) as AgentOption[]).filter((agent) => agent.visible === 1);
  const loanOfficerOptions = useMemo(() => getLoanOfficerFilterOptions(recipients), [recipients]);
  const agentOptions = useMemo(() => getCoBrandAgentFilterOptions(recipients, loanOfficerFilter), [recipients, loanOfficerFilter]);
  const filteredRecipients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recipients.filter((recipient) => {
      const sourceMatches = source === "all" || recipient.sourceType === source;
      const statusMatches = status === "all" || recipient.status === status;
      const officerMatches = loanOfficerFilter === "all" || recipient.loanOfficerSlug === loanOfficerFilter || recipient.loanOfficerName === loanOfficerFilter;
      const agentMatches = agentFilter === "all" || matchesSelectedCoBrandPair(recipient, loanOfficerFilter, agentFilter);
      const textMatches = !query || `${recipient.name} ${recipient.phone} ${recipient.email ?? ""} ${recipient.loanOfficerName ?? ""} ${recipient.agentName ?? ""}`.toLowerCase().includes(query);
      return sourceMatches && statusMatches && officerMatches && agentMatches && textMatches;
    });
  }, [recipients, search, source, status, loanOfficerFilter, agentFilter]);
  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedKeys.has(recipientKey(recipient))),
    [recipients, selectedKeys]
  );
  const selectedVisible = filteredRecipients.length > 0 && filteredRecipients.every((recipient) => selectedKeys.has(recipientKey(recipient)));
  const isFiltered = Boolean(search.trim() || source !== "all" || status !== "all" || loanOfficerFilter !== "all" || agentFilter !== "all");
  const providerReady = statusQuery.data?.providerConfigured === true;

  const toggleRecipient = (recipient: Recipient) => {
    const key = recipientKey(recipient);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleVisible = () => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (selectedVisible) filteredRecipients.forEach((recipient) => next.delete(recipientKey(recipient)));
      else filteredRecipients.forEach((recipient) => next.add(recipientKey(recipient)));
      return next;
    });
  };
  const handleAttachment = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "image/jpeg") {
      toast.error("Attach a JPG or JPEG image only.");
      return;
    }
    if (file.size > 4_000_000) {
      toast.error("JPG attachments must be 4MB or smaller.");
      return;
    }
    if (attachments.length >= 3) {
      toast.error("Attach up to three JPG files per draft.");
      return;
    }
    try {
      const dataBase64 = await readFileAsBase64(file);
      const uploaded = await uploadJpg.mutateAsync({ fileName: file.name, dataBase64 });
      setAttachments((current) => [...current, uploaded]);
      toast.success("JPG attached to this draft.");
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
    }
  };
  const save = () => {
    saveDraft.mutate({
      body,
      recipients: selectedRecipients.map(({ sourceType, sourceLeadId }) => ({ sourceType, sourceLeadId })),
      attachments,
    });
  };
  const confirmSend = () => {
    sendConfirmed.mutate({
      confirmation: true,
      body,
      recipients: selectedRecipients.map(({ sourceType, sourceLeadId }) => ({ sourceType, sourceLeadId })),
      attachments,
    });
  };
  const clearFilters = () => {
    setSearch("");
    setSource("all");
    setStatus("all");
    setLoanOfficerFilter("all");
    setAgentFilter("all");
  };
  const openEmailDraft = async (recipient: Recipient) => {
    if (!recipient.email) {
      toast.error("This lead does not have an email address yet.");
      return;
    }
    try {
      const coMarketingAgent = recipient.isCoBranded && recipient.agentId
        ? agents.find((agent) => agent.id === recipient.agentId) ?? null
        : null;
      const chatTranscript = recipient.sourceType === "chat"
        ? await utils.chat.transcript.fetch({ chatLeadId: recipient.sourceLeadId })
        : undefined;
      const draft = buildLeadWelcomeDraft({
        firstName: recipient.name.trim().split(/\s+/)[0] || "there",
        email: recipient.email,
        scenarios: parseRecipientScenario(recipient.scenario),
        coMarketingAgent,
        siteOrigin: PUBLIC_SITE_ORIGIN,
        draftSource: recipient.sourceType,
        chatTranscript: chatTranscript?.map((message) => ({ role: message.role, content: message.content })),
      });
      window.location.href = draft.mailto;
      toast.success(recipient.sourceType === "chat" ? "Chat recap email draft opened." : "Welcome email draft opened.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load this chat conversation for the email draft.");
    }
  };
  const assignRecipientAgent = (recipient: Recipient, agentId: number | null) => {
    if (recipient.sourceType === "roadmap") roadmapAssignAgent.mutate({ id: recipient.sourceLeadId, agentId });
    else chatAssignAgent.mutate({ chatLeadId: recipient.sourceLeadId, agentId });
  };
  const sendRecipientToAgent = (recipient: Recipient) => {
    if (recipient.sourceType === "roadmap") roadmapSendToAgent.mutate({ id: recipient.sourceLeadId });
    else chatSendToAgent.mutate({ chatLeadId: recipient.sourceLeadId });
  };

  return (
    <section className="mt-10 rounded-xl border border-primary/20 bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-foreground"><MessageSquareText className="h-5 w-5 text-primary" /> Texting Workspace</h2>
            <Badge className={providerReady ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/10" : "border-amber-600/30 bg-amber-600/10 text-amber-800 hover:bg-amber-600/10"}>{providerReady ? "Delivery ready" : "Draft mode"}</Badge>
          </div>
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">Choose one lead or many text-ready leads. Each selected recipient is saved as an independent one-to-one message—not a shared group thread.</p>
        </div>
        <div className={providerReady ? "rounded-lg border border-emerald-600/25 bg-emerald-600/5 px-3 py-2 text-xs text-emerald-900" : "rounded-lg border border-amber-600/25 bg-amber-600/5 px-3 py-2 text-xs text-amber-900"}>
          <div className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-3.5 w-3.5" /> {providerReady ? "Owner-confirmed delivery enabled" : "Provider setup required"}</div>
          <p className={providerReady ? "mt-0.5 max-w-xs text-emerald-900/75" : "mt-0.5 max-w-xs text-amber-900/75"}>{statusQuery.data?.detail || "Checking secure provider readiness…"}</p>
          {providerReady && statusQuery.data?.statusCallbackUrl && <p className="mt-1 max-w-xs break-all text-[10px] text-emerald-900/70">Status callback: {statusQuery.data.statusCallbackUrl}</p>}
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 rounded-lg border border-border bg-background/40">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Text-ready leads</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Valid phone number plus affirmative recorded SMS consent.</p>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-600/30 bg-emerald-600/10 text-emerald-700"><Smartphone className="mr-1 h-3.5 w-3.5" /> {recipients.length} ready</Badge>
          </div>
          <div className="flex flex-col gap-2 border-b border-border p-4">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, email, loan officer, or agent…" className="bg-card" />
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-md border border-border bg-card p-1">
                {(["all", "roadmap", "chat"] as const).map((value) => <Button key={value} size="sm" variant={source === value ? "default" : "ghost"} onClick={() => setSource(value)} className="capitalize">{value === "all" ? "All sources" : value}</Button>)}
              </div>
              <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[140px]"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Array.from(new Set(recipients.map((recipient) => recipient.status))).sort().map((value) => <SelectItem key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select>
              <Select value={loanOfficerFilter} onValueChange={(value) => { setLoanOfficerFilter(value); setAgentFilter("all"); }}><SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[180px]"><SelectValue placeholder="All loan officers" /></SelectTrigger><SelectContent><SelectItem value="all">All loan officers</SelectItem>{loanOfficerOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
              <Select value={agentFilter} onValueChange={setAgentFilter} disabled={loanOfficerFilter === "all"}><SelectTrigger className="h-9 w-full bg-card text-xs sm:w-[210px]"><SelectValue placeholder={loanOfficerFilter === "all" ? "Select LO first" : "All co-brand agents"} /></SelectTrigger><SelectContent><SelectItem value="all">All co-brand agents</SelectItem>{agentOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
              {isFiltered && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs text-muted-foreground">
            <Checkbox id="select-text-visible" checked={selectedVisible} onCheckedChange={toggleVisible} aria-label="Select all visible text-ready leads" />
            <label htmlFor="select-text-visible" className="cursor-pointer">Select visible</label>
            <span className="ml-auto font-medium text-foreground">{selectedRecipients.length} selected</span>
          </div>
          <div className="max-h-[29rem] divide-y divide-border overflow-auto overscroll-contain">
            <div className="hidden min-w-[1040px] grid-cols-[28px_1.25fr_.65fr_1fr_.75fr_1.4fr] gap-3 border-b border-border bg-muted/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground xl:grid"><span /><span>Lead</span><span>Source / status</span><span>Loan officer / agent</span><span>SMS consent</span><span className="text-right">Actions</span></div>
            {recipientsQuery.isLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading text-ready leads…</div> : filteredRecipients.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No text-ready leads match this view. Chat leads appear here after they choose Yes to the SMS consent question.</div> : filteredRecipients.map((recipient) => {
              const key = recipientKey(recipient);
              const mutationPending = roadmapAssignAgent.isPending || chatAssignAgent.isPending || roadmapSendToAgent.isPending || chatSendToAgent.isPending;
              return <div key={key} id={`texting-${recipient.sourceType}-${recipient.sourceLeadId}`} className="min-w-[1040px] grid grid-cols-[28px_1.25fr_.65fr_1fr_.75fr_1.4fr] items-start gap-3 px-4 py-3 transition hover:bg-muted/40">
                <Checkbox checked={selectedKeys.has(key)} onCheckedChange={() => toggleRecipient(recipient)} aria-label={`Select ${recipient.name} for a text draft`} />
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><div className="font-medium text-foreground">{recipient.name}</div>{recipient.sourceType === "chat" && qualifiesForUsdaDashboardBadge(recipient) && <Badge title="USDA screening indicator based on the configured city and income criteria; program and property eligibility require verification." variant="outline" className="border-emerald-600/30 bg-emerald-600/10 text-emerald-700">USDA</Badge>}</div><div className="mt-0.5 text-xs text-muted-foreground">{recipient.phone}{recipient.email ? ` · ${recipient.email}` : ""}</div></div>
                <div className="flex flex-wrap gap-1"><Badge variant="outline" className={recipient.sourceType === "roadmap" ? "border-primary/25 bg-primary/5 text-primary" : "border-violet-600/25 bg-violet-600/5 text-violet-700"}>{recipient.sourceType === "roadmap" ? "Roadmap" : "Chat"}</Badge><Badge variant="outline" className="capitalize">{recipient.status}</Badge></div>
                <div className="text-xs"><div className="font-medium text-foreground">LO: {recipient.loanOfficerName || "—"}</div><div className="text-muted-foreground">Agent: {recipient.agentName || "—"}</div></div>
                <div className="text-[11px] text-emerald-700">Recorded {formatDate(recipient.consentedAt)}</div>
                <div className="flex flex-wrap justify-end gap-1.5"><Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setChainRecipient(recipient)}><MessageSquareText className="mr-1 h-3.5 w-3.5" /> Text Chain</Button><Button variant="outline" size="sm" className="h-8 text-xs" disabled={!recipient.email} onClick={() => void openEmailDraft(recipient)}><Mail className="mr-1 h-3.5 w-3.5" /> Email draft</Button><Select value={recipient.agentId ? String(recipient.agentId) : "none"} onValueChange={(value) => assignRecipientAgent(recipient, value === "none" ? null : Number(value))} disabled={mutationPending}><SelectTrigger className="h-8 w-[132px] text-xs"><SelectValue placeholder="No agent" /></SelectTrigger><SelectContent><SelectItem value="none">No agent</SelectItem>{agents.map((agent) => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}</SelectContent></Select>{recipient.agentId && <Button variant="outline" size="sm" className="h-8 text-xs" disabled={mutationPending} onClick={() => sendRecipientToAgent(recipient)}><Send className="mr-1 h-3.5 w-3.5" /> Send to agent</Button>}</div>
              </div>;
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-foreground">Compose message</h3><span className="text-xs text-muted-foreground">{body.length}/1600</span></div>
          <p className="mt-1 text-xs text-muted-foreground">Each selected lead receives an independent one-to-one message. Saving a draft never sends; live delivery requires an explicit confirmation and a current consent re-check.</p>
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1600} placeholder="Write your custom message…" className="mt-4 min-h-36 resize-y bg-card" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-card px-3 py-2 text-xs font-medium text-primary transition hover:bg-primary/5">
              {uploadJpg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Attach JPG
              <input type="file" accept="image/jpeg,.jpg,.jpeg" className="sr-only" disabled={uploadJpg.isPending || attachments.length >= 3} onChange={(event) => { void handleAttachment(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <span className="text-xs text-muted-foreground">Up to 3 JPG files · 4MB each</span>
          </div>
          {attachments.length > 0 && <div className="mt-3 space-y-2">{attachments.map((attachment) => <div key={attachment.storageKey} className="flex items-center gap-2 rounded-md border border-border bg-card p-2"><img src={attachment.url} alt="Attached JPG preview" className="h-10 w-10 rounded object-cover" /><span className="min-w-0 flex-1 truncate text-xs text-foreground">{attachment.fileName}</span><Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAttachments((current) => current.filter((candidate) => candidate.storageKey !== attachment.storageKey))} aria-label={`Remove ${attachment.fileName}`}><X className="h-3.5 w-3.5" /></Button></div>)}</div>}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button onClick={save} disabled={!body.trim() || selectedRecipients.length === 0 || saveDraft.isPending || uploadJpg.isPending}><Save className="mr-1.5 h-4 w-4" /> {saveDraft.isPending ? "Saving…" : "Save draft"}</Button>
            <Button variant="outline" disabled={!providerReady || !body.trim() || selectedRecipients.length === 0 || sendConfirmed.isPending || uploadJpg.isPending} onClick={() => setSendConfirmationOpen(true)}><Send className="mr-1.5 h-4 w-4" /> {sendConfirmed.isPending ? "Sending…" : providerReady ? "Review & send" : "Delivery unavailable"}</Button>
          </div>
          {selectedRecipients.length > 0 && <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground"><Users className="mt-0.5 h-3.5 w-3.5 shrink-0" /> This draft will prepare {selectedRecipients.length} separate one-to-one message{selectedRecipients.length === 1 ? "" : "s"}.</p>}
        </div>
      </div>

      <div className="border-t border-border p-5 sm:p-6">
        <div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-muted-foreground" /><h3 className="font-semibold text-foreground">Saved draft history</h3></div>
        {draftsQuery.isLoading ? <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading drafts…</div> : (draftsQuery.data ?? []).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No text drafts saved yet.</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{(draftsQuery.data ?? []).slice(0, 8).map((draft) => <article key={draft.id} className="rounded-lg border border-border bg-background/40 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Badge className="border-amber-600/30 bg-amber-600/10 text-amber-800 hover:bg-amber-600/10">Provider setup required</Badge><span className="text-xs text-muted-foreground">{new Date(draft.createdAt).toLocaleString()}</span></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-foreground">{draft.body}</p><div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{draft.recipients.length} recipient{draft.recipients.length === 1 ? "" : "s"}</span><span>{draft.attachments.length} JPG attachment{draft.attachments.length === 1 ? "" : "s"}</span></div></article>)}</div>}
      </div>
      <TextChainDialog recipient={chainRecipient} deliveryEnabled={providerReady} onOpenChange={(open) => { if (!open) setChainRecipient(null); }} />
      <AlertDialog open={sendConfirmationOpen} onOpenChange={setSendConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Twilio delivery</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send {selectedRecipients.length} independent one-to-one SMS/MMS message{selectedRecipients.length === 1 ? "" : "s"}. By continuing, you confirm that every selected lead has explicitly consented to receive text messages. The server will recheck recorded consent and a usable phone number immediately before delivery. Any MMS media must be a JPG uploaded by this administrator. No automatic retry or campaign send will occur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border border-amber-600/25 bg-amber-600/5 px-3 py-2 text-xs leading-relaxed text-amber-950">Twilio trial accounts can send only to destination numbers you have verified in the Twilio Console. Carrier delivery callbacks must carry a valid Twilio signature before the latest delivery status can update a private text chain.</div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendConfirmed.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={sendConfirmed.isPending} onClick={confirmSend}>{sendConfirmed.isPending ? "Sending…" : "I confirm — send messages"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
