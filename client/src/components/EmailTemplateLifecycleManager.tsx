import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, CheckSquare, Eye, LockKeyhole, Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

export type ManagedEmailTemplate = {
  id: number;
  name: string;
  bodyTemplate: string;
  subjectTemplate?: string;
  archivedAt?: Date | string | null;
  isBuiltIn?: number;
};

type TemplateUsageScope = "listing_agent" | "property_list" | "property_page_agent" | "property_page_buyer" | "oregon_outreach";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  templateScope: TemplateUsageScope;
  templates: ManagedEmailTemplate[];
  pending?: boolean;
  onEdit: (template: ManagedEmailTemplate) => void;
  onArchive: (template: ManagedEmailTemplate) => void;
  onRestore: (template: ManagedEmailTemplate) => void;
  onDelete: (template: ManagedEmailTemplate) => void;
  onBulkArchive: (templateIds: number[]) => void;
  onBulkRestore: (templateIds: number[]) => void;
  onBulkDelete: (templateIds: number[]) => void;
};

/** Consistent owner-facing lifecycle UI for reusable dashboard email templates. Built-ins remain read-only. */
export function EmailTemplateLifecycleManager({ open, onOpenChange, title, description, templateScope, templates, pending = false, onEdit, onArchive, onRestore, onDelete, onBulkArchive, onBulkRestore, onBulkDelete }: Props) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewTemplate, setPreviewTemplate] = useState<ManagedEmailTemplate | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "most_used" | "least_used">("name");
  const usageQuery = trpc.templateUsage.listCounts.useQuery({ templateScope }, { enabled: open });
  const usageById = useMemo(() => new Map((usageQuery.data ?? []).map((row) => [row.templateId, row.usageCount])), [usageQuery.data]);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matchesSearch = (template: ManagedEmailTemplate) => !normalizedSearch || `${template.name} ${template.subjectTemplate ?? ""} ${template.bodyTemplate}`.toLocaleLowerCase().includes(normalizedSearch);
  const sortTemplates = (items: ManagedEmailTemplate[]) => [...items].sort((left, right) => {
    const usageDifference = (usageById.get(right.id) ?? 0) - (usageById.get(left.id) ?? 0);
    if (sortBy === "most_used" && usageDifference !== 0) return usageDifference;
    if (sortBy === "least_used" && usageDifference !== 0) return -usageDifference;
    return left.name.localeCompare(right.name);
  });
  const active = sortTemplates(templates.filter((template) => !template.archivedAt && matchesSearch(template)));
  const archived = sortTemplates(templates.filter((template) => Boolean(template.archivedAt) && matchesSearch(template)));
  const selectableActiveIds = active.filter((template) => template.isBuiltIn !== 1).map((template) => template.id);
  const selectableArchivedIds = archived.filter((template) => template.isBuiltIn !== 1).map((template) => template.id);
  const allVisibleActiveSelected = selectableActiveIds.length > 0 && selectableActiveIds.every((id) => selectedIds.has(id));
  const allVisibleArchivedSelected = selectableArchivedIds.length > 0 && selectableArchivedIds.every((id) => selectedIds.has(id));
  const selectedActiveIds = selectableActiveIds.filter((id) => selectedIds.has(id));
  const selectedArchivedIds = selectableArchivedIds.filter((id) => selectedIds.has(id));

  const setSelection = (id: number, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleVisibleSelection = (ids: number[], allSelected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };
  const closeManager = (isOpen: boolean) => {
    if (!isOpen) {
      setSearch("");
      setSelectedIds(new Set());
    }
    onOpenChange(isOpen);
  };
  const renderTemplate = (template: ManagedEmailTemplate) => {
    const builtIn = template.isBuiltIn === 1;
    const isArchived = Boolean(template.archivedAt);
    const usageCount = usageById.get(template.id) ?? 0;
    const selected = selectedIds.has(template.id);
    return <div key={template.id} className={`rounded-lg border p-3 ${isArchived ? "border-amber-200 bg-amber-50/40" : "border-border bg-muted/20"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {!builtIn ? <input type="checkbox" aria-label={`Select ${template.name} for bulk action`} checked={selected} disabled={pending} onChange={(event) => setSelection(template.id, event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary" /> : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-foreground">{template.name}</p>{builtIn ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"><LockKeyhole className="h-3 w-3" />Built-in</span> : null}{isArchived ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Archived</span> : null}<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{usageCount} draft {usageCount === 1 ? "open" : "opens"}</span></div>
            {template.subjectTemplate ? <p className="mt-1 truncate text-xs text-muted-foreground">{template.subjectTemplate}</p> : null}
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.bodyTemplate}</p>
          </div>
        </div>
        {builtIn ? <p className="text-xs text-muted-foreground">Available to use; protected from changes.</p> : <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setPreviewTemplate(template)}><Eye className="mr-1.5 h-3.5 w-3.5" />Preview</Button>{isArchived ? <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onRestore(template)}><ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />Restore</Button> : <><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onEdit(template)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onArchive(template)}><Archive className="mr-1.5 h-3.5 w-3.5" />Archive</Button></>}<Button type="button" size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" disabled={pending} onClick={() => onDelete(template)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button></div>}
      </div>
    </div>;
  };
  return <>
    <Dialog open={open} onOpenChange={closeManager}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle className="font-display">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><div className="flex flex-col gap-3 border-y border-border py-3 sm:flex-row sm:items-center"><label className="relative block min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates" className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label><select aria-label="Sort templates" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="name">Name A–Z</option><option value="most_used">Most used</option><option value="least_used">Least used</option></select></div><div className="max-h-[52vh] space-y-5 overflow-y-auto pr-1"><section><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Active templates · {active.length}</p><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={!selectableActiveIds.length || pending} onClick={() => toggleVisibleSelection(selectableActiveIds, allVisibleActiveSelected)}><CheckSquare className="mr-1.5 h-3.5 w-3.5" />{allVisibleActiveSelected ? "Clear active" : "Select active"}</Button><Button type="button" size="sm" disabled={!selectedActiveIds.length || pending} onClick={() => { onBulkArchive(selectedActiveIds); setSelectedIds(new Set()); }}><Archive className="mr-1.5 h-3.5 w-3.5" />Archive selected ({selectedActiveIds.length})</Button></div></div><div className="space-y-3">{active.length ? active.map(renderTemplate) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No active templates match this search.</p>}</div></section><section><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Archived templates · {archived.length}</p><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={!selectableArchivedIds.length || pending} onClick={() => toggleVisibleSelection(selectableArchivedIds, allVisibleArchivedSelected)}><CheckSquare className="mr-1.5 h-3.5 w-3.5" />{allVisibleArchivedSelected ? "Clear archived" : "Select archived"}</Button><Button type="button" size="sm" variant="outline" disabled={!selectedArchivedIds.length || pending} onClick={() => { onBulkRestore(selectedArchivedIds); setSelectedIds(new Set()); }}><ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />Restore selected ({selectedArchivedIds.length})</Button><Button type="button" size="sm" className="bg-rose-700 hover:bg-rose-800" disabled={!selectedArchivedIds.length || pending} onClick={() => { if (window.confirm(`Permanently delete ${selectedArchivedIds.length} archived template${selectedArchivedIds.length === 1 ? "" : "s"}? This cannot be undone.`)) { onBulkDelete(selectedArchivedIds); setSelectedIds(new Set()); } }}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete selected ({selectedArchivedIds.length})</Button></div></div><div className="space-y-3">{archived.length ? archived.map(renderTemplate) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No archived templates match this search.</p>}</div></section></div><div className="flex justify-end"><Button type="button" variant="outline" onClick={() => closeManager(false)}>Close</Button></div></DialogContent></Dialog>
    <Dialog open={Boolean(previewTemplate)} onOpenChange={(isOpen) => !isOpen && setPreviewTemplate(null)}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle className="font-display">{previewTemplate?.name}</DialogTitle><DialogDescription>Read-only template preview. Property and recipient details are merged only when a draft is opened.</DialogDescription></DialogHeader>{previewTemplate?.subjectTemplate ? <div className="rounded-md border border-border bg-muted/30 p-3 text-sm"><span className="font-semibold">Subject: </span>{previewTemplate.subjectTemplate}</div> : null}<pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-4 font-sans text-sm leading-6 text-foreground">{previewTemplate?.bodyTemplate}</pre><div className="flex justify-end"><Button type="button" variant="outline" onClick={() => setPreviewTemplate(null)}>Close preview</Button></div></DialogContent></Dialog>
  </>;
}
