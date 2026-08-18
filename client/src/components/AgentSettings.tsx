/**
 * Co-marketing Agents manager (admin-only, rendered inside /leads).
 * Unlimited agents, each with a paired co-branded URL (/with/:loanOfficer/:agent), a
 * visible toggle, and an optional "featured on homepage" selection.
 */
import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { slugify } from "@shared/slug";
import ProfileShareTools from "@/components/ProfileShareTools";
import { buildCoBrandedShareMailto } from "@shared/coBrandedShareDraft";
import { getUnpairedAgentIds } from "@shared/agentPairingStatus";
import { publicSiteUrl } from "@shared/publicSiteUrl";
import { filterSyncedTopAgents, getSyncedTopAgentSummary } from "@shared/syncedTopAgentUi";
import {
  AlertTriangle,
  Building2,
  Copy,
  Home,
  ImagePlus,
  Link2,
  Loader2,
  MailCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Save,
  Star,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";

type AgentRow = {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string;
  bio: string | null;
  website: string;
  companyName: string;
  headshotUrl: string;
  companyLogoUrl: string;
  syncedTopAgentId: number | null;
  visible: number;
  featured: number;
};

type FormState = {
  name: string;
  slug: string;
  email: string;
  phone: string;
  bio: string;
  website: string;
  companyName: string;
  headshotUrl: string;
  companyLogoUrl: string;
  syncedTopAgentId: number | null;
  visible: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  email: "",
  phone: "",
  bio: "",
  website: "",
  companyName: "",
  headshotUrl: "",
  companyLogoUrl: "",
  syncedTopAgentId: null,
  visible: true,
};

type SyncedTopAgentRow = {
  id: number;
  fullName: string;
  brokerage: string | null;
  cityArea: string | null;
  phone: string | null;
  email: string | null;
  websiteBioUrl: string | null;
  zillowUrl: string | null;
  headshotUrl: string | null;
  sourceRank: number | null;
  profileData: string;
  createdAgentId: number | null;
  syncedAt: Date;
};

function buildSyncedAgentBio(profile: SyncedTopAgentRow) {
  let source: Record<string, unknown> = {};
  try {
    source = JSON.parse(profile.profileData) as Record<string, unknown>;
  } catch {
    // An explicit profile field can still be used even when optional source detail is unavailable.
  }
  return [
    profile.brokerage ? `Brokerage: ${profile.brokerage}` : null,
    profile.cityArea ? `Service area: ${profile.cityArea}` : null,
    typeof profile.sourceRank === "number" ? `Oregon Top Agent source rank: #${profile.sourceRank}` : null,
    typeof source.buyerSideTransactions === "string" && source.buyerSideTransactions ? `Buyer-side transactions: ${source.buyerSideTransactions}` : null,
    typeof source.salesLast12Months === "string" && source.salesLast12Months ? `Sales in the last 12 months: ${source.salesLast12Months}` : null,
    profile.zillowUrl ? `Zillow profile: ${profile.zillowUrl}` : null,
    typeof source.notes === "string" && source.notes.trim() ? source.notes.trim() : null,
  ].filter((detail): detail is string => Boolean(detail)).join("\n\n");
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function agentUrl(agentSlug: string, loanOfficerSlug?: string | null) {
  return loanOfficerSlug
    ? publicSiteUrl(`/with/${loanOfficerSlug}/${agentSlug}`)
    : publicSiteUrl(`/with/${agentSlug}`);
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
  const upload = trpc.agent.uploadImage.useMutation({
    onSuccess: (data) => {
      onUploaded(data.url);
      toast.success(`${label} uploaded`);
    },
    onError: (err) => toast.error(err.message || `Couldn't upload ${label.toLowerCase()}.`),
  });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image is too large — please use a file under 4MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPEG, WebP, or GIF).");
      return;
    }
    const dataBase64 = await fileToBase64(file);
    upload.mutate({ kind, mimeType: file.type, dataBase64 });
  };

  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-2 flex items-center gap-3">
        {url ? (
          <div className="relative">
            <img
              src={url}
              alt={`${label} preview`}
              className={`h-14 w-14 border border-border bg-muted ${rounded ? "rounded-full object-cover" : "rounded-md object-contain p-1"}`}
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5 shadow"
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div
            className={`h-14 w-14 border border-dashed border-border bg-muted/40 flex items-center justify-center text-muted-foreground ${rounded ? "rounded-full" : "rounded-md"}`}
          >
            {kind === "headshot" ? <UserRound className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
          </div>
        )}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4 mr-1.5" />
            )}
            {url ? "Replace" : "Upload"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG, WebP or GIF, up to 4MB.</p>
        </div>
      </div>
    </div>
  );
}

function AgentFormDialog({
  open,
  onOpenChange,
  editing,
  syncedProfiles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AgentRow | null;
  syncedProfiles: SyncedTopAgentRow[];
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [syncedSearch, setSyncedSearch] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [initializedFor, setInitializedFor] = useState<number | "new" | null>(null);

  // Initialize form when the dialog opens for a given agent (or a new one).
  const key = editing ? editing.id : ("new" as const);
  if (open && initializedFor !== key) {
    setInitializedFor(key);
    setSlugTouched(false);
    setForm(
      editing
        ? {
            name: editing.name,
            slug: editing.slug,
            email: editing.email,
            phone: editing.phone,
            bio: editing.bio ?? "",
            website: editing.website,
            companyName: editing.companyName,
            headshotUrl: editing.headshotUrl,
            companyLogoUrl: editing.companyLogoUrl,
            syncedTopAgentId: editing.syncedTopAgentId,
            visible: editing.visible === 1,
          }
        : EMPTY
    );
  }
  if (!open && initializedFor !== null) {
    setInitializedFor(null);
  }

  const utils = trpc.useUtils();
  const onDone = (slug: string) => {
    utils.agent.list.invalidate();
    utils.agent.getFeatured.invalidate();
    utils.agent.getBySlug.invalidate();
    toast.success(`Agent saved — co-branded link: /with/${slug}`);
    onOpenChange(false);
  };
  const create = trpc.agent.create.useMutation({
    onSuccess: (data) => onDone(data.slug),
    onError: (err) => toast.error(err.message || "Couldn't create the agent."),
  });
  const update = trpc.agent.update.useMutation({
    onSuccess: (data) => onDone(data.slug),
    onError: (err) => toast.error(err.message || "Couldn't update the agent."),
  });
  const saving = create.isPending || update.isPending;

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Agent name is required.");
      return;
    }
    const payload = {
      name: form.name,
      slug: form.slug.trim(),
      email: form.email,
      phone: form.phone,
      bio: form.bio,
      website: form.website,
      companyName: form.companyName,
      headshotUrl: form.headshotUrl,
      companyLogoUrl: form.companyLogoUrl,
      syncedTopAgentId: form.syncedTopAgentId,
      visible: form.visible,
    };
    if (editing) {
      update.mutate({ id: editing.id, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  const previewSlug = form.slug.trim() || slugify(form.name) || "agent-name";
  const matchingSyncedProfiles = useMemo(
    () => filterSyncedTopAgents(syncedProfiles, syncedSearch),
    [syncedProfiles, syncedSearch]
  );
  const selectedSyncedProfile = syncedProfiles.find((profile) => profile.id === form.syncedTopAgentId) ?? null;
  const applySyncedProfile = (sourceId: string) => {
    const selected = syncedProfiles.find((profile) => profile.id === Number(sourceId));
    if (!selected) {
      set({ syncedTopAgentId: null });
      return;
    }
    const name = selected.fullName;
    set({
      syncedTopAgentId: selected.id,
      name,
      slug: slugTouched ? form.slug : slugify(name),
      email: selected.email ?? "",
      phone: selected.phone ?? "",
      companyName: selected.brokerage ?? "",
      website: selected.websiteBioUrl ?? "",
      headshotUrl: selected.headshotUrl ?? "",
      bio: buildSyncedAgentBio(selected),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editing ? `Edit ${editing.name}` : "Add a new agent"}
          </DialogTitle>
          <DialogDescription>
            Each agent gets a co-branded page you can share:{" "}
            <span className="font-medium text-foreground">/with/{previewSlug}</span>
          </DialogDescription>
        </DialogHeader>

        {!editing && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <Label htmlFor="synced-top-agent" className="text-sm font-semibold text-foreground">
              Start from a synced Oregon Top Agent
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Prefills the approved source profile, headshot, contact details, and profile links. You can review or edit every field before saving.
            </p>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search synced Oregon agents by name"
                value={syncedSearch}
                onChange={(event) => setSyncedSearch(event.target.value)}
                className="h-9 pl-9"
                placeholder="Search synced agent by name, brokerage, or city"
              />
            </div>
            <select
              id="synced-top-agent"
              value={form.syncedTopAgentId ?? ""}
              onChange={(event) => applySyncedProfile(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Choose a synced Oregon agent (optional)</option>
              {matchingSyncedProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.sourceRank ? `#${profile.sourceRank} · ` : ""}{profile.fullName}{profile.brokerage ? ` — ${profile.brokerage}` : ""}
                </option>
              ))}
            </select>
            {syncedSearch.trim() && matchingSyncedProfiles.length === 0 && (
              <p className="mt-2 text-xs font-medium text-amber-800">No synced Oregon profile matches “{syncedSearch.trim()}”.</p>
            )}
            {syncedProfiles.length === 0 && (
              <p className="mt-2 text-xs font-medium text-amber-800">Use Sync Top Agents first to load the authorized Oregon directory.</p>
            )}
            {selectedSyncedProfile && (
              <div className="mt-3 flex gap-3 rounded-md border border-primary/20 bg-background p-3">
                {selectedSyncedProfile.headshotUrl ? (
                  <img src={selectedSyncedProfile.headshotUrl} alt={`${selectedSyncedProfile.fullName} synced profile`} className="h-16 w-16 shrink-0 rounded-full border border-border object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                    <UserRound className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-foreground">{selectedSyncedProfile.fullName}{selectedSyncedProfile.sourceRank ? ` · #${selectedSyncedProfile.sourceRank}` : ""}</p>
                  <p className="mt-0.5 text-muted-foreground">{[selectedSyncedProfile.brokerage, selectedSyncedProfile.cityArea].filter(Boolean).join(" · ") || "Oregon source profile"}</p>
                  <p className="mt-1 text-xs text-muted-foreground break-words">{[selectedSyncedProfile.email, selectedSyncedProfile.phone].filter(Boolean).join(" · ")}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                    {selectedSyncedProfile.websiteBioUrl && <a className="text-primary underline underline-offset-2" href={selectedSyncedProfile.websiteBioUrl} target="_blank" rel="noreferrer">Website / bio</a>}
                    {selectedSyncedProfile.zillowUrl && <a className="text-primary underline underline-offset-2" href={selectedSyncedProfile.zillowUrl} target="_blank" rel="noreferrer">Zillow profile</a>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="agent-name" className="text-sm font-medium">Agent name *</Label>
            <Input
              id="agent-name"
              className="mt-1.5"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                set(slugTouched ? { name } : { name, slug: slugify(name) });
              }}
              placeholder="e.g., Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="agent-slug" className="text-sm font-medium">Custom link</Label>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground shrink-0">/with/</span>
              <Input
                id="agent-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") });
                }}
                placeholder={slugify(form.name) || "jane-doe"}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="agent-email" className="text-sm font-medium">Email</Label>
            <Input
              id="agent-email"
              type="email"
              className="mt-1.5"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="jane@realty.com"
            />
            <p className="mt-1 text-xs text-muted-foreground">Needed for "Send to agent" referrals.</p>
          </div>
          <div>
            <Label htmlFor="agent-phone" className="text-sm font-medium">Cell phone</Label>
            <Input
              id="agent-phone"
              type="tel"
              className="mt-1.5"
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="(541) 555-0123"
            />
          </div>
          <div>
            <Label htmlFor="agent-company" className="text-sm font-medium">Company name</Label>
            <Input
              id="agent-company"
              className="mt-1.5"
              value={form.companyName}
              onChange={(e) => set({ companyName: e.target.value })}
              placeholder="e.g., Willamette Realty Group"
            />
          </div>
          <div>
            <Label htmlFor="agent-website" className="text-sm font-medium">Company website</Label>
            <Input
              id="agent-website"
              type="url"
              className="mt-1.5"
              value={form.website}
              onChange={(e) => set({ website: e.target.value })}
              placeholder="https://www.example.com"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="agent-bio" className="text-sm font-medium">Bio</Label>
            <Textarea
              id="agent-bio"
              className="mt-1.5 min-h-[90px]"
              value={form.bio}
              onChange={(e) => set({ bio: e.target.value })}
              maxLength={2000}
              placeholder="A short introduction — experience, local expertise, and how they help first-time buyers."
            />
          </div>
          <ImageUpload
            kind="headshot"
            label="Agent headshot"
            url={form.headshotUrl}
            onUploaded={(url) => set({ headshotUrl: url })}
            onClear={() => set({ headshotUrl: "" })}
            rounded
          />
          <ImageUpload
            kind="logo"
            label="Company logo"
            url={form.companyLogoUrl}
            onUploaded={(url) => set({ companyLogoUrl: url })}
            onClear={() => set({ companyLogoUrl: "" })}
          />
          <div className="sm:col-span-2 flex items-center gap-2.5">
            <Switch
              id="agent-visible"
              checked={form.visible}
              onCheckedChange={(v) => set({ visible: v })}
            />
            <Label htmlFor="agent-visible" className="text-sm">
              Active — the co-branded page shows this agent
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {editing ? "Save changes" : "Add agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentSettings() {
  const agentsQuery = trpc.agent.list.useQuery();
  const agents = agentsQuery.data ?? [];
  const syncedProfilesQuery = trpc.agentSync.list.useQuery({ state: "Oregon" });
  const syncedProfiles = (syncedProfilesQuery.data ?? []) as SyncedTopAgentRow[];
  const syncedSummary = getSyncedTopAgentSummary(syncedProfiles);
  const officersQuery = trpc.loanOfficer.list.useQuery();
  const pairedOfficerByAgent = new Map(
    (officersQuery.data ?? [])
      .filter((officer) => officer.agentId !== null && officer.visible === 1)
      .map((officer) => [officer.agentId!, officer])
  );
  const unpairedAgentIds = new Set(getUnpairedAgentIds(agents, officersQuery.data ?? []));
  const unpairedAgents = agents.filter((agent) => unpairedAgentIds.has(agent.id));
  const statsQuery = trpc.agent.stats.useQuery();
  const statsByAgent = new Map(
    (statsQuery.data ?? []).map((s) => [s.agentId, s])
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgentRow | null>(null);
  const [deleting, setDeleting] = useState<AgentRow | null>(null);

  const utils = trpc.useUtils();
  const refreshAgents = () => {
    utils.agent.list.invalidate();
    utils.agent.getFeatured.invalidate();
    utils.agent.getBySlug.invalidate();
  };

  const syncTopAgents = trpc.agentSync.syncOregon.useMutation({
    onSuccess: (result) => {
      syncedProfilesQuery.refetch();
      toast.success(`Synced ${result.count} Oregon Top Agent profiles.`);
    },
    onError: (err) => toast.error(err.message || "Oregon agent sync could not be completed."),
  });

  const remove = trpc.agent.delete.useMutation({
    onSuccess: () => {
      refreshAgents();
      utils.leads.list.invalidate();
      toast.success("Agent removed.");
      setDeleting(null);
    },
    onError: (err) => toast.error(err.message || "Couldn't remove the agent."),
  });

  const setFeatured = trpc.agent.setFeatured.useMutation({
    onSuccess: () => {
      refreshAgents();
      toast.success("Homepage agent updated.");
    },
    onError: (err) => toast.error(err.message || "Couldn't update the homepage agent."),
  });

  const copyUrl = async (agentSlug: string, loanOfficerSlug?: string | null) => {
    const url = agentUrl(agentSlug, loanOfficerSlug);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Co-branded link copied to clipboard.");
    } catch {
      toast.error(`Copy failed — the link is ${url}`);
    }
  };

  const openShareDraft = (agent: AgentRow, loanOfficerSlug?: string | null) => {
    if (!agent.email) {
      toast.error(`${agent.name} has no email address on file.`);
      return;
    }
    window.location.href = buildCoBrandedShareMailto({ agentName: agent.name, agentEmail: agent.email, url: agentUrl(agent.slug, loanOfficerSlug) });
  };

  return (
    <section className="mt-10 rounded-lg bg-card border border-border shadow-sm">
      <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-xl text-foreground flex items-center gap-2.5">
            <Users className="h-5 w-5 text-primary" /> Co-marketing agents
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every agent gets their own co-branded page link to share. Mark one agent
            "On homepage" to feature them on the main site; assign agents to leads above.
          </p>
          {unpairedAgents.length > 0 && (
            <div role="alert" className="mt-3 flex max-w-3xl items-start gap-2.5 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
              <p><strong>{unpairedAgents.length} co-marketing agent{unpairedAgents.length === 1 ? " is" : "s are"} not paired with a loan officer.</strong> In the <em>Loan officers</em> section below, edit the appropriate officer, select the agent under <em>Co-marketing agent partner</em>, and save before distributing a QR code or co-branded link.</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
            <select
              aria-label="Top agent source state"
              className="h-8 rounded-sm bg-transparent px-2 text-sm font-medium outline-none"
              defaultValue="Oregon"
              disabled
            >
              <option value="Oregon">OR · Oregon</option>
            </select>
            <Button size="sm" variant="outline" onClick={() => syncTopAgents.mutate()} disabled={syncTopAgents.isPending}>
              {syncTopAgents.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Sync Top Agents
            </Button>
          </div>
          <div className="text-right text-[11px] leading-tight text-muted-foreground">
            <p><strong className="font-semibold text-foreground">{syncedSummary.count}</strong> imported</p>
            <p>{syncedSummary.latestSyncedAt ? `Last synced ${syncedSummary.latestSyncedAt.toLocaleString()}` : "Not synced yet"}</p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add agent
          </Button>
        </div>
      </div>

      <div className="border-b border-border bg-muted/20 px-6 py-2 text-xs text-muted-foreground">
        <strong className="font-semibold text-foreground">Oregon sync:</strong> {syncedSummary.count} private source profile{syncedSummary.count === 1 ? "" : "s"} available for prefill. Synced information stays inside this owner dashboard until you create a partner.
      </div>

      {agentsQuery.isLoading || officersQuery.isLoading ? (
        <div className="flex items-center justify-center py-14 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading agents...
        </div>
      ) : agents.length === 0 ? (
        <div className="py-14 text-center">
          <UserRound className="h-9 w-9 mx-auto text-muted-foreground/60" />
          <p className="mt-3 font-medium text-foreground">No agents yet</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Add a partner real estate agent to get their co-branded page link and start
            routing leads to them.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {agents.map((agent) => {
            const pairedOfficer = pairedOfficerByAgent.get(agent.id);
            const shareUrl = agentUrl(agent.slug, pairedOfficer?.slug);
            return <li key={agent.id} className="px-6 py-4 flex flex-wrap items-center gap-4">
              {agent.headshotUrl ? (
                <img
                  src={agent.headshotUrl}
                  alt={`${agent.name} headshot`}
                  className="h-11 w-11 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserRound className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{agent.name}</span>
                  {agent.featured === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 text-foreground border border-accent/40 px-2 py-0.5 text-[11px] font-semibold">
                      <Home className="h-3 w-3" /> On homepage
                    </span>
                  )}
                  {agent.visible !== 1 && (
                    <span className="inline-flex rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[11px] font-semibold">
                      Inactive
                    </span>
                  )}
                  {unpairedAgentIds.has(agent.id) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800" title="This agent has no active loan-officer pairing">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Unpaired LO
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  {agent.companyName && <span>{agent.companyName} ·</span>}
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="h-3.5 w-3.5" /> {pairedOfficer ? `/with/${pairedOfficer.slug}/${agent.slug}` : `/with/${agent.slug}`}
                  </span>
                  {!pairedOfficer && <span className="text-xs font-medium text-amber-700">Pair a loan officer to create a full co-branded link.</span>}
                </div>
                {(() => {
                  const stats = statsByAgent.get(agent.id);
                  const linkLeads = stats?.linkLeads ?? 0;
                  const assignedLeads = stats?.assignedLeads ?? 0;
                  const referredLeads = stats?.referredLeads ?? 0;
                  return (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          linkLeads > 0
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-muted/60 text-muted-foreground border-border"
                        }`}
                        title="Leads captured through this agent's co-branded link"
                      >
                        <TrendingUp className="h-3 w-3" />
                        {linkLeads} from link
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-muted/60 text-muted-foreground border border-border px-2 py-0.5 text-[11px] font-semibold"
                        title="Leads currently assigned to this agent (link + manual)"
                      >
                        <UserRound className="h-3 w-3" />
                        {assignedLeads} assigned
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          referredLeads > 0
                            ? "bg-emerald-600/10 text-emerald-700 border-emerald-600/30"
                            : "bg-muted/60 text-muted-foreground border-border"
                        }`}
                        title="Assigned leads you've emailed to this agent"
                      >
                        <MailCheck className="h-3 w-3" />
                        {referredLeads} referred
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <ProfileShareTools url={shareUrl} label={`${agent.name} co-branded page`} />
                <Button variant="outline" size="sm" onClick={() => openShareDraft(agent, pairedOfficer?.slug)} title="Open an email draft with this agent's QR-and-URL sharing message">
                  <MailCheck className="h-3.5 w-3.5 mr-1.5" /> Share QR + URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setFeatured.isPending}
                  onClick={() =>
                    setFeatured.mutate({ id: agent.featured === 1 ? null : agent.id })
                  }
                  title={
                    agent.featured === 1
                      ? "Remove from homepage"
                      : "Feature this agent on the homepage"
                  }
                >
                  <Star
                    className={`h-3.5 w-3.5 mr-1.5 ${agent.featured === 1 ? "fill-current" : ""}`}
                  />
                  {agent.featured === 1 ? "Unfeature" : "Feature"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(agent);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(agent)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>;
          })}
        </ul>
      )}

      <AgentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} syncedProfiles={syncedProfiles} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their co-branded page link will stop working and they'll be unassigned from any
              leads. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && remove.mutate({ id: deleting.id })}
            >
              {remove.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              Remove agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
