import { useMemo, useState } from "react";
import { Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmailTemplateLifecycleManager } from "@/components/EmailTemplateLifecycleManager";
import { UniversalEmailTemplateEditor } from "@/components/UniversalEmailTemplateEditor";
import { buildDirectoryOutreachDraft, getDirectoryOutreachDefaultTemplate, type DirectoryOutreachAudience } from "@shared/directoryOutreachEmailDraft";

const ADD_TEMPLATE = "__add_directory_outreach_template__";
const DEFAULT_TEMPLATE = "__default_directory_outreach_template__";

type Recipient = { name: string; email: string; companyName?: string | null; title?: string | null };

export function DirectoryOutreachControls({ audience, recipient, compact = false }: { audience: DirectoryOutreachAudience; recipient: Recipient; compact?: boolean }) {
  const utils = trpc.useUtils();
  const activeTemplatesQuery = trpc.directoryOutreachTemplates.list.useQuery({ audience });
  const allTemplatesQuery = trpc.directoryOutreachTemplates.list.useQuery({ audience, includeArchived: true });
  const [templateValue, setTemplateValue] = useState(DEFAULT_TEMPLATE);
  const [editorOpen, setEditorOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const defaults = getDirectoryOutreachDefaultTemplate(audience);
  const [name, setName] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState(defaults.subjectTemplate);
  const [bodyTemplate, setBodyTemplate] = useState(defaults.bodyTemplate);
  const templates = activeTemplatesQuery.data ?? [];
  const allTemplates = allTemplatesQuery.data ?? [];
  const selectedTemplate = useMemo(() => templates.find((template) => String(template.id) === templateValue) ?? null, [templateValue, templates]);
  const scope = audience === "agent" ? "agent_directory" as const : "loan_officer_directory" as const;
  const workflow = audience === "agent" ? "agent_directory" as const : "loan_officer_directory" as const;
  const label = audience === "agent" ? "agent" : "loan officer";
  const invalidate = () => { void activeTemplatesQuery.refetch(); void allTemplatesQuery.refetch(); void utils.templateUsage.listCounts.invalidate({ templateScope: scope }); };

  const createTemplate = trpc.directoryOutreachTemplates.create.useMutation({ onSuccess: (template) => { invalidate(); setTemplateValue(String(template.id)); setEditorOpen(false); setEditingId(null); toast.success(`Saved ${label} email template.`); }, onError: (error) => toast.error(error.message || "Could not save the email template.") });
  const updateTemplate = trpc.directoryOutreachTemplates.update.useMutation({ onSuccess: (template) => { invalidate(); setTemplateValue(String(template.id)); setEditorOpen(false); setEditingId(null); toast.success(`Updated ${label} email template.`); }, onError: (error) => toast.error(error.message || "Could not update the email template.") });
  const setArchived = trpc.directoryOutreachTemplates.setArchived.useMutation({ onSuccess: (_result, variables) => { invalidate(); if (variables.archived && templateValue === String(variables.id)) setTemplateValue(DEFAULT_TEMPLATE); toast.success(variables.archived ? "Email template archived." : "Email template restored."); }, onError: (error) => toast.error(error.message || "Could not update the email template.") });
  const deleteTemplate = trpc.directoryOutreachTemplates.delete.useMutation({ onSuccess: (_result, variables) => { invalidate(); if (templateValue === String(variables.id)) setTemplateValue(DEFAULT_TEMPLATE); toast.success("Email template permanently deleted."); }, onError: (error) => toast.error(error.message || "Could not delete the email template.") });
  const recordOpen = trpc.templateUsage.recordDraftOpen.useMutation({ onSuccess: () => void utils.templateUsage.listCounts.invalidate({ templateScope: scope }) });
  const pending = createTemplate.isPending || updateTemplate.isPending || setArchived.isPending || deleteTemplate.isPending;

  const startNewTemplate = () => { setEditingId(null); setName(""); setSubjectTemplate(defaults.subjectTemplate); setBodyTemplate(defaults.bodyTemplate); setEditorOpen(true); };
  const openEditor = (template: { id: number; name: string; subjectTemplate?: string; bodyTemplate: string }) => { setEditingId(template.id); setName(template.name); setSubjectTemplate(template.subjectTemplate || defaults.subjectTemplate); setBodyTemplate(template.bodyTemplate); setManagerOpen(false); setEditorOpen(true); };
  const save = () => {
    if (name.trim().length < 2 || subjectTemplate.trim().length < 4 || bodyTemplate.trim().length < 20) { toast.error("Enter a template name, subject, and at least 20 characters of email body copy."); return; }
    const input = { audience, name: name.trim(), subjectTemplate: subjectTemplate.trim(), bodyTemplate: bodyTemplate.trim() };
    if (editingId) updateTemplate.mutate({ id: editingId, ...input }); else createTemplate.mutate(input);
  };
  const chooseTemplate = (value: string) => { if (value === ADD_TEMPLATE) { startNewTemplate(); return; } setTemplateValue(value); };
  const openDraft = () => {
    if (!recipient.email.trim()) { toast.error(`${recipient.name} does not have an email address on file.`); return; }
    const draft = buildDirectoryOutreachDraft({ audience, recipient, template: selectedTemplate });
    if (selectedTemplate) recordOpen.mutate({ templateScope: scope, templateId: selectedTemplate.id });
    window.location.href = draft.mailto;
    toast.success(`Draft opened for ${recipient.name}. Your mail client adds the complete signature once.`);
  };

  return <>
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${compact ? "" : "rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-2"}`}>
      <Select value={templateValue} onValueChange={chooseTemplate}>
        <SelectTrigger className="h-8 min-w-44 flex-1 bg-background text-xs"><SelectValue placeholder="Select email template" /></SelectTrigger>
        <SelectContent><SelectItem value={ADD_TEMPLATE}><span className="font-semibold text-primary">Add template</span></SelectItem><SelectItem value={DEFAULT_TEMPLATE}>Default outreach</SelectItem>{templates.map((template) => <SelectItem key={template.id} value={String(template.id)}>Saved · {template.name}</SelectItem>)}</SelectContent>
      </Select>
      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setManagerOpen(true)}>Manage</Button>
      <Button type="button" size="sm" className="h-8 text-xs" onClick={openDraft}><Mail className="mr-1.5 h-3.5 w-3.5" />Draft email</Button>
      {!compact ? <p className="basis-full text-[10px] leading-relaxed text-emerald-950">Choose <strong>Add template</strong> first to create reusable rich email copy. Drafts open in your email client, which appends the complete Mike Ford signature once.</p> : null}
    </div>

    <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0"><DialogHeader className="shrink-0 border-b border-border px-6 py-5"><DialogTitle className="font-display">{editingId ? `Edit ${label} email template` : `Add ${label} email template`}</DialogTitle><DialogDescription>Use merge fields for recipient details. The mail client appends the final signature after this body.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] px-6 py-5"><div className="space-y-4"><div className="space-y-1.5"><Label htmlFor={`directory-${audience}-template-name`}>Template name</Label><Input id={`directory-${audience}-template-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={160} placeholder="e.g., First-time buyer partnership introduction" /></div><div className="space-y-1.5"><Label htmlFor={`directory-${audience}-template-subject`}>Subject line</Label><Input id={`directory-${audience}-template-subject`} value={subjectTemplate} onChange={(event) => setSubjectTemplate(event.target.value)} maxLength={300} /></div><div className="space-y-1.5"><Label htmlFor={`directory-${audience}-template-body`}>Reusable email body</Label><UniversalEmailTemplateEditor id={`directory-${audience}-template-body`} value={bodyTemplate} onChange={setBodyTemplate} workflow={workflow} maxLength={6000} placeholder="Write your outreach email, then use recipient merge fields as needed." /></div></div></div><DialogFooter className="shrink-0 border-t border-border bg-background px-6 py-4"><Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={pending}>Cancel</Button><Button type="button" onClick={save} disabled={pending}>{editingId ? "Save changes" : <><Plus className="mr-1.5 h-4 w-4" />Save template</>}</Button></DialogFooter></DialogContent>
    </Dialog>

    <EmailTemplateLifecycleManager open={managerOpen} onOpenChange={setManagerOpen} title={`Manage ${label} email templates`} description={`Create, edit, preview, archive, restore, permanently delete, import, export, and restore prior versions of your private ${label} outreach templates.`} templateScope={scope} templates={allTemplates} pending={pending} onEdit={openEditor} onArchive={(template) => setArchived.mutate({ audience, id: template.id, archived: true })} onRestore={(template) => setArchived.mutate({ audience, id: template.id, archived: false })} onDelete={(template) => { if (window.confirm(`Permanently delete “${template.name}”? This cannot be undone.`)) deleteTemplate.mutate({ audience, id: template.id }); }} onBulkArchive={(ids) => ids.forEach((id) => setArchived.mutate({ audience, id, archived: true }))} onBulkRestore={(ids) => ids.forEach((id) => setArchived.mutate({ audience, id, archived: false }))} onBulkDelete={(ids) => ids.forEach((id) => deleteTemplate.mutate({ audience, id }))} onImport={async (portableTemplates) => { for (const template of portableTemplates) await createTemplate.mutateAsync({ audience, name: template.name, subjectTemplate: template.subjectTemplate || defaults.subjectTemplate, bodyTemplate: template.bodyTemplate }); }} />
  </>;
}
