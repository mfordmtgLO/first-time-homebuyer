import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, FileClock, Loader2, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const OFFICIAL_RESTORE_PORTAL = "https://manus.im/backup";

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function endOfDate(value: string) {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getSecurePackageUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function BackupManagementPanel() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [eventType, setEventType] = useState<"backup_created" | "restore_confirmed">("backup_created");
  const [label, setLabel] = useState("");
  const [packageReference, setPackageReference] = useState("");
  const [notes, setNotes] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDateInputValue(new Date()));

  const queryInput = useMemo(() => ({
    query: search.trim() || undefined,
    startDate: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
    endDate: endDate ? endOfDate(endDate) : undefined,
    limit: 80,
  }), [endDate, search, startDate]);
  const history = trpc.backupManagement.list.useQuery(queryInput);
  const recordEvent = trpc.backupManagement.recordEvent.useMutation({
    onSuccess: async (_, input) => {
      await utils.backupManagement.list.invalidate();
      setLabel("");
      setPackageReference("");
      setNotes("");
      toast.success(input.eventType === "restore_confirmed" ? "Restoration completion recorded." : "Backup event recorded.");
    },
    onError: (error) => toast.error(error.message),
  });

  const filtersActive = Boolean(search || startDate || endDate);
  const submitEvent = () => {
    const timestamp = new Date(`${occurredAt}T12:00:00`);
    if (!label.trim()) {
      toast.error("Add a clear backup or restoration label before recording the event.");
      return;
    }
    if (Number.isNaN(timestamp.getTime())) {
      toast.error("Choose a valid event date.");
      return;
    }
    recordEvent.mutate({
      eventType,
      label: label.trim(),
      packageReference: packageReference.trim() || null,
      notes: notes.trim() || null,
      occurredAt: timestamp,
    });
  };

  const openRestorePortal = () => {
    window.open(OFFICIAL_RESTORE_PORTAL, "_blank", "noopener,noreferrer");
    setRestoreConfirmOpen(false);
  };

  return (
    <section id="backup-management" className="scroll-mt-24 space-y-4" aria-labelledby="backup-management-heading">
      <div className="rounded-2xl border border-primary/15 bg-card p-4 text-card-foreground shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">Administrator only</span>
            </div>
            <h2 id="backup-management-heading" className="mt-2 text-xl font-bold tracking-tight">Backup readiness & history</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Record completed exports and official restoration confirmations. This dashboard does not restore platform data or overwrite records automatically.
            </p>
          </div>
          <Button type="button" variant="outline" className="shrink-0 border-amber-500/50 text-amber-800 hover:bg-amber-500/10 dark:text-amber-200" onClick={() => setRestoreConfirmOpen(true)}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Open official restore portal
          </Button>
        </div>

        <div className="mt-5 grid gap-3 border-t border-border pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_auto] lg:items-end">
          <label className="grid gap-1.5 text-xs font-semibold text-foreground">
            Event type
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={eventType} onChange={(event) => setEventType(event.target.value as "backup_created" | "restore_confirmed")}>
              <option value="backup_created">Backup completed</option>
              <option value="restore_confirmed">Restoration confirmed</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-foreground">
            Date completed
            <Input type="date" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-foreground">
            Label
            <Input value={label} maxLength={180} onChange={(event) => setLabel(event.target.value)} placeholder="e.g., All tasks export — Aug 2026" />
          </label>
          <Button type="button" onClick={submitEvent} disabled={recordEvent.isPending}>
            {recordEvent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <FileClock className="mr-2 h-4 w-4" aria-hidden="true" />}
            {recordEvent.isPending ? "Recording…" : "Record event"}
          </Button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-foreground">
            Secure package URL or reference (optional)
            <Input value={packageReference} maxLength={300} onChange={(event) => setPackageReference(event.target.value)} placeholder="https://… package URL, or a secure reference name" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-foreground">
            Owner notes (optional)
            <Textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} className="min-h-10 resize-y" placeholder="Scope, destination, or official confirmation details" />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h3 className="text-base font-bold">Recorded history</h3>
            <p className="mt-1 text-sm text-muted-foreground">Filter documented events by date, package reference, label, or notes.</p>
          </div>
          {filtersActive ? <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); }}>Clear filters</Button> : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
          <label className="relative block">
            <span className="sr-only">Search backup history</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search labels, package references, or notes" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">From<Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">To<Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        </div>

        <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-border/70" aria-live="polite">
          {history.isLoading ? <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading recorded history…</div> : null}
          {history.isError ? <p className="px-4 py-8 text-sm text-destructive">Could not load backup history: {history.error.message}</p> : null}
          {!history.isLoading && !history.isError && history.data?.length === 0 ? <p className="px-4 py-8 text-sm text-muted-foreground">No documented backup or restoration events match these filters.</p> : null}
          {history.data?.map((entry) => {
            const restored = entry.eventType === "restore_confirmed";
            const packageUrl = getSecurePackageUrl(entry.packageReference);
            return <article key={entry.id} className="flex gap-3 border-b border-border/70 px-4 py-3 last:border-0">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${restored ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-primary/10 text-primary"}`}>
                {restored ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <FileClock className="h-4 w-4" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-semibold">{entry.label}</p><span className={`text-xs font-semibold ${restored ? "text-emerald-700 dark:text-emerald-300" : "text-primary"}`}>{restored ? "Restoration confirmed" : "Backup completed"}</span></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(entry.occurredAt).toLocaleDateString()} {entry.packageReference ? `· ${entry.packageReference}` : ""}</p>
                {entry.notes ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{entry.notes}</p> : null}
                <div className="mt-2">
                  {packageUrl ? <a href={packageUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"><Download className="h-3.5 w-3.5" aria-hidden="true" />Download package</a> : <span className="text-xs text-muted-foreground">No secure package URL recorded</span>}
                </div>
              </div>
            </article>;
          })}
        </div>
      </div>

      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></div>
            <AlertDialogTitle>Open the official restore portal?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              Restoring data is a one-time, account-level action. Confirm the complete and current original backup package set before proceeding. This dashboard cannot restore data and will not report success automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={openRestorePortal}><ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />Continue to official portal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
