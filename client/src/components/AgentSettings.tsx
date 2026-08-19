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
import { buildTrpcRequestHeaders } from "@shared/trpcRequestHeaders";
import { filterRankSnapshots, filterSyncedTopAgents, formatRankMovement, getRankMovement, getSourcePoolTotal, getSyncedTopAgentSummary, sortSyncedTopAgents, summarizeOfficeRankMovements, type RankHistoryRange, type SyncedTopAgentSort } from "@shared/syncedTopAgentUi";
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
  TrendingDown,
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
  previousSourceRank: number | null;
  profileData: string;
  createdAgentId: number | null;
  hasPendingReview: number;
  syncedAt: Date;
};

type RankMovementSummary = { fullName: string; brokerage: string | null; fromRank: number; toRank: number; rankTotal: number | null };

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

function syncedSourceDetail(profile: SyncedTopAgentRow) {
  try { return JSON.parse(profile.profileData) as Record<string, unknown>; } catch { return {}; }
}

function syncedRankLabel(profile: SyncedTopAgentRow) {
  const detail = syncedSourceDetail(profile);
  const total = typeof detail.rankTotal === "number" ? detail.rankTotal : null;
  const prefix = detail.rankKind === "office" ? "Office #" : "#";
  return profile.sourceRank && total ? `${prefix}${profile.sourceRank}/${total}` : profile.sourceRank ? `${prefix}${profile.sourceRank}` : "Unranked";
}

function isPrincipalBroker(profile: SyncedTopAgentRow) {
  return syncedSourceDetail(profile).recordType === "principal_broker";
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
  const [onlyUncreated, setOnlyUncreated] = useState(true);
  const [onlyPrincipalBrokers, setOnlyPrincipalBrokers] = useState(false);
  const [syncedSort, setSyncedSort] = useState<SyncedTopAgentSort>("rank");
  const [sourceDetailProfile, setSourceDetailProfile] = useState<SyncedTopAgentRow | null>(null);
  const [rankHistoryRange, setRankHistoryRange] = useState<RankHistoryRange>("all");
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
  const matchingSyncedProfiles = useMemo(() => {
    const searchable = onlyUncreated
      ? syncedProfiles.filter((profile) => profile.createdAgentId === null)
      : syncedProfiles;
    const principalBrokerFiltered = onlyPrincipalBrokers
      ? searchable.filter(isPrincipalBroker)
      : searchable;
    return sortSyncedTopAgents(filterSyncedTopAgents(principalBrokerFiltered, syncedSearch), syncedSort);
  }, [onlyPrincipalBrokers, onlyUncreated, syncedProfiles, syncedSearch, syncedSort]);
  const selectedSyncedProfile = syncedProfiles.find((profile) => profile.id === form.syncedTopAgentId) ?? null;
  const sourcePoolTotal = useMemo(() => getSourcePoolTotal(syncedProfiles), [syncedProfiles]);
  const rankHistoryQuery = trpc.agentSync.rankHistory.useQuery(
    { syncedTopAgentId: sourceDetailProfile?.id ?? 1 },
    { enabled: Boolean(sourceDetailProfile) }
  );
  const rankHistory = rankHistoryQuery.data ?? [];
  const filteredRankHistory = useMemo(() => filterRankSnapshots(rankHistory, rankHistoryRange), [rankHistory, rankHistoryRange]);
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
            <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={onlyUncreated}
                onChange={(event) => setOnlyUncreated(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              Only show uncreated profiles
            </label>
            <label className="ml-3 mt-2 inline-flex items-center gap-2 text-xs font-medium text-foreground">
              <input type="checkbox" checked={onlyPrincipalBrokers} onChange={(event) => setOnlyPrincipalBrokers(event.target.checked)} className="h-3.5 w-3.5 rounded border-input accent-primary" />
              PB only
            </label>
            <label className="ml-3 mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground">
              Sort
              <select value={syncedSort} onChange={(event) => setSyncedSort(event.target.value as SyncedTopAgentSort)} className="h-7 rounded border border-input bg-background px-1 text-xs">
                <option value="rank">Rank</option>
                <option value="office">Office</option>
                <option value="name">Name</option>
              </select>
            </label>
            {sourcePoolTotal && <span className="ml-3 mt-2 inline-flex rounded-full border border-primary/20 bg-background px-2 py-1 text-[11px] font-semibold text-primary">Source pool: {sourcePoolTotal} ranked agents</span>}
            <select
              id="synced-top-agent"
              value={form.syncedTopAgentId ?? ""}
              onChange={(event) => applySyncedProfile(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Choose a synced Oregon agent (optional)</option>
              {matchingSyncedProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName} ({syncedRankLabel(profile)}){profile.previousSourceRank && getRankMovement(profile.previousSourceRank, profile.sourceRank) ? ` · rank ${getRankMovement(profile.previousSourceRank, profile.sourceRank)}` : ""}{profile.brokerage ? ` — ${profile.brokerage}` : ""}
                </option>
              ))}
            </select>
            {matchingSyncedProfiles.length === 0 && syncedProfiles.length > 0 && (
              <p className="mt-2 text-xs font-medium text-amber-800">No synced Oregon profile matches the current search or creation filter.</p>
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
                  {isPrincipalBroker(selectedSyncedProfile) ? <span className="mr-2 inline-flex rounded-sm bg-[#0b2d5c] px-1.5 py-0.5 text-[10px] font-bold text-white">PB</span> : null}
                  <p className="font-semibold text-foreground">{selectedSyncedProfile.fullName} · {syncedRankLabel(selectedSyncedProfile)}</p>
                  <p className="mt-0.5 text-muted-foreground">{[selectedSyncedProfile.brokerage, selectedSyncedProfile.cityArea].filter(Boolean).join(" · ") || "Oregon source profile"}</p>
                  {typeof syncedSourceDetail(selectedSyncedProfile).principalBrokerName === "string" && <p className="mt-1 text-xs text-muted-foreground">Principal broker: {syncedSourceDetail(selectedSyncedProfile).principalBrokerName as string}</p>}
                  <p className="mt-1 text-xs text-muted-foreground break-words">{[selectedSyncedProfile.email, selectedSyncedProfile.phone].filter(Boolean).join(" · ")}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                    {selectedSyncedProfile.websiteBioUrl && <a className="text-primary underline underline-offset-2" href={selectedSyncedProfile.websiteBioUrl} target="_blank" rel="noreferrer">Website / bio</a>}
                    {selectedSyncedProfile.zillowUrl && <a className="text-primary underline underline-offset-2" href={selectedSyncedProfile.zillowUrl} target="_blank" rel="noreferrer">Zillow profile</a>}
                    {typeof syncedSourceDetail(selectedSyncedProfile).sourceProfileUrl === "string" && <a className="text-primary underline underline-offset-2" href={syncedSourceDetail(selectedSyncedProfile).sourceProfileUrl as string} target="_blank" rel="noreferrer">Oregon profile</a>}
                    {typeof syncedSourceDetail(selectedSyncedProfile).principalBrokerProfileUrl === "string" && <a className="text-primary underline underline-offset-2" href={syncedSourceDetail(selectedSyncedProfile).principalBrokerProfileUrl as string} target="_blank" rel="noreferrer">PB profile</a>}
                    <button type="button" className="text-primary underline underline-offset-2" onClick={() => setSourceDetailProfile(selectedSyncedProfile)}>View source details</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <Dialog open={Boolean(sourceDetailProfile)} onOpenChange={(open) => !open && setSourceDetailProfile(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{sourceDetailProfile?.fullName ?? "Synced Oregon profile"}</DialogTitle>
              <DialogDescription>Private source snapshot from Oregon Agent Leads.</DialogDescription>
            </DialogHeader>
            {sourceDetailProfile && <div className="space-y-3 text-sm">
              <p><strong>Rank:</strong> {syncedRankLabel(sourceDetailProfile)}{sourceDetailProfile.previousSourceRank && getRankMovement(sourceDetailProfile.previousSourceRank, sourceDetailProfile.sourceRank) ? ` · ${getRankMovement(sourceDetailProfile.previousSourceRank, sourceDetailProfile.sourceRank)}` : ""}</p>
              <p><strong>Office:</strong> {sourceDetailProfile.brokerage ?? "Not supplied"}</p>
              <p><strong>Principal broker:</strong> {typeof syncedSourceDetail(sourceDetailProfile).principalBrokerName === "string" ? syncedSourceDetail(sourceDetailProfile).principalBrokerName as string : "Not supplied"}</p>
              <p><strong>Contact:</strong> {[sourceDetailProfile.email, sourceDetailProfile.phone].filter(Boolean).join(" · ") || "Not supplied"}</p>
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">Private rank trend</p>
                  <label className="text-xs font-medium text-muted-foreground">Range
                    <select value={rankHistoryRange} onChange={(event) => setRankHistoryRange(event.target.value as RankHistoryRange)} className="ml-1 h-7 rounded border border-input bg-background px-1 text-xs text-foreground">
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="all">All snapshots</option>
                    </select>
                  </label>
                </div>
                {rankHistoryQuery.isLoading ? (
                  <p className="mt-1 text-xs text-muted-foreground">Loading source snapshots…</p>
                ) : filteredRankHistory.length ? (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {[...filteredRankHistory].reverse().map((snapshot) => (
                      <div key={snapshot.id} className="min-w-[86px] rounded border border-border bg-background px-2 py-1.5 text-center">
                        <p className="text-sm font-bold text-primary">#{snapshot.sourceRank ?? "—"}{snapshot.rankTotal ? `/${snapshot.rankTotal}` : ""}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">{new Date(snapshot.capturedAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-1 text-xs text-muted-foreground">No snapshots match this range yet.</p>}
              </div>
            </div>}
          </DialogContent>
        </Dialog>

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

type OutreachDraftPreview = {
  subject: string;
  body: string;
  mailto: string;
  recipientCount: number;
  selectedCount: number;
  skippedNoEmailCount: number;
  bcc: boolean;
};

function OregonOutreachWorkspace({ syncedProfiles }: { syncedProfiles: SyncedTopAgentRow[] }) {
  const utils = trpc.useUtils();
  const templatesQuery = trpc.agentSync.outreachTemplates.useQuery();
  const templates = templatesQuery.data ?? [];
  const [search, setSearch] = useState("");
  const [principalBrokerOnly, setPrincipalBrokerOnly] = useState(false);
  const [selectedProfileIds, setSelectedProfileIds] = useState<number[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("Oregon first-time homebuyer outreach opportunity");
  const [templateBody, setTemplateBody] = useState("I’m Mike Ford with Cornerstone First Mortgage. I’m reaching out because I’m building practical first-time homebuyer resources and would welcome a conversation about ways we may be able to support buyers in your Oregon market.");
  const [draftPreview, setDraftPreview] = useState<OutreachDraftPreview | null>(null);

  const selectableProfiles = useMemo(() => {
    const searched = filterSyncedTopAgents(syncedProfiles, search);
    return principalBrokerOnly ? searched.filter(isPrincipalBroker) : searched;
  }, [principalBrokerOnly, search, syncedProfiles]);
  const visibleEmailProfileIds = useMemo(
    () => selectableProfiles.filter((profile) => Boolean(profile.email?.trim())).map((profile) => profile.id),
    [selectableProfiles]
  );
  const selectedCount = selectedProfileIds.length;
  const selectedVisibleCount = visibleEmailProfileIds.filter((id) => selectedProfileIds.includes(id)).length;

  const createTemplate = trpc.agentSync.createOutreachTemplate.useMutation({
    onSuccess: (template) => {
      utils.agentSync.outreachTemplates.invalidate();
      setTemplateId(template.id);
      setTemplateDialogOpen(false);
      setTemplateName("");
      toast.success(`Saved “${template.name}” for Oregon outreach.`);
    },
    onError: (error) => toast.error(error.message || "Could not save the Oregon outreach template."),
  });
  const buildDraft = trpc.agentSync.buildOutreachDraft.useMutation({
    onSuccess: (draft) => {
      setDraftPreview(draft);
      if (draft.skippedNoEmailCount) {
        toast.warning(`${draft.skippedNoEmailCount} selected profile${draft.skippedNoEmailCount === 1 ? "" : "s"} had no email address and was skipped.`);
      }
    },
    onError: (error) => toast.error(error.message || "Could not create the Oregon outreach draft."),
  });

  const toggleProfile = (profileId: number) => {
    setSelectedProfileIds((current) => current.includes(profileId)
      ? current.filter((id) => id !== profileId)
      : [...current, profileId]);
  };
  const selectVisible = () => {
    setSelectedProfileIds((current) => Array.from(new Set([...current, ...visibleEmailProfileIds])));
  };
  const clearSelection = () => setSelectedProfileIds([]);
  const chooseTemplate = (value: string) => {
    if (value === "add-template") {
      setTemplateDialogOpen(true);
      return;
    }
    setTemplateId(value === "default" ? null : Number(value));
  };
  const saveTemplate = () => {
    if (!templateName.trim() || !templateSubject.trim() || !templateBody.trim()) {
      toast.error("Template name, subject, and body are all required.");
      return;
    }
    createTemplate.mutate({ name: templateName, subjectTemplate: templateSubject, bodyTemplate: templateBody });
  };
  const createDraft = () => {
    if (!selectedProfileIds.length) {
      toast.error("Select at least one Oregon agent or broker with an email address.");
      return;
    }
    buildDraft.mutate({ syncedProfileIds: selectedProfileIds, templateId });
  };
  const sourceDetail = (profile: SyncedTopAgentRow) => syncedSourceDetail(profile);

  return (
    <div className="border-b border-border bg-slate-950/[0.025] px-6 py-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="max-w-2xl">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <MailCheck className="h-4.5 w-4.5 text-primary" /> Oregon agent & broker outreach
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Select one or many private Oregon source profiles. A single recipient opens in <strong>To</strong>; multiple recipients are placed in <strong>BCC</strong> so their addresses remain private. Every draft stays editable in your email application before sending.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-primary/20 bg-background px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <span className="font-semibold text-foreground">{selectedCount} selected</span>
          <span>·</span>
          <span>{selectedCount > 1 ? "BCC draft" : "Direct draft"}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
        <div>
          <Label htmlFor="oregon-outreach-search" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Find recipients</Label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="oregon-outreach-search" value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9" placeholder="Search name, brokerage, or city" />
          </div>
        </div>
        <div>
          <Label htmlFor="oregon-outreach-template" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Template</Label>
          <select id="oregon-outreach-template" value={templateId === null ? "default" : String(templateId)} onChange={(event) => chooseTemplate(event.target.value)} className="mt-1.5 h-9 min-w-56 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="add-template">+ Add template</option>
            <option value="default">Default Oregon introduction</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </div>
        <Button className="h-9" onClick={createDraft} disabled={!selectedCount || buildDraft.isPending}>
          {buildDraft.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <MailCheck className="mr-1.5 h-4 w-4" />}
          Create email draft
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground">
          <input type="checkbox" checked={principalBrokerOnly} onChange={(event) => setPrincipalBrokerOnly(event.target.checked)} className="h-3.5 w-3.5 rounded border-input accent-primary" />
          Principal / managing brokers only
        </label>
        <Button type="button" variant="outline" size="sm" onClick={selectVisible} disabled={!visibleEmailProfileIds.length || selectedVisibleCount === visibleEmailProfileIds.length}>Select visible with email</Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearSelection} disabled={!selectedCount}>Clear selection</Button>
        <span className="text-xs text-muted-foreground">{selectableProfiles.length} matching profiles · profiles without an email cannot be selected</span>
      </div>

      <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-border bg-background">
        {selectableProfiles.length ? selectableProfiles.map((profile) => {
          const detail = sourceDetail(profile);
          const isSelected = selectedProfileIds.includes(profile.id);
          const hasEmail = Boolean(profile.email?.trim());
          const broker = isPrincipalBroker(profile);
          return (
            <label key={profile.id} className={`flex cursor-pointer items-center gap-3 border-b border-border/70 px-3 py-2.5 last:border-b-0 ${isSelected ? "bg-primary/5" : "hover:bg-muted/40"} ${hasEmail ? "" : "cursor-not-allowed opacity-60"}`}>
              <input type="checkbox" checked={isSelected} disabled={!hasEmail} onChange={() => toggleProfile(profile.id)} className="h-4 w-4 shrink-0 rounded border-input accent-primary" aria-label={`Select ${profile.fullName} for outreach`} />
              {profile.headshotUrl ? <img src={profile.headshotUrl} alt="" className="h-8 w-8 shrink-0 rounded-full border border-border object-cover" /> : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted"><UserRound className="h-4 w-4 text-muted-foreground" /></div>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {broker && <span className="mr-1.5 inline-flex rounded-sm bg-[#0b2d5c] px-1.5 py-0.5 align-middle text-[10px] font-bold text-white">PB</span>}
                  {profile.fullName} <span className="font-medium text-muted-foreground">· {syncedRankLabel(profile)}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{[profile.brokerage, broker && typeof detail.principalBrokerTitle === "string" ? detail.principalBrokerTitle : null, profile.email || "No email on file"].filter(Boolean).join(" · ")}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${hasEmail ? "bg-emerald-500/10 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{hasEmail ? "Email ready" : "No email"}</span>
            </label>
          );
        }) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">No synced Oregon profile matches the current outreach filter.</p>}
      </div>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Oregon outreach template</DialogTitle>
            <DialogDescription>Saved templates are private to this dashboard. The greeting and Mike Ford’s complete signature are added automatically when the email draft opens.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="oregon-template-name">Template name</Label>
              <Input id="oregon-template-name" className="mt-1.5" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="e.g., Principal broker introduction" maxLength={160} />
            </div>
            <div>
              <Label htmlFor="oregon-template-subject">Subject</Label>
              <Input id="oregon-template-subject" className="mt-1.5" value={templateSubject} onChange={(event) => setTemplateSubject(event.target.value)} maxLength={240} />
            </div>
            <div>
              <Label htmlFor="oregon-template-body">Email body</Label>
              <Textarea id="oregon-template-body" className="mt-1.5 min-h-44" value={templateBody} onChange={(event) => setTemplateBody(event.target.value)} maxLength={8000} />
              <p className="mt-1.5 text-xs text-muted-foreground">Optional merge tokens: <code>{"{{recipient_name}}"}</code>, <code>{"{{brokerage}}"}</code>, <code>{"{{recipient_type}}"}</code>, and <code>{"{{recipient_count}}"}</code>. For a BCC draft, recipient-specific tokens use neutral wording.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)} disabled={createTemplate.isPending}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={createTemplate.isPending}>{createTemplate.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(draftPreview)} onOpenChange={(open) => !open && setDraftPreview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{draftPreview?.bcc ? "Review BCC outreach draft" : "Review Oregon outreach draft"}</AlertDialogTitle>
            <AlertDialogDescription>
              {draftPreview?.bcc
                ? `${draftPreview.recipientCount} recipients will be added as BCC, so their email addresses remain hidden from one another.`
                : "One recipient will be added directly to the To line."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {draftPreview && <div className="max-h-52 overflow-y-auto rounded-md border border-border bg-muted/20 p-3 text-sm whitespace-pre-wrap text-foreground">Subject: {draftPreview.subject}\n\n{draftPreview.body}</div>}
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (draftPreview) window.location.href = draftPreview.mailto; setDraftPreview(null); }}>Open email draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AgentSettings() {
  const agentsQuery = trpc.agent.list.useQuery();
  const agents = agentsQuery.data ?? [];
  const syncedProfilesQuery = trpc.agentSync.list.useQuery({ state: "Oregon" });
  const syncedProfiles = (syncedProfilesQuery.data ?? []) as SyncedTopAgentRow[];
  const syncedSummary = getSyncedTopAgentSummary(syncedProfiles);
  const topAgentProfileCount = syncedProfiles.filter((profile) => syncedSourceDetail(profile).recordType !== "principal_broker").length;
  const principalBrokerProfileCount = syncedProfiles.filter(isPrincipalBroker).length;
  const reviewQueueQuery = trpc.agentSync.reviewQueue.useQuery();
  const reviewQueue = reviewQueueQuery.data ?? [];
  const pendingReviewAgentIds = new Set(reviewQueue.map((review) => review.agentId));
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
  const [lastRankMovements, setLastRankMovements] = useState<RankMovementSummary[]>([]);
  const officeRankSummary = useMemo(() => summarizeOfficeRankMovements(lastRankMovements), [lastRankMovements]);

  const utils = trpc.useUtils();
  const refreshAgents = () => {
    utils.agent.list.invalidate();
    utils.agent.getFeatured.invalidate();
    utils.agent.getBySlug.invalidate();
  };

  const [isSyncingTopAgents, setIsSyncingTopAgents] = useState(false);
  const syncTopAgents = async () => {
    setIsSyncingTopAgents(true);
    try {
      let rawSession: string | null = null;
      try {
        rawSession = typeof window === "undefined" ? null : sessionStorage.getItem("manus-cookie");
      } catch {
        // Browser privacy controls can deny sessionStorage. The signed-in
        // same-origin cookie remains sufficient for this protected request.
      }
      const response = await fetch("/api/oregon-sync-refresh", {
        method: "POST",
        credentials: "include",
        headers: buildTrpcRequestHeaders(rawSession),
      });
      const responseType = response.headers.get("content-type") || "unknown response type";
      const payload = await response.json().catch(() => null) as { refreshed?: boolean; error?: string } | null;
      if (!response.ok || !payload?.refreshed) {
        throw new Error(payload?.error || `Oregon agent sync returned ${response.status} (${responseType}).`);
      }
      syncedProfilesQuery.refetch();
      reviewQueueQuery.refetch();
      setLastRankMovements([]);
      toast.success("Oregon source profiles refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Oregon agent sync could not be completed.");
    } finally {
      setIsSyncingTopAgents(false);
    }
  };

  const resolveReview = trpc.agentSync.resolveReview.useMutation({
    onSuccess: (result) => {
      reviewQueueQuery.refetch();
      syncedProfilesQuery.refetch();
      refreshAgents();
      toast.success(result.decision === "approved" ? "Source update applied to the partner profile." : "Source update rejected; the partner profile was left unchanged.");
    },
    onError: (err) => toast.error(err.message || "Could not resolve this source update."),
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
            <Button size="sm" variant="outline" onClick={syncTopAgents} disabled={isSyncingTopAgents}>
              {isSyncingTopAgents ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Sync Top Agents
            </Button>
          </div>
          <div className="text-right text-[11px] leading-tight text-muted-foreground">
            <p><strong className="font-semibold text-foreground">{syncedSummary.count}</strong> imported</p>
            <p>{topAgentProfileCount} top agent{topAgentProfileCount === 1 ? "" : "s"} · {principalBrokerProfileCount} PB{principalBrokerProfileCount === 1 ? "" : "s"}</p>
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
        <strong className="font-semibold text-foreground">Oregon sync:</strong> {topAgentProfileCount} top agent{topAgentProfileCount === 1 ? "" : "s"} and {principalBrokerProfileCount} principal broker{principalBrokerProfileCount === 1 ? "" : "s"} available for private prefill. Synced information stays inside this owner dashboard until you create a partner.
      </div>

      <OregonOutreachWorkspace syncedProfiles={syncedProfiles} />

      {lastRankMovements.length > 0 && (
        <div className="border-b border-sky-500/25 bg-sky-500/5 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><TrendingUp className="h-4 w-4 text-sky-700" /> Latest Oregon rank changes</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Private summary from the most recent completed sync.</p>
            </div>
            <span className="rounded-full border border-sky-600/25 bg-background px-2 py-0.5 text-xs font-semibold text-sky-800">{lastRankMovements.length} changed</span>
          </div>
          <div className="mt-2 max-h-36 overflow-y-auto rounded-md border border-sky-500/20 bg-background px-3 py-2 text-xs">
            {lastRankMovements.map((movement) => (
              <p key={`${movement.fullName}-${movement.fromRank}-${movement.toRank}`} className={`flex items-center gap-1 py-0.5 ${movement.toRank < movement.fromRank ? "text-emerald-700" : "text-red-700"}`}>
                {movement.toRank < movement.fromRank ? <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-label="Rank improved" /> : <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-label="Rank dropped" />}
                <strong>{movement.fullName}</strong> — {formatRankMovement(movement.fromRank, movement.toRank, movement.rankTotal)}
              </p>
            ))}
          </div>
          {officeRankSummary.length > 0 && <div className="mt-3 rounded-md border border-sky-500/20 bg-background p-3">
            <p className="text-xs font-semibold text-foreground">Office movement summary</p>
            <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
              {officeRankSummary.map((office) => <p key={office.office} className="text-muted-foreground"><strong className="text-foreground">{office.office}</strong> — {office.improved} up, {office.dropped} down, net {office.netPositions >= 0 ? "+" : ""}{office.netPositions}</p>)}
            </div>
          </div>}
        </div>
      )}

      {reviewQueue.length > 0 && (
        <div className="border-b border-amber-500/30 bg-amber-500/5 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><AlertTriangle className="h-4 w-4 text-amber-700" /> Synced profile review queue</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Approve to apply the latest authorized source fields to an existing partner, or reject to keep the current partner profile unchanged.</p>
            </div>
            <span className="rounded-full border border-amber-600/30 bg-background px-2 py-0.5 text-xs font-semibold text-amber-800">{reviewQueue.length} pending</span>
          </div>
          <div className="mt-3 grid gap-2">
            {reviewQueue.map((review) => {
              let changedFields: string[] = [];
              try { changedFields = JSON.parse(review.changedFields) as string[]; } catch { changedFields = ["source profile"]; }
              return <div key={review.id} className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/25 bg-background p-3">
                {review.headshotUrl ? <img src={review.headshotUrl} alt="" className="h-9 w-9 rounded-full border border-border object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><UserRound className="h-4 w-4 text-muted-foreground" /></div>}
                <div className="min-w-[180px] flex-1">
                  <p className="text-sm font-semibold text-foreground">{review.agentName}</p>
                  <p className="text-xs text-muted-foreground">Latest source: {review.fullName}{review.brokerage ? ` · ${review.brokerage}` : ""}</p>
                  <p className="mt-1 text-xs text-amber-800">Changed: {changedFields.join(", ") || "source profile"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => resolveReview.mutate({ id: review.id, decision: "approved" })} disabled={resolveReview.isPending}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => resolveReview.mutate({ id: review.id, decision: "rejected" })} disabled={resolveReview.isPending}>Reject</Button>
                </div>
              </div>;
            })}
          </div>
        </div>
      )}

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
                  {pendingReviewAgentIds.has(agent.id) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800" title="A synced source-profile update is awaiting your review">
                      <RefreshCw className="h-3 w-3" aria-hidden="true" /> Source update ready
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
