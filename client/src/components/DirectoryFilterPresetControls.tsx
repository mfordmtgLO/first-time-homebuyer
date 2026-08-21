import { useState } from "react";
import { BookmarkPlus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DirectoryOutreachAudience } from "@shared/directoryOutreachEmailDraft";

const NONE = "__no_directory_filter_preset__";

export type DirectoryFilterValues = { searchQuery: string; sortOrder: "last_name" | "recent"; principalBrokerOnly: boolean };

export function DirectoryFilterPresetControls({ audience, filters, onApply }: { audience: DirectoryOutreachAudience; filters: DirectoryFilterValues; onApply: (filters: DirectoryFilterValues) => void }) {
  const presetsQuery = trpc.directoryOutreach.filterPresets.list.useQuery({ audience });
  const [selectedId, setSelectedId] = useState(NONE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const presets = presetsQuery.data ?? [];
  const create = trpc.directoryOutreach.filterPresets.create.useMutation({ onSuccess: (preset) => { void presetsQuery.refetch(); setSelectedId(String(preset.id)); setDialogOpen(false); setName(""); toast.success("Saved directory view."); }, onError: (error) => toast.error(error.message || "Could not save the directory view.") });
  const remove = trpc.directoryOutreach.filterPresets.delete.useMutation({ onSuccess: () => { void presetsQuery.refetch(); setSelectedId(NONE); toast.success("Saved directory view deleted."); }, onError: (error) => toast.error(error.message || "Could not delete the directory view.") });
  const choose = (value: string) => {
    setSelectedId(value);
    const preset = presets.find((candidate) => String(candidate.id) === value);
    if (preset) onApply({ searchQuery: preset.searchQuery, sortOrder: preset.sortOrder, principalBrokerOnly: preset.principalBrokerOnly === 1 });
  };
  const save = () => {
    if (name.trim().length < 2) { toast.error("Enter a saved-view name with at least two characters."); return; }
    create.mutate({ audience, name: name.trim(), ...filters });
  };
  const selectedPreset = presets.find((preset) => String(preset.id) === selectedId);
  return <>
    <div className="flex min-w-0 items-center gap-1.5"><Select value={selectedId} onValueChange={choose}><SelectTrigger className="h-8 min-w-36 bg-background text-xs"><SelectValue placeholder="Saved views" /></SelectTrigger><SelectContent><SelectItem value={NONE}>Saved views</SelectItem>{presets.map((preset) => <SelectItem key={preset.id} value={String(preset.id)}>{preset.name}</SelectItem>)}</SelectContent></Select><Button type="button" size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setDialogOpen(true)}><BookmarkPlus className="mr-1 h-3.5 w-3.5" />Save view</Button>{selectedPreset ? <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete saved view ${selectedPreset.name}`} onClick={() => { if (window.confirm(`Delete saved view “${selectedPreset.name}”?`)) remove.mutate({ audience, id: selectedPreset.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button> : null}</div>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Save directory view</DialogTitle><DialogDescription>Save the current search and ordering so you can reapply it quickly later.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor={`directory-view-${audience}`}>View name</Label><Input id={`directory-view-${audience}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="e.g., PB outreach list" /><p className="text-xs text-muted-foreground">Current: {filters.searchQuery ? `search “${filters.searchQuery}” · ` : ""}{filters.sortOrder === "last_name" ? "A–Z by last name" : "most recent"}{filters.principalBrokerOnly ? " · PB only" : ""}</p></div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={create.isPending}>Cancel</Button><Button type="button" onClick={save} disabled={create.isPending}><Save className="mr-1.5 h-4 w-4" />Save view</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
