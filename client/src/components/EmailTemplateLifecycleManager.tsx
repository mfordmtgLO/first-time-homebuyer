import { Archive, ArchiveRestore, LockKeyhole, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ManagedEmailTemplate = {
  id: number;
  name: string;
  bodyTemplate: string;
  subjectTemplate?: string;
  archivedAt?: Date | string | null;
  isBuiltIn?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  templates: ManagedEmailTemplate[];
  pending?: boolean;
  onEdit: (template: ManagedEmailTemplate) => void;
  onArchive: (template: ManagedEmailTemplate) => void;
  onRestore: (template: ManagedEmailTemplate) => void;
  onDelete: (template: ManagedEmailTemplate) => void;
};

/** Consistent owner-facing lifecycle UI for reusable dashboard email templates. Built-ins remain read-only. */
export function EmailTemplateLifecycleManager({ open, onOpenChange, title, description, templates, pending = false, onEdit, onArchive, onRestore, onDelete }: Props) {
  const active = templates.filter((template) => !template.archivedAt);
  const archived = templates.filter((template) => Boolean(template.archivedAt));
  const renderTemplate = (template: ManagedEmailTemplate) => {
    const builtIn = template.isBuiltIn === 1;
    const isArchived = Boolean(template.archivedAt);
    return <div key={template.id} className={`rounded-lg border p-3 ${isArchived ? "border-amber-200 bg-amber-50/40" : "border-border bg-muted/20"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-foreground">{template.name}</p>{builtIn ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"><LockKeyhole className="h-3 w-3" />Built-in</span> : null}{isArchived ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Archived</span> : null}</div>
          {template.subjectTemplate ? <p className="mt-1 truncate text-xs text-muted-foreground">{template.subjectTemplate}</p> : null}
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.bodyTemplate}</p>
        </div>
        {builtIn ? <p className="text-xs text-muted-foreground">Available to use; protected from changes.</p> : <div className="flex flex-wrap gap-2">{isArchived ? <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onRestore(template)}><ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />Restore</Button> : <><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onEdit(template)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onArchive(template)}><Archive className="mr-1.5 h-3.5 w-3.5" />Archive</Button></>}<Button type="button" size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={pending} onClick={() => onDelete(template)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button></div>}
      </div>
    </div>;
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle className="font-display">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><div className="max-h-[58vh] space-y-5 overflow-y-auto pr-1"><section><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Active templates · {active.length}</p><div className="space-y-3">{active.length ? active.map(renderTemplate) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No active custom templates saved yet.</p>}</div></section><section><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Archived templates · {archived.length}</p><div className="space-y-3">{archived.length ? archived.map(renderTemplate) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No archived templates.</p>}</div></section></div><div className="flex justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button></div></DialogContent></Dialog>;
}
