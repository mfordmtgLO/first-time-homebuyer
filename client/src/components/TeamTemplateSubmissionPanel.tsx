import { useState } from "react";
import { ClipboardCheck, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const statusCopy = {
  pending: "Awaiting Mike Ford’s review",
  approved: "Approved",
  rejected: "Needs revision",
} as const;

const statusStyle = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-800",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
} as const;

export function TeamTemplateSubmissionPanel() {
  const utils = trpc.useUtils();
  const submissions = trpc.teamTemplates.submissions.useQuery();
  const [channel, setChannel] = useState<"email" | "text">("email");
  const [name, setName] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const submit = trpc.teamTemplates.submit.useMutation({
    onSuccess: () => {
      utils.teamTemplates.submissions.invalidate();
      setName("");
      setSubjectTemplate("");
      setBodyTemplate("");
      toast.success("Template submitted to Mike Ford for review.");
    },
    onError: (error) => toast.error(error.message),
  });

  return <section className="rounded-2xl border border-amber-500/25 bg-card p-6 shadow-sm" aria-labelledby="template-submission-title">
    <div className="flex items-start gap-2"><ClipboardCheck className="mt-0.5 h-5 w-5 text-amber-700" /><div><h2 id="template-submission-title" className="text-lg font-semibold">Submit a template for approval</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Your proposed email or text is not usable as a team template until Mike Ford reviews it. He may approve it for team read-only use, retain it privately, or return it with feedback.</p></div></div>
    <div className="mt-4 grid gap-2 md:grid-cols-2"><select aria-label="Proposed template channel" value={channel} onChange={(event) => setChannel(event.target.value as "email" | "text")} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="email">Email template</option><option value="text">Text template</option></select><Input aria-label="Proposed template name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Template name" />{channel === "email" ? <Input aria-label="Proposed email subject" value={subjectTemplate} onChange={(event) => setSubjectTemplate(event.target.value)} placeholder="Subject line" /> : <div className="hidden md:block" />}</div>
    <Textarea aria-label="Proposed template body" className="mt-2 min-h-28" value={bodyTemplate} onChange={(event) => setBodyTemplate(event.target.value)} placeholder="Draft content for Mike Ford to review. Do not duplicate the standard signature." />
    <Button type="button" size="sm" className="mt-2" disabled={!name.trim() || !bodyTemplate.trim() || submit.isPending} onClick={() => submit.mutate({ channel, name, subjectTemplate: channel === "email" ? (subjectTemplate.trim() || null) : null, bodyTemplate })}>{submit.isPending ? "Submitting…" : <><Send className="mr-1.5 h-3.5 w-3.5" />Submit for Mike Ford’s review</>}</Button>
    <div className="mt-5 border-t border-border pt-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Your submission history</h3><span className="text-xs text-muted-foreground">{submissions.data?.length ?? 0} saved</span></div>{submissions.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading submissions…</p> : submissions.data?.length ? <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">{submissions.data.map((submission) => <article key={submission.id} className="rounded-lg border border-border bg-muted/20 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{submission.name}</p><p className="text-xs text-muted-foreground">{submission.channel === "email" ? "Email" : "Text"} · submitted {new Date(submission.createdAt).toLocaleString()}</p></div><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyle[submission.status]}`}>{statusCopy[submission.status]}</span></div>{submission.reviewerNote ? <p className="mt-2 rounded-md border border-border bg-background p-2 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Mike’s note:</strong> {submission.reviewerNote}</p> : null}</article>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No templates have been submitted for review yet.</p>}</div>
  </section>;
}
