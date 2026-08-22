import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
  const generate = trpc.emailTemplateAi.generate.useMutation({
    onSuccess: (draft) => {
      onApply(draft);
      toast.success("AI draft added to the editable fields. Review it before saving.");
    },
    onError: (error) => toast.error(error.message || "The AI draft could not be prepared. Please try again."),
  });
  const createDraft = () => {
    if (goal.trim().length < 4) {
      toast.error("Describe the email goal with at least a few words first.");
      return;
    }
    generate.mutate({ workflow, goal: goal.trim(), currentSubject: currentSubject.slice(0, 300), currentBody: currentBody.slice(0, 8000) });
  };

  return <section className="rounded-lg border border-violet-500/25 bg-violet-500/[0.045] p-3" aria-label="AI email assistance">
    <div className="flex items-start gap-2"><div className="mt-0.5 rounded-md bg-violet-600/10 p-1.5 text-violet-700"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-semibold text-foreground">AI assistance</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Describe the goal, audience, and tone. AI suggests a subject and draft body; you freely review and edit everything before saving.</p></div></div>
    <Textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-3 min-h-20 bg-background text-sm" maxLength={800} placeholder="Example: Warmly invite a first-time buyer to review low-down-payment options, reference the property link, and ask for a 15-minute call. Keep the tone clear and educational." aria-label="Describe the goal for the AI email draft" />
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] leading-relaxed text-muted-foreground">AI will not save, send, add a signature, quote rates, or make approval claims.</p><Button type="button" size="sm" variant="outline" onClick={createDraft} disabled={generate.isPending}>{generate.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}{generate.isPending ? "Drafting…" : "Draft with AI"}</Button></div>
  </section>;
}
