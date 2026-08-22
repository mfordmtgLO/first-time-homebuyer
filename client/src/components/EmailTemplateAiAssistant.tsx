import { Loader2, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export type EmailTemplateAiWorkflow = "listing_agent" | "property_list" | "property_page_agent" | "property_page_buyer" | "oregon_outreach" | "agent_directory" | "loan_officer_directory" | "platform_lead" | "platform_agent";

type Props = {
  workflow: EmailTemplateAiWorkflow;
  currentSubject?: string;
  currentBody: string;
  onApply: (draft: { subject: string; body: string }) => void;
};

/** Owner-controlled assistant: it only proposes editable copy and never saves or sends an email. */
export function EmailTemplateAiAssistant({ workflow, currentSubject = "", currentBody, onApply }: Props) {
  const [goal, setGoal] = useState("");
  const [promptName, setPromptName] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState("__none");
  const [hasGenerated, setHasGenerated] = useState(false);
  const utils = trpc.useUtils();
  const promptsQuery = trpc.emailTemplateAi.prompts.list.useQuery();
  const generate = trpc.emailTemplateAi.generate.useMutation({
    onSuccess: (draft) => {
      onApply(draft);
      setHasGenerated(true);
      toast.success("AI draft added to the editable fields. Review it before saving.");
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
    generate.mutate({ workflow, goal: goal.trim(), currentSubject: currentSubject.slice(0, 300), currentBody: currentBody.slice(0, 8000) });
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

  return <section className="rounded-lg border border-violet-500/25 bg-violet-500/[0.045] p-3" aria-label="AI email assistance">
    <div className="flex items-start gap-2"><div className="mt-0.5 rounded-md bg-violet-600/10 p-1.5 text-violet-700"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-foreground">AI assistance</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Describe the goal, audience, and tone. AI suggests a subject and draft body; you freely review and edit everything before saving.</p></div></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Select value={selectedPromptId} onValueChange={choosePrompt}><SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="Use a saved prompt" /></SelectTrigger><SelectContent><SelectItem value="__none">Choose a saved prompt</SelectItem>{(promptsQuery.data ?? []).map((prompt) => <SelectItem key={prompt.id} value={String(prompt.id)}>{prompt.name}</SelectItem>)}</SelectContent></Select><Button type="button" size="sm" variant="ghost" className="h-9 text-xs" disabled={selectedPromptId === "__none" || deletePrompt.isPending} onClick={removeSelectedPrompt}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remove</Button></div>
    <Textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-3 min-h-20 bg-background text-sm" maxLength={800} placeholder="Example: Warmly invite a first-time buyer to review low-down-payment options, reference the property link, and ask for a 15-minute call. Keep the tone clear and educational." aria-label="Describe the goal for the AI email draft" />
    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input value={promptName} onChange={(event) => setPromptName(event.target.value)} maxLength={120} className="h-9 bg-background text-xs" placeholder="Name this prompt to save it, e.g. Warm buyer follow-up" aria-label="Name saved AI prompt" /><Button type="button" size="sm" variant="outline" className="h-9" onClick={saveCurrentPrompt} disabled={savePrompt.isPending}><Save className="mr-1.5 h-3.5 w-3.5" />{savePrompt.isPending ? "Saving…" : "Save prompt"}</Button></div>
    {generate.isPending ? <div className="mt-3 flex items-center gap-2 rounded-md border border-violet-500/20 bg-background/70 px-3 py-2 text-xs text-violet-950" role="status" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin text-violet-700" /><span><strong>Generating your email draft…</strong> Applying your goal and the current editable copy. This may take a moment.</span></div> : null}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] leading-relaxed text-muted-foreground">AI will not save, send, add a signature, quote rates, or make approval claims.</p><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={createDraft} disabled={generate.isPending}>{generate.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}{generate.isPending ? "Generating…" : "Draft with AI"}</Button>{hasGenerated ? <Button type="button" size="sm" variant="outline" onClick={createDraft} disabled={generate.isPending}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Regenerate / refine</Button> : null}</div></div>
  </section>;
}
