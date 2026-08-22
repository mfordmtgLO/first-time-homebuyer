import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { slugify } from "@shared/slug";
import ProfileShareTools from "@/components/ProfileShareTools";
import { DirectoryOutreachControls } from "@/components/DirectoryOutreachControls";
import { DirectoryFilterPresetControls } from "@/components/DirectoryFilterPresetControls";
import { toast } from "sonner";
import { publicSiteUrl } from "@shared/publicSiteUrl";
import {
  BadgeCheck,
  Building2,
  Copy,
  ImagePlus,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

type Agent = { id: number; name: string; slug: string; companyName: string; visible: number };
type Officer = {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string;
  nmls: string;
  title: string;
  companyName: string;
  bio: string | null;
  website: string;
  calendlyUrl: string;
  headshotUrl: string;
  companyLogoUrl: string;
  agentId: number | null;
  visible: number;
  featured: number;
  createdAt: Date;
};

type FormState = Omit<Officer, "id" | "featured" | "visible" | "bio" | "createdAt"> & { bio: string; visible: boolean };
type TextFieldKey = "name" | "title" | "email" | "phone" | "nmls" | "companyName" | "website" | "calendlyUrl";

const EMPTY: FormState = {
  name: "",
  slug: "",
  email: "",
  phone: "",
  nmls: "",
  title: "Loan Officer",
  companyName: "",
  bio: "",
  website: "",
  calendlyUrl: "",
  headshotUrl: "",
  companyLogoUrl: "",
  agentId: null,
  visible: true,
};

const MAX_FILE_BYTES = 4 * 1024 * 1024;

function readFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function pairUrl(officer: Pick<Officer, "slug">, agent: Pick<Agent, "slug"> | undefined) {
  return agent ? publicSiteUrl(`/with/${officer.slug}/${agent.slug}`) : null;
}

function loanOfficerUrl(officer: Pick<Officer, "slug">) {
  return publicSiteUrl(`/loan-officer/${officer.slug}`);
}

function ImageUpload({
  kind,
  label,
  url,
  onUploaded,
  onClear,
  rounded,
}: {
  kind: "headshot" | "logo";
  label: string;
  url: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
  rounded?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = trpc.loanOfficer.uploadImage.useMutation({
    onSuccess: ({ url }) => {
      onUploaded(url);
      toast.success(`${label} uploaded.`);
    },
    onError: (error) => toast.error(error.message || `Couldn't upload ${label.toLowerCase()}.`),
  });

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image is too large — please use a file under 4MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    upload.mutate({ kind, mimeType: file.type, dataBase64: await readFileToBase64(file) });
  };

  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-2 flex items-center gap-3">
        {url ? (
          <div className="relative">
            <img src={url} alt={`${label} preview`} className={`h-14 w-14 border border-border bg-muted ${rounded ? "rounded-full object-cover" : "rounded-md object-contain p-1"}`} />
            <button type="button" onClick={onClear} className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow" aria-label={`Remove ${label.toLowerCase()}`}><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <div className={`flex h-14 w-14 items-center justify-center border border-dashed border-border bg-muted/40 text-muted-foreground ${rounded ? "rounded-full" : "rounded-md"}`}>
            {kind === "headshot" ? <UserRound className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
          </div>
        )}
        <div>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
            {url ? "Replace" : "Upload"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, WebP or GIF, up to 4MB.</p>
        </div>
      </div>
    </div>
  );
}

function OfficerDialog({ open, onOpenChange, editing, agents }: { open: boolean; onOpenChange: (open: boolean) => void; editing: Officer | null; agents: Agent[] }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!open) return;
    setSlugTouched(false);
    setForm(editing ? {
      name: editing.name,
      slug: editing.slug,
      email: editing.email,
      phone: editing.phone,
      nmls: editing.nmls,
      title: editing.title,
      companyName: editing.companyName,
      bio: editing.bio ?? "",
      website: editing.website,
      calendlyUrl: editing.calendlyUrl,
      headshotUrl: editing.headshotUrl,
      companyLogoUrl: editing.companyLogoUrl,
      agentId: editing.agentId,
      visible: editing.visible === 1,
    } : EMPTY);
  }, [editing, open]);

  const invalidate = (slug: string) => {
    utils.loanOfficer.list.invalidate();
    utils.loanOfficer.getFeatured.invalidate();
    utils.loanOfficer.getPair.invalidate();
    toast.success(`Loan officer saved — public LO slug: ${slug}`);
    onOpenChange(false);
  };
  const create = trpc.loanOfficer.create.useMutation({ onSuccess: (data) => invalidate(data.slug), onError: (error) => toast.error(error.message) });
  const update = trpc.loanOfficer.update.useMutation({ onSuccess: (data) => invalidate(data.slug), onError: (error) => toast.error(error.message) });
  const saving = create.isPending || update.isPending;
  const set = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));
  const previewSlug = form.slug.trim() || slugify(form.name) || "loan-officer";

  const save = () => {
    if (!form.name.trim()) return toast.error("Loan officer name is required.");
    if (!form.email.trim()) return toast.error("Loan officer email is required.");
    const payload = { ...form, slug: form.slug.trim() };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };

  const field = (key: TextFieldKey, label: string, type = "text") => (
    <div className="space-y-1.5"><Label htmlFor={`officer-${key}`}>{label}</Label><Input id={`officer-${key}`} type={type} value={form[key] as string} onChange={(event) => set({ [key]: event.target.value } as Partial<FormState>)} /></div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editing ? `Edit ${editing.name}` : "Add loan officer"}</DialogTitle>
          <DialogDescription>Build a full public LO profile, choose one saved agent partner, and share a unique paired link: <span className="font-medium text-foreground">/with/{previewSlug}/agent-slug</span></DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          {field("name", "Full name")}{field("title", "Title")}
          {field("email", "Email address", "email")}{field("phone", "Phone number", "tel")}
          {field("nmls", "Individual NMLS #")}{field("companyName", "Company name")}
          <div className="space-y-1.5"><Label htmlFor="officer-slug">Public LO slug</Label><Input id="officer-slug" value={form.slug} onChange={(event) => { setSlugTouched(true); set({ slug: slugify(event.target.value) }); }} placeholder={slugify(form.name) || "loan-officer"} /><p className="text-xs text-muted-foreground">Used in paired URLs. {slugTouched ? "Custom slug set." : "Auto-generated from name if blank."}</p></div>
          {field("website", "Website", "url")}
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="officer-calendlyUrl">Calendly scheduling link <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="officer-calendlyUrl" type="url" value={form.calendlyUrl} onChange={(event) => set({ calendlyUrl: event.target.value })} placeholder="https://calendly.com/your-name/intro" /><p className="text-xs text-muted-foreground">When provided, public single-property pages show this loan officer’s “Schedule a call” button. Leave blank to hide it.</p></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="officer-agent">Co-marketing agent partner</Label><select id="officer-agent" value={form.agentId === null ? "none" : String(form.agentId)} onChange={(event) => set({ agentId: event.target.value === "none" ? null : Number(event.target.value) })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="none">No agent selected — LO profile only</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}{agent.companyName ? ` · ${agent.companyName}` : ""}{agent.visible !== 1 ? " (inactive)" : ""}</option>)}</select><p className="text-xs text-muted-foreground">Selecting an agent creates the unique shareable URL for this LO-agent partnership.</p></div>
          <div className="sm:col-span-2 space-y-1.5"><Label htmlFor="officer-bio">Bio</Label><Textarea id="officer-bio" value={form.bio} onChange={(event) => set({ bio: event.target.value })} rows={4} placeholder="A short client-facing introduction for this loan officer." /></div>
          <ImageUpload kind="headshot" label="Headshot" url={form.headshotUrl} rounded onUploaded={(headshotUrl) => set({ headshotUrl })} onClear={() => set({ headshotUrl: "" })} />
          <ImageUpload kind="logo" label="Company logo" url={form.companyLogoUrl} onUploaded={(companyLogoUrl) => set({ companyLogoUrl })} onClear={() => set({ companyLogoUrl: "" })} />
          <div className="flex items-center gap-3 sm:col-span-2"><Switch checked={form.visible} onCheckedChange={(visible) => set({ visible })} /><Label>Visible in chatbot and public co-marketing links</Label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save loan officer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LoanOfficerSettings() {
  const utils = trpc.useUtils();
  const officersQuery = trpc.loanOfficer.list.useQuery();
  const agentsQuery = trpc.agent.list.useQuery();
  const officers = (officersQuery.data ?? []) as Officer[];
  const agents = (agentsQuery.data ?? []) as Agent[];
  const agentById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Officer | null>(null);
  const [deleting, setDeleting] = useState<Officer | null>(null);
  const [directorySearch, setDirectorySearch] = useState("");
  const [directorySort, setDirectorySort] = useState<"last_name" | "recent">("last_name");
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<Set<number>>(() => new Set());
  const officerLastDraftsQuery = trpc.directoryOutreach.lastDrafts.useQuery({ audience: "loan_officer" });
  const visibleOfficers = useMemo(() => {
    const query = directorySearch.trim().toLowerCase();
    return officers
      .filter((officer) => !query || [officer.name, officer.companyName, officer.email, officer.nmls].some((value) => value.toLowerCase().includes(query)))
      .sort((left, right) => directorySort === "recent"
        ? new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        : (left.name.trim().split(/\s+/).at(-1) || left.name).localeCompare(right.name.trim().split(/\s+/).at(-1) || right.name) || left.name.localeCompare(right.name));
  }, [directorySearch, directorySort, officers]);
  const officerLastDraftById = useMemo(() => new Map((officerLastDraftsQuery.data ?? []).map((draft) => [draft.recipientId, draft.lastDraftedAt])), [officerLastDraftsQuery.data]);
  const selectedVisibleOfficers = useMemo(() => visibleOfficers.filter((officer) => selectedOfficerIds.has(officer.id)), [selectedOfficerIds, visibleOfficers]);
  const toggleSelectedOfficer = (id: number) => setSelectedOfficerIds((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAllVisibleOfficers = () => setSelectedOfficerIds((current) => { const next = new Set(current); const allSelected = visibleOfficers.length > 0 && visibleOfficers.every((officer) => next.has(officer.id)); if (allSelected) visibleOfficers.forEach((officer) => next.delete(officer.id)); else visibleOfficers.forEach((officer) => next.add(officer.id)); return next; });

  const feature = trpc.loanOfficer.setFeatured.useMutation({
    onSuccess: () => { utils.loanOfficer.list.invalidate(); utils.loanOfficer.getFeatured.invalidate(); toast.success("Default chat loan officer updated."); },
    onError: (error) => toast.error(error.message),
  });
  const remove = trpc.loanOfficer.delete.useMutation({
    onSuccess: () => { utils.loanOfficer.list.invalidate(); utils.loanOfficer.getFeatured.invalidate(); toast.success("Loan officer removed."); setDeleting(null); },
    onError: (error) => toast.error(error.message),
  });

  const copyPairLink = async (officer: Officer, agent: Agent) => {
    const url = pairUrl(officer, agent);
    if (!url) return;
    try { await navigator.clipboard.writeText(url); toast.success("Co-branded LO-agent link copied."); }
    catch { toast.error("Couldn't copy the link — please copy it from the address shown."); }
  };

  return (
    <section className="mt-10 rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center">
        <div><h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-foreground"><ShieldCheck className="h-5 w-5 text-primary" /> Loan officers</h2><p className="mt-1 text-sm text-muted-foreground">Add unlimited LO profiles, pair any saved agent, or share a standalone loan-officer profile page.</p></div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-1.5 h-4 w-4" /> Add LO</Button>
      </div>
      {officersQuery.isLoading || agentsQuery.isLoading ? <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading loan officers…</div> : officers.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">No loan officers have been added yet.</div> : <>
        <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-6 py-3 lg:flex-row lg:items-center lg:justify-between"><div className="relative min-w-0 flex-1 lg:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={directorySearch} onChange={(event) => setDirectorySearch(event.target.value)} className="h-9 pl-9 text-sm" placeholder="Search loan officers by name, company, NMLS, or email" /></div><div className="flex flex-wrap items-center gap-2"><label className="text-xs font-semibold text-muted-foreground">Order <select value={directorySort} onChange={(event) => setDirectorySort(event.target.value as "last_name" | "recent")} className="ml-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="last_name">A–Z by last name</option><option value="recent">Most recent</option></select></label><DirectoryFilterPresetControls audience="loan_officer" filters={{ searchQuery: directorySearch, sortOrder: directorySort, principalBrokerOnly: false }} onApply={(filters) => { setDirectorySearch(filters.searchQuery); setDirectorySort(filters.sortOrder); }} /><span className="rounded-full border border-border bg-background px-2 py-1 text-[11px] font-bold text-muted-foreground">{visibleOfficers.length} shown</span></div></div>
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-emerald-500/[0.035] px-6 py-2.5"><label className="flex items-center gap-2 text-xs font-semibold text-foreground"><Checkbox checked={visibleOfficers.length > 0 && visibleOfficers.every((officer) => selectedOfficerIds.has(officer.id))} onCheckedChange={toggleAllVisibleOfficers} />Select visible</label><span className="text-xs text-muted-foreground">{selectedVisibleOfficers.length} selected</span>{selectedVisibleOfficers.length ? <DirectoryOutreachControls audience="loan_officer" recipients={selectedVisibleOfficers.map((officer) => ({ id: officer.id, name: officer.name, email: officer.email, companyName: officer.companyName, title: officer.title }))} /> : null}</div>
        <div className="max-h-[34rem] overflow-y-scroll overscroll-contain [scrollbar-gutter:stable]"><ul className="divide-y divide-border/60">
          {visibleOfficers.map((officer) => {
            const partner = officer.agentId ? agentById.get(officer.agentId) : undefined;
            const url = partner ? pairUrl(officer, partner) : null;
            const standaloneUrl = partner ? null : loanOfficerUrl(officer);
            return <li key={officer.id} className="flex flex-wrap items-center gap-4 px-6 py-4"><Checkbox checked={selectedOfficerIds.has(officer.id)} onCheckedChange={() => toggleSelectedOfficer(officer.id)} aria-label={`Select ${officer.name} for group outreach`} />
              {officer.headshotUrl ? <img src={officer.headshotUrl} alt={`${officer.name} headshot`} className="h-11 w-11 rounded-full border border-border object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10"><BadgeCheck className="h-5 w-5 text-primary" /></div>}
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-foreground">{officer.name}</span>{officer.featured === 1 && <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-foreground"><Star className="h-3 w-3 fill-current" /> Default chat contact</span>}{officer.visible !== 1 && <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Inactive</span>}</div>
                <p className="mt-0.5 text-sm text-muted-foreground">{officer.title} · NMLS #{officer.nmls || "—"} · {officer.phone} · {officer.email}</p>
                {partner ? <p className="mt-1 flex items-center gap-1.5 text-xs text-primary"><Users className="h-3.5 w-3.5" /> Partnered with {partner.name}{partner.companyName ? ` · ${partner.companyName}` : ""} <span className="text-muted-foreground">· /with/{officer.slug}/{partner.slug}</span></p> : standaloneUrl ? <p className="mt-1 break-all text-xs text-muted-foreground">LO profile only · <a href={standaloneUrl} target="_blank" rel="noreferrer" className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary">{standaloneUrl}</a></p> : null}
                <p className="mt-1 text-xs text-muted-foreground">{officerLastDraftById.get(officer.id) ? `Last outreach draft: ${new Date(officerLastDraftById.get(officer.id)!).toLocaleString()}` : "No directory outreach draft opened yet"}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <DirectoryOutreachControls audience="loan_officer" recipients={[{ id: officer.id, name: officer.name, email: officer.email, companyName: officer.companyName, title: officer.title }]} compact />
                {url && <Button variant="outline" size="sm" onClick={() => copyPairLink(officer, partner!)}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link</Button>}
                {standaloneUrl && <ProfileShareTools url={standaloneUrl} label={`${officer.name} loan officer profile`} />}
                <Button variant="outline" size="sm" onClick={() => feature.mutate({ id: officer.featured === 1 ? null : officer.id })}><Star className={`mr-1.5 h-3.5 w-3.5 ${officer.featured === 1 ? "fill-current" : ""}`} />{officer.featured === 1 ? "Unfeature" : "Make default"}</Button>
                <Button variant="outline" size="sm" onClick={() => { setEditing(officer); setDialogOpen(true); }}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(officer)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </li>;
          })}
        </ul></div>
        {visibleOfficers.length === 0 ? <p className="px-6 py-8 text-center text-sm text-muted-foreground">No loan officer matches the current search and sort selection.</p> : null}
      </>}
      <OfficerDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} agents={agents} />
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>Existing captured leads and chat intakes remain saved, but this officer will no longer be the assigned contact for future pair links.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleting && remove.mutate({ id: deleting.id })}>{remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Remove LO</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section>
  );
}
