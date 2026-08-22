import { useMemo, useState } from "react";
import { Archive, Mail, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmailTemplateAiAssistant } from "@/components/EmailTemplateAiAssistant";

const ADD_TEMPLATE = "__add_platform_lead_template__";
const DEFAULT_TEMPLATE = "__default_platform_lead_template__";
type Audience = "lead" | "agent";
type Context = { leadName: string; leadEmail?: string; agentName?: string | null; agentEmail?: string | null; loanOfficerName?: string | null; hasPair: boolean };
const firstName = (value: string) => value.trim().split(/\s+/)[0] || "there";

function defaultsFor(audience: Audience) {
  return audience === "lead"
    ? { subject: "A quick follow-up on your homebuying goals", body: "Hi {{lead_first_name}},\n\nThank you for your interest in first-time homebuying options. I’d be glad to help you review possible next steps and answer questions.{{team_context}}\n\nBest," }
    : { subject: "Platform lead follow-up: {{lead_name}}", body: "Hi {{agent_first_name}},\n\nA new platform lead, {{lead_name}}, is assigned to {{team_context}}. Would you like to coordinate a helpful next step?\n\nBest," };
}

function merge(text: string, context: Context, audience: Audience) {
  const leadTeam = context.hasPair && context.agentName ? ` I’m also coordinating with ${context.agentName}.` : "";
  const agentTeam = context.hasPair && context.loanOfficerName ? `${context.loanOfficerName} and the co-branded team` : context.loanOfficerName || "our team";
  return text.replaceAll("{{lead_name}}", context.leadName || "this lead").replaceAll("{{lead_first_name}}", firstName(context.leadName)).replaceAll("{{agent_name}}", context.agentName || "the assigned co-branded agent").replaceAll("{{agent_first_name}}", firstName(context.agentName || "there")).replaceAll("{{loan_officer_name}}", context.loanOfficerName || "the loan officer").replaceAll("{{team_context}}", audience === "lead" ? leadTeam : agentTeam);
}

export function PlatformLeadOutreachControls({ audience, context }: { audience: Audience; context: Context }) {
  const activeQuery = trpc.platformLeads.outreachTemplates.list.useQuery({ audience });
  const allQuery = trpc.platformLeads.outreachTemplates.list.useQuery({ audience, includeArchived: true });
  const [value, setValue] = useState(DEFAULT_TEMPLATE);
  const [editorOpen, setEditorOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [managerSearch, setManagerSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const defaults = defaultsFor(audience);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState(defaults.subject);
  const [body, setBody] = useState(defaults.body);
  const active = activeQuery.data ?? [];
  const all = allQuery.data ?? [];
  const selected = useMemo(() => active.find((template) => String(template.id) === value) ?? null, [active, value]);
  const filtered = useMemo(() => { const query = managerSearch.trim().toLowerCase(); return query ? all.filter((template) => `${template.name} ${template.subjectTemplate}`.toLowerCase().includes(query)) : all; }, [all, managerSearch]);
  const refresh = () => { void activeQuery.refetch(); void allQuery.refetch(); };
  const saveMutation = trpc.platformLeads.outreachTemplates.save.useMutation({ onSuccess: (result) => { refresh(); setValue(String(result.id)); setEditorOpen(false); toast.success("Saved platform outreach template."); }, onError: (error) => toast.error(error.message) });
  const archiveMutation = trpc.platformLeads.outreachTemplates.setArchived.useMutation({ onSuccess: refresh, onError: (error) => toast.error(error.message) });
  const deleteMutation = trpc.platformLeads.outreachTemplates.delete.useMutation({ onSuccess: () => { refresh(); setSelectedIds(new Set()); }, onError: (error) => toast.error(error.message) });
  const recipient = audience === "lead" ? context.leadEmail : context.agentEmail;
  const label = audience === "lead" ? "lead" : "agent";
  const pending = saveMutation.isPending || archiveMutation.isPending || deleteMutation.isPending;
  const openEditor = (template?: { id: number; name: string; subjectTemplate: string; bodyTemplate: string }) => { setEditingId(template?.id ?? null); setName(template?.name ?? ""); setSubject(template?.subjectTemplate ?? defaults.subject); setBody(template?.bodyTemplate ?? defaults.body); setEditorOpen(true); };
  const save = () => { if (name.trim().length < 2 || subject.trim().length < 2 || body.trim().length < 10) { toast.error("Enter a template name, subject, and email body."); return; } saveMutation.mutate({ audience, ...(editingId ? { id: editingId } : {}), name: name.trim(), subjectTemplate: subject.trim(), bodyTemplate: body.trim() }); };
  const draft = () => { if (!recipient?.trim()) { toast.error(`No ${label} email address is available for this draft.`); return; } const template = selected ? { subject: selected.subjectTemplate, body: selected.bodyTemplate } : defaults; window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(merge(template.subject, context, audience))}&body=${encodeURIComponent(merge(template.body, context, audience))}`; toast.success("Draft opened. Your mail client adds the complete signature once."); };
  const toggle = (id: number, checked: boolean) => setSelectedIds((current) => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; });
  const ids = () => Array.from(selectedIds);

  return <>
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-2">
      <Select value={value} onValueChange={(next) => next === ADD_TEMPLATE ? openEditor() : setValue(next)}><SelectTrigger className="h-8 min-w-40 flex-1 text-xs"><SelectValue placeholder="Select email template" /></SelectTrigger><SelectContent><SelectItem value={ADD_TEMPLATE}><span className="font-semibold text-primary">Add template</span></SelectItem><SelectItem value={DEFAULT_TEMPLATE}>Default {label} outreach</SelectItem>{active.map((template) => <SelectItem key={template.id} value={String(template.id)}>Saved · {template.name}</SelectItem>)}</SelectContent></Select>
      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setManagerOpen(true)}>Manage</Button><Button type="button" size="sm" className="h-8 text-xs" onClick={draft} disabled={!recipient?.trim()}><Mail className="mr-1.5 h-3.5 w-3.5" />Draft {label} email</Button>
      <p className="basis-full text-[10px] text-emerald-950">Select <strong>Add template</strong> to save reusable copy. The email client appends the complete Mike Ford signature once.</p>
    </div>
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingId ? "Edit" : "Add"} {label} email template</DialogTitle><DialogDescription>{"Merge fields: {{lead_name}}, {{lead_first_name}}, {{agent_name}}, {{agent_first_name}}, {{loan_officer_name}}, and {{team_context}}."}</DialogDescription></DialogHeader><div className="grid gap-3"><div className="grid gap-1"><Label>Template name</Label><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} /></div><div className="grid gap-1"><Label>Subject</Label><Input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={300} /></div><EmailTemplateAiAssistant workflow={audience === "lead" ? "platform_lead" : "platform_agent"} currentSubject={subject} currentBody={body} onApply={(draft) => { setSubject(draft.subject); setBody(draft.body); }} /><div className="grid gap-1"><Label>Body</Label><Textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-56" maxLength={20000} /></div></div><DialogFooter><Button variant="outline" onClick={() => setEditorOpen(false)} disabled={pending}>Cancel</Button><Button onClick={save} disabled={pending}><Plus className="mr-1.5 h-4 w-4" />Save template</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={managerOpen} onOpenChange={setManagerOpen}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Manage {label} email templates</DialogTitle><DialogDescription>Search, edit, archive, restore, or permanently delete private templates. Archive preserves copy for later recovery.</DialogDescription></DialogHeader><div className="flex flex-wrap gap-2"><Input value={managerSearch} onChange={(event) => setManagerSearch(event.target.value)} placeholder="Search templates" className="min-w-44 flex-1" /><Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set(filtered.map((template) => template.id)))}>Select all</Button><Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Clear</Button></div>{selectedIds.size ? <div className="mt-3 flex flex-wrap gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2"><span className="text-sm font-medium">{selectedIds.size} selected</span><Button size="sm" variant="outline" onClick={() => ids().forEach((id) => archiveMutation.mutate({ audience, id, archived: true }))}>Archive</Button><Button size="sm" variant="outline" onClick={() => ids().forEach((id) => archiveMutation.mutate({ audience, id, archived: false }))}>Restore</Button><Button size="sm" variant="destructive" onClick={() => { if (window.confirm(`Permanently delete ${selectedIds.size} template(s)?`)) deleteMutation.mutate({ audience, ids: ids() }); }}>Delete</Button></div> : null}<div className="mt-3 space-y-2">{filtered.length ? filtered.map((template) => <div key={template.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"><div className="flex min-w-0 items-center gap-2"><Checkbox checked={selectedIds.has(template.id)} onCheckedChange={(checked) => toggle(template.id, Boolean(checked))} aria-label={`Select ${template.name}`} /><div><p className="font-medium text-sm">{template.name}</p><p className="text-xs text-muted-foreground">{template.archivedAt ? "Archived" : "Active"} · {template.subjectTemplate}</p></div></div><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setManagerOpen(false); openEditor(template); }}><Pencil className="h-3.5 w-3.5" /></Button>{template.archivedAt ? <Button size="sm" variant="outline" onClick={() => archiveMutation.mutate({ audience, id: template.id, archived: false })}><RotateCcw className="h-3.5 w-3.5" /></Button> : <Button size="sm" variant="outline" onClick={() => archiveMutation.mutate({ audience, id: template.id, archived: true })}><Archive className="h-3.5 w-3.5" /></Button>}<Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (window.confirm(`Permanently delete “${template.name}”?`)) deleteMutation.mutate({ audience, ids: [template.id] }); }}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>) : <p className="text-sm text-muted-foreground">No matching templates.</p>}</div></DialogContent></Dialog>
  </>;
}
