import { Check, Clipboard, Columns2, Loader2, RotateCcw, Save, Sparkles, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export type EmailTemplateAiWorkflow = "listing_agent" | "property_list" | "property_page_agent" | "property_page_buyer" | "oregon_outreach" | "agent_directory" | "loan_officer_directory" | "platform_lead" | "platform_agent";
type AiTone = "professional" | "friendly" | "urgent" | "warm" | "concise";

const TONE_HELP: Record<AiTone, string> = {
  professional: "Professional: formal, clear, and polite.",
  friendly: "Friendly: conversational, approachable, and positive.",
  urgent: "Urgent / action-oriented: clear next steps without pressure or false scarcity.",
  warm: "Warm: personable, supportive, and reassuring.",
  concise: "Concise: brief, direct, and easy to scan.",
};

const PERSONALIZATION_FIELDS: Record<EmailTemplateAiWorkflow, Array<{ token: string; label: string }>> = {
  listing_agent: [],
  property_list: [],
  property_page_agent: [],
  property_page_buyer: [
    { token: "{{client_name}}", label: "Client name" },
    { token: "{{property_address}}", label: "Property address" },
    { token: "{{property_url}}", label: "Property link" },
  ],
  oregon_outreach: [
    { token: "{{recipient_name}}", label: "Recipient name" },
    { token: "{{brokerage}}", label: "Brokerage" },
    { token: "{{recipient_type}}", label: "Recipient type" },
  ],
  agent_directory: [
    { token: "{{recipient_first_name}}", label: "Recipient first name" },
    { token: "{{recipient_name}}", label: "Recipient name" },
    { token: "{{company_name}}", label: "Company name" },
  ],
  loan_officer_directory: [
    { token: "{{recipient_first_name}}", label: "Recipient first name" },
    { token: "{{recipient_name}}", label: "Recipient name" },
    { token: "{{company_name}}", label: "Company name" },
  ],
  platform_lead: [
    { token: "{{lead_first_name}}", label: "Lead first name" },
    { token: "{{lead_name}}", label: "Lead name" },
    { token: "{{agent_name}}", label: "Agent name" },
    { token: "{{loan_officer_name}}", label: "Loan officer name" },
  ],
  platform_agent: [
    { token: "{{lead_first_name}}", label: "Lead first name" },
    { token: "{{lead_name}}", label: "Lead name" },
    { token: "{{agent_name}}", label: "Agent name" },
    { token: "{{loan_officer_name}}", label: "Loan officer name" },
  ],
};

function plainText(value: string) {
  return value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function wordCount(value: string) {
  return plainText(value).split(/\s+/).filter(Boolean).length;
}

function highlightedDraft(value: string) {
  return plainText(value).split(/(\{\{[^}]+\}\}|\[[^\]]+\])/g).map((part, index) => /^(\{\{[^}]+\}\}|\[[^\]]+\])$/.test(part)
    ? <mark key={`${part}-${index}`} className="rounded bg-amber-200/80 px-1 font-medium text-amber-950 ring-1 ring-amber-500/30">{part}</mark>
    : <span key={`text-${index}`}>{part}</span>);
}

type Draft = { subject: string; body: string };

type Props = {
  workflow: EmailTemplateAiWorkflow;
  currentSubject?: string;
  currentBody: string;
  onApply: (draft: Draft) => void;
};

/** Owner-controlled assistant: it proposes editable copy and never saves or sends an email. */
export function EmailTemplateAiAssistant({ workflow, currentSubject = "", currentBody, onApply }: Props) {
  const [goal, setGoal] = useState("");
  const [promptName, setPromptName] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState("__none");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [tone, setTone] = useState<AiTone>("professional");
  const [personalizationTokens, setPersonalizationTokens] = useState<string[]>([]);
  const [proposedDraft, setProposedDraft] = useState<Draft | null>(null);
  const [maxWordCount, setMaxWordCount] = useState(250);
  const [isApplying, setIsApplying] = useState(false);
  const [undoDraft, setUndoDraft] = useState<Draft | null>(null);
  const utils = trpc.useUtils();
  const promptsQuery = trpc.emailTemplateAi.prompts.list.useQuery();
  const generate = trpc.emailTemplateAi.generate.useMutation({
    onSuccess: (draft) => {
      setHasGenerated(true);
      setProposedDraft(draft);
      toast.success("AI draft ready to compare. Apply it only if you want to keep it.");
    },
    onError: (error) => toast.error(error.message || "The AI draft could not be prepared. Please try again."),
  });
  const savePrompt = trpc.emailTemplateAi.prompts.create.useMutation({
    onSuccess: (prompt) => {
      setPromptName("");
      setSelectedPromptId(String(prompt.id));
      void utils.emailTemplateAi.prompts.list.invalidate();
      toast.success("Saved AI prompt for quick selection.");
    },
    onError: (error) => toast.error(error.message || "This AI prompt could not be saved."),
  });
  const deletePrompt = trpc.emailTemplateAi.prompts.delete.useMutation({
    onSuccess: () => {
      setSelectedPromptId("__none");
      void utils.emailTemplateAi.prompts.list.invalidate();
      toast.success("Saved AI prompt removed.");
    },
    onError: (error) => toast.error(error.message || "This saved AI prompt could not be removed."),
  });

  const createDraft = () => {
    if (goal.trim().length < 4) {
      toast.error("Describe the email goal with at least a few words first.");
      return;
    }
    generate.mutate({ workflow, goal: goal.trim(), tone, personalizationTokens, maxWordCount, currentSubject: currentSubject.slice(0, 300), currentBody: currentBody.slice(0, 8000) });
  };
  const choosePrompt = (value: string) => {
    setSelectedPromptId(value);
    const selected = (promptsQuery.data ?? []).find((prompt) => String(prompt.id) === value);
    if (selected) setGoal(selected.prompt);
  };
  const saveCurrentPrompt = () => {
    if (promptName.trim().length < 2) { toast.error("Give this saved prompt a short name first."); return; }
    if (goal.trim().length < 4) { toast.error("Enter the prompt instructions before saving them."); return; }
    savePrompt.mutate({ name: promptName.trim(), prompt: goal.trim() });
  };
  const removeSelectedPrompt = () => {
    if (selectedPromptId === "__none") return;
    const selected = (promptsQuery.data ?? []).find((prompt) => String(prompt.id) === selectedPromptId);
    if (selected && window.confirm(`Remove saved AI prompt “${selected.name}”?`)) deletePrompt.mutate({ id: selected.id });
  };
  const togglePersonalization = (token: string) => setPersonalizationTokens((tokens) => tokens.includes(token) ? tokens.filter((item) => item !== token) : [...tokens, token]);
  const applyProposedDraft = () => {
    if (!proposedDraft) return;
    setIsApplying(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
    window.setTimeout(() => {
      setUndoDraft({ subject: currentSubject, body: currentBody });
      onApply(proposedDraft);
      setProposedDraft(null);
      setIsApplying(false);
      toast.success("AI draft applied to the editable fields. Review it before saving.");
    }, delay);
  };
  const undoLastAiApplication = () => {
    if (!undoDraft) return;
    onApply(undoDraft);
    setUndoDraft(null);
    toast.success("Restored the template from before the AI proposal was applied.");
  };
  const copyProposedDraft = async () => {
    if (!proposedDraft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${proposedDraft.subject}\n\n${proposedDraft.body}`);
      toast.success("Proposed AI draft copied to the clipboard.");
    } catch {
      toast.error("Copy is unavailable in this browser. Please select the draft text instead.");
    }
  };

  return <section className="rounded-lg border border-violet-500/25 bg-violet-500/[0.045] p-3" aria-label="AI email assistance">
    <div className="flex items-start gap-2"><div className="mt-0.5 rounded-md bg-violet-600/10 p-1.5 text-violet-700"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-foreground">AI assistance</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Describe the goal, audience, and tone. AI suggests a subject and draft body; you freely review and edit everything before saving.</p></div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <Select value={selectedPromptId} onValueChange={choosePrompt}><SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Use a saved prompt" /></SelectTrigger><SelectContent><SelectItem value="__none">Choose a saved prompt</SelectItem>{(promptsQuery.data ?? []).map((prompt) => <SelectItem key={prompt.id} value={String(prompt.id)}>{prompt.name}</SelectItem>)}</SelectContent></Select>
      <Button type="button" size="sm" variant="ghost" className="h-9 text-xs" disabled={selectedPromptId === "__none" || deletePrompt.isPending} onClick={removeSelectedPrompt}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remove</Button>
    </div>
    <div className="mt-3 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="space-y-1"><p className="text-[11px] font-medium text-muted-foreground">Draft tone</p><Select value={tone} onValueChange={(value) => setTone(value as AiTone)}><SelectTrigger className="h-9 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="professional" title={TONE_HELP.professional}>Professional</SelectItem><SelectItem value="friendly" title={TONE_HELP.friendly}>Friendly</SelectItem><SelectItem value="urgent" title={TONE_HELP.urgent}>Urgent / action-oriented</SelectItem><SelectItem value="warm" title={TONE_HELP.warm}>Warm</SelectItem><SelectItem value="concise" title={TONE_HELP.concise}>Concise</SelectItem></SelectContent></Select><p className="text-[11px] leading-relaxed text-muted-foreground">{TONE_HELP[tone]}</p></div>
      <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2"><div className="space-y-1">{PERSONALIZATION_FIELDS[workflow].length ? <><p className="text-[11px] font-medium text-muted-foreground">Include personalization</p><div className="flex flex-wrap gap-1.5">{PERSONALIZATION_FIELDS[workflow].map((field) => <Button key={field.token} type="button" size="sm" variant={personalizationTokens.includes(field.token) ? "default" : "outline"} className="h-7 px-2 text-[11px]" aria-pressed={personalizationTokens.includes(field.token)} onClick={() => togglePersonalization(field.token)}>{field.label}</Button>)}</div></> : <p className="pt-5 text-[11px] leading-relaxed text-muted-foreground">This workflow has no verified dynamic recipient or property fields.</p>}</div><div className="space-y-1"><p className="text-[11px] font-medium text-muted-foreground">Max words</p><Input type="number" inputMode="numeric" min={25} max={500} value={maxWordCount} onChange={(event) => setMaxWordCount(Math.min(500, Math.max(25, Number(event.target.value) || 25)))} className="h-9 bg-background text-xs" aria-label="Maximum AI-generated email body word count" /></div></div>
    </div>
    <Textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-3 min-h-20 bg-background text-sm" maxLength={800} placeholder="Example: Warmly invite a first-time buyer to review low-down-payment options, reference the property link, and ask for a 15-minute call. Keep the tone clear and educational." aria-label="Describe the goal for the AI email draft" />
    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input value={promptName} onChange={(event) => setPromptName(event.target.value)} maxLength={120} className="h-9 bg-background text-xs" placeholder="Name this prompt to save it, e.g. Warm buyer follow-up" aria-label="Name saved AI prompt" /><Button type="button" size="sm" variant="outline" className="h-9" onClick={saveCurrentPrompt} disabled={savePrompt.isPending}><Save className="mr-1.5 h-3.5 w-3.5" />{savePrompt.isPending ? "Saving…" : "Save prompt"}</Button></div>
    {generate.isPending ? <div className="mt-3 flex items-center gap-2 rounded-md border border-violet-500/20 bg-background/70 px-3 py-2 text-xs text-violet-950" role="status" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin text-violet-700" /><span><strong>Generating your email draft…</strong> Applying your goal and the current editable copy. This may take a moment.</span></div> : null}
    {proposedDraft ? <section className={`mt-3 rounded-md border border-violet-500/25 bg-background/70 p-3 transition-[opacity,transform] duration-200 motion-reduce:transition-none ${isApplying ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"}`} aria-label="Compare original and proposed AI draft"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Columns2 className="h-4 w-4 text-violet-700" /><p className="text-sm font-semibold">Compare before applying</p></div><Button type="button" size="sm" variant="ghost" className="h-8" onClick={copyProposedDraft}><Clipboard className="mr-1.5 h-3.5 w-3.5" />Copy draft</Button></div><p className="mt-1 text-xs text-muted-foreground">Highlighted gold fields are dynamic placeholders that fill from the selected workflow when a draft is used.</p><div className="mt-3 grid gap-3 md:grid-cols-2"><article className="min-w-0 rounded-md border border-border bg-muted/20 p-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Original template</p><p className="mt-2 break-words text-sm font-medium">{currentSubject || "No subject yet"}</p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{plainText(currentBody) || "No body yet"}</pre></article><article className="min-w-0 rounded-md border border-violet-500/30 bg-violet-500/[0.035] p-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Proposed AI draft</p><p className="mt-2 break-words text-sm font-medium">{highlightedDraft(proposedDraft.subject)}</p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{highlightedDraft(proposedDraft.body)}</pre><p className="mt-2 border-t border-violet-500/15 pt-2 text-[11px] text-muted-foreground">{wordCount(proposedDraft.body)} / {maxWordCount} words · {`${proposedDraft.subject} ${proposedDraft.body}`.length} characters</p></article></div><div className="mt-3 flex flex-wrap justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setProposedDraft(null)} disabled={isApplying}><X className="mr-1.5 h-3.5 w-3.5" />Discard proposal</Button><Button type="button" size="sm" variant="outline" onClick={createDraft} disabled={generate.isPending || isApplying}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Regenerate / refine</Button><Button type="button" size="sm" onClick={applyProposedDraft} disabled={isApplying}>{isApplying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}{isApplying ? "Applying…" : "Apply proposal"}</Button></div></section> : null}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] leading-relaxed text-muted-foreground">AI will not save, send, add a signature, quote rates, or make approval claims.</p><div className="flex flex-wrap gap-2">{undoDraft ? <Button type="button" size="sm" variant="outline" onClick={undoLastAiApplication}><Undo2 className="mr-1.5 h-3.5 w-3.5" />Undo AI apply</Button> : null}<Button type="button" size="sm" variant="outline" onClick={createDraft} disabled={generate.isPending}>{generate.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}{generate.isPending ? "Generating…" : "Draft with AI"}</Button>{hasGenerated ? <Button type="button" size="sm" variant="outline" onClick={createDraft} disabled={generate.isPending}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Regenerate / refine</Button> : null}</div></div>
  </section>;
}
