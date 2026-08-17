import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, Copy, Download, ExternalLink, Layers3, Link2, Loader2, Mail, MapPin, Plus, RefreshCw, SearchCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
import {
  buildListingAgentOutreachDraft,
  buildListingEmailDraft,
  type ListingEmailRow,
  type PropertyEmailTemplateKey,
} from "@shared/leadEmailDraft";
import { OVERLAY_LABELS, type GeoSphereOverlayKey } from "@shared/geosphere";
import { buildGeoSphereInventoryCsv, filterAndSortGeoSphereListings, type GeoSphereInventorySort } from "@shared/geosphereInventory";
import { filterByImportedListingAgent, getImportedListingAgentOptions, parseImportedListingAgent } from "@shared/geosphereListingAgents";
import { filterPropertyListRecipients, formatRecipientLastFirst, type PropertyListRecipientFilter } from "@shared/geosphereRecipients";
import { buildPropertyPageAgentDraft } from "@shared/propertyPageEmailDraft";
import { parsePropertyLandingSnapshot } from "@shared/propertyLandingPage";
import { publicSiteUrl } from "@shared/publicSiteUrl";

const OVERLAYS: GeoSphereOverlayKey[] = ["all", "lmi", "usda", "lmiUsda"];

const usd = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const ALL_LISTING_AGENTS = "__all_listing_agents__";
const ALL_SELECTED_AGENT_EMAILS = "__all_selected_agents_bcc__";
const ADD_CUSTOM_TEMPLATE = "__add_custom_email_template__";
const ADD_CUSTOM_PROPERTY_EMAIL_TEMPLATE = "__add_custom_property_email_template__";
const ADD_CUSTOM_PROPERTY_PAGE_TEMPLATE = "__add_custom_property_page_template__";
const PROPERTY_EMAIL_TEMPLATES: Array<{ value: PropertyEmailTemplateKey; label: string }> = [
  { value: "property_shortlist_with_agent_follow_up", label: "Property shortlist with agent follow-up" },
  { value: "short_property_update", label: "Short property update" },
  { value: "usda_rd_focused_list", label: "USDA RD-focused list" },
  { value: "ohcs_flex_lending_focused_list", label: "OHCS Flex Lending-focused list" },
];

type BulkOutreachPreview = {
  mailto: string;
  listingIds: number[];
  agents: Array<{ name: string; email: string }>;
  listings: Array<{ id: number; address: string }>;
};

const PROPERTY_ACTIVITY_LABELS: Record<string, string> = {
  page_view: "Page viewed",
  buydown_calculator: "2-1 buydown explored",
  cost_of_waiting_calculator: "Cost of waiting explored",
  roadmap_request: "Roadmap requested",
  chat_started: "Mortgage chat started",
  chat_completed: "Mortgage chat completed",
  homes_list_request: "Homes-list request",
  buyer_agent_request: "Buyer-agent request",
  social_share: "Shared property page",
  print_export: "Print / PDF export",
};

function PropertyPageTimeline({ propertyLandingPageId }: { propertyLandingPageId: number }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "page" | "calculator" | "lead" | "distribution">("all");
  const activityQuery = trpc.propertyPages.activity.useQuery({ propertyLandingPageId }, { enabled: open });
  const activity = (activityQuery.data ?? []).filter((event) => {
    if (filter === "all") return true;
    if (filter === "page") return event.eventType === "page_view";
    if (filter === "calculator") return event.eventType === "buydown_calculator" || event.eventType === "cost_of_waiting_calculator";
    if (filter === "lead") return ["roadmap_request", "chat_started", "chat_completed", "homes_list_request", "buyer_agent_request"].includes(event.eventType);
    return event.eventType === "social_share" || event.eventType === "print_export";
  });
  return <div className="mt-4 border-t border-border pt-4">
    <button type="button" className="flex w-full items-center justify-between text-left text-sm font-medium text-primary" onClick={() => setOpen((value) => !value)}>
      <span className="flex items-center gap-1.5"><Activity className="h-4 w-4" />Activity timeline</span><span>{open ? "Hide" : "Show"}</span>
    </button>
    {open && <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
      <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><SelectTrigger className="h-8 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All activity</SelectItem><SelectItem value="page">Page visits</SelectItem><SelectItem value="calculator">Calculator usage</SelectItem><SelectItem value="lead">Lead milestones</SelectItem><SelectItem value="distribution">Sharing & PDF export</SelectItem></SelectContent></Select>
      {activityQuery.isLoading ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading activity…</div> : activity.length ? activity.map((event) => <div key={event.id} className="flex items-start justify-between gap-3 text-xs"><span className="font-medium text-foreground">{PROPERTY_ACTIVITY_LABELS[event.eventType] ?? event.eventType}{event.detail ? ` · ${event.detail}` : ""}</span><span className="shrink-0 text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span></div>) : <p className="text-xs text-muted-foreground">No matching activity has been recorded yet.</p>}
    </div>}
  </div>;
}

function PropertyPageAiSummaryEditor({ page }: { page: { id: number; aiSummary: string | null } }) {
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState(page.aiSummary ?? "");
  const [tone, setTone] = useState<"professional" | "exciting">("professional");
  const generate = trpc.propertyPages.generateAiSummary.useMutation({
    onSuccess: (result) => { setDraft(result.summary); toast.success("AI draft generated. Review it before saving it to the public page."); },
    onError: (error) => toast.error(error.message || "The AI draft could not be generated."),
  });
  const save = trpc.propertyPages.saveAiSummary.useMutation({
    onSuccess: async () => { await utils.propertyPages.list.invalidate(); toast.success(draft.trim() ? "Reviewed property highlights saved to the public page." : "Public property highlights removed."); },
    onError: (error) => toast.error(error.message || "The property highlights could not be saved."),
  });
  return <div className="mt-4 border-t border-border pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" />AI property highlights</p><div className="flex items-center gap-2"><Select value={tone} onValueChange={(value) => setTone(value as typeof tone)}><SelectTrigger className="h-8 w-28 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="professional">Professional</SelectItem><SelectItem value="exciting">Exciting</SelectItem></SelectContent></Select><Button size="sm" variant="outline" disabled={generate.isPending} onClick={() => generate.mutate({ id: page.id, tone })}>{generate.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}Generate draft</Button></div></div>
    <p className="mt-1 text-xs text-muted-foreground">Generated only from the saved imported snapshot. Review and edit before publishing to the public property page.</p>
    <Textarea className="mt-3 min-h-24 text-sm" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Generate a snapshot-based draft, then review it here." />
    <div className="mt-2 flex gap-2"><Button size="sm" disabled={save.isPending} onClick={() => save.mutate({ id: page.id, summary: draft.trim() || null })}>Save reviewed summary</Button>{page.aiSummary && <Button size="sm" variant="ghost" disabled={save.isPending} onClick={() => { setDraft(""); save.mutate({ id: page.id, summary: null }); }}>Remove from page</Button>}</div>
  </div>;
}

function getListingDetails(raw: string) {
  try {
    const source = JSON.parse(raw) as Record<string, unknown>;
    const agent = source.listingAgent as Record<string, unknown> | undefined;
    return [
      ["MLS", source.mlsNumber],
      ["MLS source", source.mlsName],
      ["Year built", source.yearBuilt],
      ["Days on market", source.daysOnMarket],
      ["Listing agent", agent?.name],
      ["Agent phone", agent?.phone],
      ["Agent email", agent?.email],
      ["Listing URL", source.zillowUrl ?? source.zillow_url ?? source.url],
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "") as Array<[string, unknown]>;
  } catch {
    return [];
  }
}

function getZillowListingUrl(raw: string) {
  try {
    const source = JSON.parse(raw) as Record<string, unknown>;
    const candidates = [source.zillowUrl, source.zillow_url, source.url];
    return candidates.find((candidate): candidate is string => typeof candidate === "string" && /^https?:\/\/(?:www\.)?zillow\.com\//i.test(candidate.trim()))?.trim();
  } catch {
    return undefined;
  }
}

function ListingDetails({ sourceData, address }: { sourceData: string; address: string }) {
  const details = getListingDetails(sourceData);
  if (!details.length) return <span className="text-xs text-muted-foreground">Imported source details unavailable</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-xs font-semibold text-primary hover:underline">
          Details
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-card text-card-foreground">
        <p className="font-semibold text-sm text-foreground">{address}</p>
        <dl className="mt-3 space-y-2 text-xs">
          {details.map(([label, value]) => {
            const isUrl = label === "Listing URL" && typeof value === "string" && /^https?:\/\//.test(value);
            return (
              <div key={label} className="flex gap-3 justify-between">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium text-foreground max-w-[190px] break-words">
                  {isUrl ? (
                    <a href={String(value)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : String(value)}
                </dd>
              </div>
            );
          })}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function ListingCommunicationStatus({
  lastEmailSentAt,
  emailResendCount,
  lastEmailTemplateName,
}: {
  lastEmailSentAt: Date | string | null;
  emailResendCount: number;
  lastEmailTemplateName: string | null;
}) {
  if (!lastEmailSentAt) {
    return <div className="min-w-44 text-xs"><span className="rounded-full bg-muted px-2 py-1 font-semibold text-muted-foreground">No email sent</span><p className="mt-2 text-muted-foreground">No outreach logged yet</p></div>;
  }
  const mostRecentWasResend = emailResendCount > 0;
  return (
    <div className="min-w-52 space-y-1 text-xs leading-snug">
      <span className="inline-flex rounded-full bg-emerald-600/15 px-2 py-1 font-bold text-emerald-800">Email sent</span>
      <p className="text-foreground"><span className="font-semibold">Most recent:</span> {new Date(lastEmailSentAt).toLocaleString()}</p>
      <p className={mostRecentWasResend ? "font-semibold text-amber-800" : "font-semibold text-primary"}>{mostRecentWasResend ? "Most recent email: resend" : "Most recent email: original"}</p>
      {mostRecentWasResend ? <p className="text-muted-foreground">Total resends: {emailResendCount}</p> : null}
      <p className="break-words text-muted-foreground"><span className="font-semibold text-foreground">Template:</span> {lastEmailTemplateName || "General buyer-attraction outreach"}</p>
    </div>
  );
}

export default function GeoSphereListings() {
  const utils = trpc.useUtils();
  const [selectedPullId, setSelectedPullId] = useState<string>("");
  const [overlay, setOverlay] = useState<GeoSphereOverlayKey>("all");
  const [selectedRecipientValues, setSelectedRecipientValues] = useState<Set<string>>(() => new Set());
  const [recipientLastNameSearch, setRecipientLastNameSearch] = useState("");
  const [recipientSourceFilter, setRecipientSourceFilter] = useState<PropertyListRecipientFilter>("all");
  const [propertyEmailTemplate, setPropertyEmailTemplate] = useState<string>("property_shortlist_with_agent_follow_up");
  const [customPropertyTemplateOpen, setCustomPropertyTemplateOpen] = useState(false);
  const [customPropertyTemplateName, setCustomPropertyTemplateName] = useState("");
  const [customPropertyTemplateBody, setCustomPropertyTemplateBody] = useState("");
  const [listingSearch, setListingSearch] = useState("");
  const [listingSort, setListingSort] = useState<GeoSphereInventorySort>("address");
  const [listingAgentKey, setListingAgentKey] = useState(ALL_LISTING_AGENTS);
  const [selectedListingIds, setSelectedListingIds] = useState<Set<number>>(() => new Set());
  const [selectedAgentEmail, setSelectedAgentEmail] = useState("");
  const [selectedOutreachTemplateId, setSelectedOutreachTemplateId] = useState("");
  const [bulkOutreachPreview, setBulkOutreachPreview] = useState<BulkOutreachPreview | null>(null);
  const [customTemplateOpen, setCustomTemplateOpen] = useState(false);
  const [customTemplateName, setCustomTemplateName] = useState("");
  const [customTemplateBody, setCustomTemplateBody] = useState("");
  const [propertyPageBuilderOpen, setPropertyPageBuilderOpen] = useState(false);
  const [propertyPageListingId, setPropertyPageListingId] = useState<number | null>(null);
  const [propertyPageLoanOfficerId, setPropertyPageLoanOfficerId] = useState("");
  const [propertyPageAgentId, setPropertyPageAgentId] = useState("");
  const [propertyPageTemplateId, setPropertyPageTemplateId] = useState("");
  const [customPropertyPageTemplateOpen, setCustomPropertyPageTemplateOpen] = useState(false);
  const [customPropertyPageTemplateName, setCustomPropertyPageTemplateName] = useState("");
  const [customPropertyPageTemplateBody, setCustomPropertyPageTemplateBody] = useState("");
  const [propertyPagePairDrafts, setPropertyPagePairDrafts] = useState<Record<number, { loanOfficerId: string; agentId: string }>>({});

  const statusQuery = trpc.geosphere.status.useQuery();
  const pullsQuery = trpc.geosphere.listPulls.useQuery();
  const leadsQuery = trpc.leads.list.useQuery();
  const chatsQuery = trpc.chat.list.useQuery();
  const outreachTemplatesQuery = trpc.geosphere.listListingAgentEmailTemplates.useQuery();
  const propertyTemplatesQuery = trpc.geosphere.listPropertyEmailTemplates.useQuery();
  const propertyPagesQuery = trpc.propertyPages.list.useQuery();
  const propertyPageTemplatesQuery = trpc.propertyPages.listAgentEmailTemplates.useQuery();
  const officersQuery = trpc.loanOfficer.list.useQuery();
  const agentsQuery = trpc.agent.list.useQuery();
  const selectedPull = useMemo(
    () => (pullsQuery.data ?? []).find((pull) => String(pull.id) === selectedPullId) ?? null,
    [pullsQuery.data, selectedPullId]
  );
  const listingsQuery = trpc.geosphere.listListings.useQuery(
    { savedPullId: Number(selectedPullId), overlay },
    { enabled: Boolean(selectedPullId) }
  );
  const allListingsQuery = trpc.geosphere.listListings.useQuery(
    { savedPullId: Number(selectedPullId), overlay: "all" },
    { enabled: Boolean(selectedPullId) && overlay !== "all" }
  );

  useEffect(() => {
    if (!selectedPullId && pullsQuery.data?.[0]) setSelectedPullId(String(pullsQuery.data[0].id));
  }, [pullsQuery.data, selectedPullId]);

  const recipients = useMemo(() => {
    const roadmap = (leadsQuery.data ?? []).map((lead) => ({
      value: `roadmap:${lead.id}`,
      name: lead.firstName,
      email: lead.email,
      source: "Roadmap" as const,
    }));
    const intakes = (chatsQuery.data ?? [])
      .filter((lead) => lead.status === "qualified" && Boolean(lead.fullName && lead.email))
      .map((lead) => ({
        value: `chat:${lead.id}`,
        name: lead.fullName!,
        email: lead.email!,
      source: "Chat Intake" as const,
      }));
    return [...roadmap, ...intakes];
  }, [leadsQuery.data, chatsQuery.data]);
  const visibleRecipients = useMemo(
    () => filterPropertyListRecipients(recipients, recipientLastNameSearch, recipientSourceFilter),
    [recipientLastNameSearch, recipientSourceFilter, recipients]
  );

  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedRecipientValues.has(recipient.value)),
    [recipients, selectedRecipientValues]
  );

  useEffect(() => {
    setSelectedRecipientValues((current) => {
      const currentValues = Array.from(current);
      const valid = new Set(recipients.map((recipient) => recipient.value));
      const next = new Set(currentValues.filter((value) => valid.has(value)));
      return next.size === current.size ? current : next;
    });
  }, [recipients]);

  const syncNow = trpc.geosphere.syncNow.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.geosphere.status.invalidate(),
        utils.geosphere.listPulls.invalidate(),
        utils.geosphere.listListings.invalidate(),
      ]);
      toast.success(`Imported ${result.pullCount} saved pull${result.pullCount === 1 ? "" : "s"} and ${result.listingCount} listings.`);
    },
    onError: (error) => toast.error(error.message || "GeoSphere sync could not complete."),
  });
  const saveOutreachTemplate = trpc.geosphere.saveListingAgentEmailTemplate.useMutation({
    onSuccess: async (template) => {
      await utils.geosphere.listListingAgentEmailTemplates.invalidate();
      setSelectedOutreachTemplateId(String(template.id));
      setCustomTemplateOpen(false);
      setCustomTemplateName("");
      setCustomTemplateBody("");
      toast.success(`${template.name} is now available in the email-template menu.`);
    },
    onError: (error) => toast.error(error.message || "The custom email template could not be saved."),
  });
  const savePropertyEmailTemplate = trpc.geosphere.savePropertyEmailTemplate.useMutation({
    onSuccess: async (template) => {
      await utils.geosphere.listPropertyEmailTemplates.invalidate();
      setPropertyEmailTemplate(`custom:${template.id}`);
      setCustomPropertyTemplateOpen(false);
      setCustomPropertyTemplateName("");
      setCustomPropertyTemplateBody("");
      toast.success(`${template.name} is now available in the property-email template menu.`);
    },
    onError: (error) => toast.error(error.message || "The custom property email template could not be saved."),
  });
  const recordListingEmailActivity = trpc.geosphere.recordListingEmailActivity.useMutation({
    onError: (error) => toast.error(error.message || "The email draft opened, but communication activity could not be recorded."),
  });
  const createPropertyPage = trpc.propertyPages.createFromListing.useMutation({
    onSuccess: async (page) => {
      await utils.propertyPages.list.invalidate();
      setPropertyPageBuilderOpen(false);
      setPropertyPageListingId(null);
      toast.success(`Saved co-branded property page: ${page.address}`);
    },
    onError: (error) => toast.error(error.message || "The property page could not be saved."),
  });
  const updatePropertyPagePair = trpc.propertyPages.updatePair.useMutation({
    onSuccess: async () => {
      await utils.propertyPages.list.invalidate();
      toast.success("Property-page co-brand pairing saved.");
    },
    onError: (error) => toast.error(error.message || "The property-page pairing could not be saved."),
  });
  const setPropertyPageActive = trpc.propertyPages.setActive.useMutation({
    onSuccess: async (page) => {
      await utils.propertyPages.list.invalidate();
      toast.success(page.isActive === 1 ? "Property page restored." : "Property page retired. Its public URL is now unavailable.");
    },
    onError: (error) => toast.error(error.message || "The property-page status could not be updated."),
  });
  const refreshPropertyPageSnapshot = trpc.propertyPages.refreshSnapshot.useMutation({
    onSuccess: async (page) => {
      await utils.propertyPages.list.invalidate();
      toast.success(`Property page refreshed from the saved snapshot: ${page.address}`);
    },
    onError: (error) => toast.error(error.message || "The saved property snapshot could not be refreshed."),
  });
  const savePropertyPageTemplate = trpc.propertyPages.saveAgentEmailTemplate.useMutation({
    onSuccess: async (template) => {
      await utils.propertyPages.listAgentEmailTemplates.invalidate();
      setPropertyPageTemplateId(String(template.id));
      setCustomPropertyPageTemplateOpen(false);
      setCustomPropertyPageTemplateName("");
      setCustomPropertyPageTemplateBody("");
      toast.success(`${template.name} is now available for property-page agent drafts.`);
    },
    onError: (error) => toast.error(error.message || "The property-page email template could not be saved."),
  });

  const openListingDraft = () => {
    const listings = visibleListings;
    if (!selectedRecipients.length) {
      toast.error("Select one or more Roadmap or completed Mortgage Intake Specialist leads first.");
      return;
    }
    if (!selectedPull || !listings.length) {
      toast.error("Choose a saved pull with at least one listing first.");
      return;
    }
    const rows: ListingEmailRow[] = listings.map((listing) => ({
      ...(() => {
        const agent = parseImportedListingAgent(listing.sourceData);
        return {
          listingAgentName: agent?.name,
          listingAgentEmail: agent?.email,
          listingAgentPhone: agent?.phone,
          zillowUrl: getZillowListingUrl(listing.sourceData),
        };
      })(),
      address: listing.address,
      price: listing.price,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      squareFootage: listing.squareFootage,
      propertyType: listing.propertyType,
      isLmi: listing.isLmi === 1,
      isUsda: listing.isUsda === 1,
    }));
    const draft = buildListingEmailDraft({
      firstName: selectedRecipients.length === 1 ? selectedRecipients[0]!.name : "there",
      email: selectedRecipients[0]!.email,
      recipientEmails: selectedRecipients.map((recipient) => recipient.email),
      areaLabel: selectedPull.areaLabel,
      overlayLabel: OVERLAY_LABELS[overlay],
      listings: rows,
      template: PROPERTY_EMAIL_TEMPLATES.some((template) => template.value === propertyEmailTemplate)
        ? propertyEmailTemplate as PropertyEmailTemplateKey
        : undefined,
      customBodyTemplate: selectedCustomPropertyEmailTemplate?.bodyTemplate,
      customTemplateName: selectedCustomPropertyEmailTemplate?.name,
    });
    window.location.href = draft.mailto;
    toast.success(`Property-list email draft opened for ${selectedRecipients.length} ${selectedRecipients.length === 1 ? "lead" : "leads"}${selectedRecipients.length > 1 ? " using BCC to protect recipient privacy" : ""}.`);
  };

  const toggleRecipientSelection = (value: string) => {
    setSelectedRecipientValues((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const visibleRecipientsSelected = visibleRecipients.length > 0 && visibleRecipients.every((recipient) => selectedRecipientValues.has(recipient.value));
  const toggleVisibleRecipientSelection = () => {
    setSelectedRecipientValues((current) => {
      const next = new Set(current);
      if (visibleRecipientsSelected) visibleRecipients.forEach((recipient) => next.delete(recipient.value));
      else visibleRecipients.forEach((recipient) => next.add(recipient.value));
      return next;
    });
  };

  const lastSynced = statusQuery.data?.lastSyncedAt ? new Date(statusQuery.data.lastSyncedAt).toLocaleString() : "Not synced yet";
  const listings = listingsQuery.data ?? [];
  const allSnapshotListings = overlay === "all" ? listings : allListingsQuery.data ?? [];
  const listingAgentOptions = useMemo(() => getImportedListingAgentOptions(allSnapshotListings), [allSnapshotListings]);
  const searchedListings = useMemo(
    () => filterAndSortGeoSphereListings(listings, listingSearch, listingSort),
    [listings, listingSearch, listingSort]
  );
  const visibleListings = useMemo(
    () => listingAgentKey === ALL_LISTING_AGENTS ? searchedListings : filterByImportedListingAgent(searchedListings, listingAgentKey),
    [listingAgentKey, searchedListings]
  );
  const hasInventoryFilters = Boolean(listingSearch.trim()) || listingSort !== "address" || overlay !== "all" || listingAgentKey !== ALL_LISTING_AGENTS;
  const visibleListingAgents = useMemo(
    () => new Map(visibleListings.map((listing) => [listing.id, parseImportedListingAgent(listing.sourceData)])),
    [visibleListings]
  );
  const selectedAgentGroups = useMemo(() => {
    const groups = new Map<string, { name: string; email: string; listings: Array<(typeof visibleListings)[number]> }>();
    visibleListings.forEach((listing) => {
      if (!selectedListingIds.has(listing.id)) return;
      const agent = visibleListingAgents.get(listing.id);
      if (!agent) return;
      const group = groups.get(agent.email) ?? { ...agent, listings: [] };
      group.listings.push(listing);
      groups.set(agent.email, group);
    });
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedListingIds, visibleListingAgents, visibleListings]);
  const officers = officersQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const propertyPages = propertyPagesQuery.data ?? [];
  const selectedPropertyPageTemplate = useMemo(
    () => (propertyPageTemplatesQuery.data ?? []).find((template) => String(template.id) === propertyPageTemplateId),
    [propertyPageTemplateId, propertyPageTemplatesQuery.data]
  );
  const propertyPageListing = useMemo(
    () => (listingsQuery.data ?? []).find((listing) => listing.id === propertyPageListingId) ?? null,
    [listingsQuery.data, propertyPageListingId]
  );
  const openPropertyPageBuilder = (listingId: number) => {
    setPropertyPageListingId(listingId);
    setPropertyPageLoanOfficerId(officers[0] ? String(officers[0].id) : "");
    setPropertyPageAgentId(agents[0] ? String(agents[0].id) : "");
    setPropertyPageBuilderOpen(true);
  };
  const submitPropertyPage = () => {
    if (!propertyPageListingId || !propertyPageLoanOfficerId || !propertyPageAgentId) {
      toast.error("Choose a saved listing, loan officer, and co-branded agent first.");
      return;
    }
    createPropertyPage.mutate({
      geosphereListingId: propertyPageListingId,
      loanOfficerId: Number(propertyPageLoanOfficerId),
      agentId: Number(propertyPageAgentId),
    });
  };
  const savePropertyPagePair = (pageId: number, page: typeof propertyPages[number]) => {
    const draft = propertyPagePairDrafts[pageId] ?? { loanOfficerId: String(page.loanOfficerId ?? ""), agentId: String(page.agentId ?? "") };
    if (!draft.loanOfficerId || !draft.agentId) {
      toast.error("Choose both a loan officer and an agent for this co-branded page.");
      return;
    }
    updatePropertyPagePair.mutate({ id: pageId, loanOfficerId: Number(draft.loanOfficerId), agentId: Number(draft.agentId) });
  };
  const openPropertyPageAgentDraft = (page: typeof propertyPages[number]) => {
    const snapshot = parsePropertyLandingSnapshot(page.listingSnapshot);
    const officer = officers.find((candidate) => candidate.id === page.loanOfficerId);
    if (!snapshot || !snapshot.listingAgent?.email) {
      toast.error("This saved property snapshot does not include a listing-agent email.");
      return;
    }
    if (!officer) {
      toast.error("Assign a valid loan officer before opening this listing-agent draft.");
      return;
    }
    const draft = buildPropertyPageAgentDraft({
      templateBody: selectedPropertyPageTemplate?.bodyTemplate,
      propertyUrl: publicSiteUrl(`/property/${page.slug}`),
      snapshot,
      listingAgentName: snapshot.listingAgent.name,
      listingAgentEmail: snapshot.listingAgent.email,
      loanOfficer: officer,
    });
    window.location.href = draft;
    toast.success("Property-page listing-agent draft opened with the saved property URL.");
  };
  const selectPropertyPageTemplate = (value: string) => {
    if (value === ADD_CUSTOM_PROPERTY_PAGE_TEMPLATE) {
      setCustomPropertyPageTemplateOpen(true);
      return;
    }
    setPropertyPageTemplateId(value);
  };
  const selectedOutreachTemplate = useMemo(
    () => (outreachTemplatesQuery.data ?? []).find((template) => String(template.id) === selectedOutreachTemplateId) ?? null,
    [outreachTemplatesQuery.data, selectedOutreachTemplateId]
  );
  const selectedCustomPropertyEmailTemplate = useMemo(
    () => (propertyTemplatesQuery.data ?? []).find((template) => `custom:${template.id}` === propertyEmailTemplate) ?? null,
    [propertyEmailTemplate, propertyTemplatesQuery.data]
  );

  useEffect(() => {
    setSelectedListingIds((current) => {
      const visibleIds = new Set(visibleListings.map((listing) => listing.id));
      const next = new Set(Array.from(current).filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleListings]);

  useEffect(() => {
    if (!selectedAgentGroups.length) {
      if (selectedAgentEmail) setSelectedAgentEmail("");
      return;
    }
    if (!selectedAgentEmail || (selectedAgentEmail !== ALL_SELECTED_AGENT_EMAILS && !selectedAgentGroups.some((group) => group.email === selectedAgentEmail))) {
      setSelectedAgentEmail(ALL_SELECTED_AGENT_EMAILS);
    }
  }, [selectedAgentEmail, selectedAgentGroups]);

  const clearInventoryFilters = () => {
    setListingSearch("");
    setListingSort("address");
    setOverlay("all");
    setListingAgentKey(ALL_LISTING_AGENTS);
  };

  const toggleListingSelection = (listingId: number) => {
    setSelectedListingIds((current) => {
      const next = new Set(current);
      if (next.has(listingId)) next.delete(listingId);
      else next.add(listingId);
      return next;
    });
  };

  const selectableVisibleListingIds = useMemo(
    () => visibleListings.filter((listing) => Boolean(visibleListingAgents.get(listing.id)?.email)).map((listing) => listing.id),
    [visibleListingAgents, visibleListings]
  );
  const allSelectableVisibleListingsSelected = selectableVisibleListingIds.length > 0 && selectableVisibleListingIds.every((id) => selectedListingIds.has(id));

  const toggleSelectAllVisibleListings = () => {
    setSelectedListingIds((current) => {
      const next = new Set(current);
      if (allSelectableVisibleListingsSelected) selectableVisibleListingIds.forEach((id) => next.delete(id));
      else selectableVisibleListingIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const selectOutreachTemplate = (value: string) => {
    if (value === ADD_CUSTOM_TEMPLATE) {
      setCustomTemplateOpen(true);
      return;
    }
    setSelectedOutreachTemplateId(value);
  };

  const saveCustomTemplate = () => {
    const name = customTemplateName.trim();
    const bodyTemplate = customTemplateBody.trim();
    if (!name) {
      toast.error("Enter a name for the reusable email template.");
      return;
    }
    if (bodyTemplate.length < 20) {
      toast.error("Write at least 20 characters for the custom email body.");
      return;
    }
    saveOutreachTemplate.mutate({ name, bodyTemplate });
  };

  const selectPropertyEmailTemplate = (value: string) => {
    if (value === ADD_CUSTOM_PROPERTY_EMAIL_TEMPLATE) {
      setCustomPropertyTemplateOpen(true);
      return;
    }
    setPropertyEmailTemplate(value);
  };

  const saveCustomPropertyTemplate = () => {
    const name = customPropertyTemplateName.trim();
    const bodyTemplate = customPropertyTemplateBody.trim();
    if (!name) {
      toast.error("Enter a name for the reusable property email template.");
      return;
    }
    if (bodyTemplate.length < 20) {
      toast.error("Write at least 20 characters for the property email body.");
      return;
    }
    savePropertyEmailTemplate.mutate({ name, bodyTemplate });
  };

  const recordAndOpenListingAgentDraft = (input: { listingIds: number[]; mailto: string; agentName: string }) => {
    const templateName = selectedOutreachTemplate?.name ?? "General buyer-attraction outreach";
    recordListingEmailActivity.mutate(
      { listingIds: input.listingIds, templateName },
      {
        onSuccess: async (activities) => {
          await utils.geosphere.listListings.invalidate();
          window.location.href = input.mailto;
          const resendCount = activities.filter((activity) => activity.wasResend).length;
          toast.success(`Email draft opened for ${input.agentName}. ${resendCount ? "This outreach is recorded as a resend." : "This outreach is recorded as the original email."} Send it from your email app to complete delivery.`);
        },
      }
    );
  };

  const openSingleListingAgentDraft = (listing: (typeof visibleListings)[number]) => {
    const agent = visibleListingAgents.get(listing.id);
    if (!agent || !selectedPull) {
      toast.error("A listing-agent email is not available for this property.");
      return;
    }
    const draft = buildListingAgentOutreachDraft({
      agentName: agent.name,
      agentEmail: agent.email,
      areaLabel: selectedPull.areaLabel,
      bodyTemplate: selectedOutreachTemplate?.bodyTemplate,
      listings: [{
        address: listing.address,
        price: listing.price,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        squareFootage: listing.squareFootage,
        propertyType: listing.propertyType,
        isLmi: listing.isLmi === 1,
        isUsda: listing.isUsda === 1,
      }],
    });
    recordAndOpenListingAgentDraft({ listingIds: [listing.id], mailto: draft.mailto, agentName: agent.name });
  };

  const openListingAgentDraft = () => {
    const selectedGroups = selectedAgentEmail === ALL_SELECTED_AGENT_EMAILS
      ? selectedAgentGroups
      : selectedAgentGroups.filter((group) => group.email === selectedAgentEmail);
    if (!selectedGroups.length || !selectedPull) {
      toast.error("Select at least one listing with a listing-agent email first.");
      return;
    }
    const isBulkBcc = selectedAgentEmail === ALL_SELECTED_AGENT_EMAILS;
    const selectedListings = selectedGroups.flatMap((group) => group.listings);
    const rows: ListingEmailRow[] = selectedListings.map((listing) => ({
      address: listing.address,
      price: listing.price,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      squareFootage: listing.squareFootage,
      propertyType: listing.propertyType,
      isLmi: listing.isLmi === 1,
      isUsda: listing.isUsda === 1,
    }));
    const draft = buildListingAgentOutreachDraft({
      agentName: isBulkBcc ? "there" : selectedGroups[0]!.name,
      agentEmail: selectedGroups[0]!.email,
      recipientEmails: isBulkBcc ? selectedGroups.map((group) => group.email) : undefined,
      areaLabel: selectedPull.areaLabel,
      bodyTemplate: selectedOutreachTemplate?.bodyTemplate,
      listings: rows,
    });
    if (isBulkBcc) {
      setBulkOutreachPreview({
        mailto: draft.mailto,
        listingIds: selectedListings.map((listing) => listing.id),
        agents: selectedGroups.map((group) => ({ name: group.name, email: group.email })),
        listings: selectedListings.map((listing) => ({ id: listing.id, address: listing.address })),
      });
      return;
    }
    recordAndOpenListingAgentDraft({
      listingIds: selectedListings.map((listing) => listing.id),
      mailto: draft.mailto,
      agentName: isBulkBcc ? `all ${selectedGroups.length} selected agents (BCC)` : selectedGroups[0]!.name,
    });
  };

  const downloadVisibleInventory = () => {
    const csv = buildGeoSphereInventoryCsv(visibleListings);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeArea = (selectedPull?.areaLabel || "geosphere-saved-listings").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    link.href = href;
    link.download = `${safeArea || "geosphere-saved-listings"}-${overlay}-listings.csv`;
    link.click();
    URL.revokeObjectURL(href);
    toast.success(`Exported ${visibleListings.length} visible saved listing${visibleListings.length === 1 ? "" : "s"}.`);
  };

  return (
    <section className="mt-10 rounded-2xl border border-primary/15 bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border bg-[linear-gradient(118deg,rgba(15,77,59,0.08),rgba(196,142,58,0.07))] px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">GeoSphere inventory workspace</p>
            <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
              <MapPin className="h-6 w-6 text-primary" /> Saved qualifying listings
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Browse manually refreshed GeoSphere snapshots by area and persisted LMI or USDA RD eligibility. Synchronization reads saved snapshots only—it does not make a Rentcast pull.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="bg-card">
              <a href="https://geosphere-map-oregon.vercel.app/" target="_blank" rel="noreferrer">
                <MapPin className="mr-1.5 h-4 w-4" /> Open GeoSphere map <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card"
              onClick={() => syncNow.mutate()}
              disabled={syncNow.isPending}
            >
              {syncNow.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
              Sync saved pulls
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Last cache-only dashboard sync: <span className="font-medium text-foreground">{lastSynced}</span>. Sync imports GeoSphere snapshots only and never makes a Rentcast pull.
          {statusQuery.data?.lastError ? <span className="ml-2 text-destructive">Latest issue: {statusQuery.data.lastError}</span> : null}
        </p>
      </div>

      <div className="p-5 sm:p-7">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved city, county, or ZIP pull</span>
            <Select value={selectedPullId} onValueChange={(value) => { setSelectedPullId(value); setSelectedListingIds(new Set()); setListingAgentKey(ALL_LISTING_AGENTS); }}>
              <SelectTrigger className="mt-1.5 h-10 bg-background">
                <SelectValue placeholder={pullsQuery.isLoading ? "Loading saved pulls…" : "Choose a saved pull"} />
              </SelectTrigger>
              <SelectContent>
                {(pullsQuery.data ?? []).map((pull) => (
                  <SelectItem key={pull.id} value={String(pull.id)}>
                    {pull.areaLabel} · {pull.listingCount} listings
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {selectedPull && <div className="flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label="Selected saved snapshot summary">
            <span className="rounded-full bg-muted px-3 py-2">Saved {selectedPull.sourceSavedAt ? new Date(selectedPull.sourceSavedAt).toLocaleString() : "date unavailable"}</span>
            <span className="rounded-full bg-primary/10 px-3 py-2 text-primary">All: {selectedPull.listingCount}</span>
            <span className="rounded-full bg-amber-500/10 px-3 py-2 text-amber-800">LMI: {selectedPull.lmiCount}</span>
            <span className="rounded-full bg-emerald-600/10 px-3 py-2 text-emerald-800">USDA: {selectedPull.usdaCount}</span>
            <span className="rounded-full bg-muted px-3 py-2">Both: {selectedPull.lmiUsdaCount}</span>
          </div>}
        </div>

        {(pullsQuery.data ?? []).length === 0 && !pullsQuery.isLoading ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/25 px-5 py-10 text-center">
            <SearchCheck className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">No saved GeoSphere pulls are available yet</p>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">Run a Live Pull in GeoSphere for an area first, then return here and select Sync saved pulls. The dashboard will import only that saved GeoSphere data.</p>
          </div>
        ) : selectedPull ? (
          <>
            <div className="mt-6 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0 flex-1">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search this saved snapshot</span>
                    <input
                      value={listingSearch}
                      onChange={(event) => setListingSearch(event.target.value)}
                      placeholder="Address or property type"
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                  </label>
                </div>
                <label className="block xl:w-52">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort visible listings</span>
                  <Select value={listingSort} onValueChange={(value) => setListingSort(value as GeoSphereInventorySort)}>
                    <SelectTrigger className="mt-1.5 h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="address">Address A–Z</SelectItem>
                      <SelectItem value="price-low">Price: low to high</SelectItem>
                      <SelectItem value="price-high">Price: high to low</SelectItem>
                      <SelectItem value="size-high">Square footage: high to low</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="block xl:w-64">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Listing Agent</span>
                  <Select value={listingAgentKey} onValueChange={setListingAgentKey}>
                    <SelectTrigger className="mt-1.5 h-10 bg-background"><SelectValue placeholder="All listing agents" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_LISTING_AGENTS}>All listing agents</SelectItem>
                      {listingAgentOptions.map((agent) => <SelectItem key={agent.key} value={agent.key}>{agent.name} · {agent.listingCount} {agent.listingCount === 1 ? "listing" : "listings"}{agent.email ? "" : " · email unavailable"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={downloadVisibleInventory} disabled={!visibleListings.length}>
                    <Download className="mr-1.5 h-4 w-4" /> Export visible CSV
                  </Button>
                  {hasInventoryFilters ? <Button variant="ghost" size="sm" onClick={clearInventoryFilters}><X className="mr-1.5 h-4 w-4" /> Clear filters</Button> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Listing overlay filters">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {OVERLAYS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setOverlay(option)}
                    aria-pressed={overlay === option}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${overlay === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                  >
                    <Layers3 className="mr-1 inline-block h-3.5 w-3.5" /> {OVERLAY_LABELS[option]}
                  </button>
                ))}
                <span className="ml-auto text-xs font-semibold text-muted-foreground" aria-live="polite">Showing {visibleListings.length} of {listings.length}</span>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                <p>Use <strong className="text-foreground">Agent draft</strong> for one property, or select multiple properties to group outreach by listing-agent email.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground">
                    <input type="checkbox" checked={allSelectableVisibleListingsSelected} onChange={toggleSelectAllVisibleListings} disabled={!selectableVisibleListingIds.length} className="h-4 w-4 rounded border-input accent-primary" />
                    Select all with agent email ({selectableVisibleListingIds.length})
                  </label>
                  <Select value={selectedOutreachTemplateId} onValueChange={selectOutreachTemplate}>
                    <SelectTrigger className="h-9 w-[245px] bg-card text-xs"><SelectValue placeholder={outreachTemplatesQuery.isLoading ? "Loading email templates…" : "Select email template"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ADD_CUSTOM_TEMPLATE}>Add custom email template</SelectItem>
                      {(outreachTemplatesQuery.data ?? []).map((template) => <SelectItem key={template.id} value={String(template.id)}>{template.isBuiltIn === 1 ? `Built-in · ${template.name}` : `Saved · ${template.name}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {listingsQuery.isLoading ? (
                <div className="flex items-center justify-center py-14 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading saved listings…</div>
              ) : visibleListings.length === 0 ? (
                <div className="py-14 text-center text-sm text-muted-foreground">No listings match the current saved-snapshot search and {OVERLAY_LABELS[overlay]} overlay. <button type="button" onClick={clearInventoryFilters} className="font-semibold text-primary hover:underline">Clear filters</button></div>
              ) : (
                <div className="max-h-[30rem] overflow-auto overscroll-contain [scrollbar-gutter:stable]">
                  <table className="w-full min-w-[1270px] text-sm">
                    <thead>
                        <tr className="sticky top-0 z-10 border-b border-border bg-muted/95 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                          <th className="px-4 py-3"><label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap"><input type="checkbox" checked={allSelectableVisibleListingsSelected} onChange={toggleSelectAllVisibleListings} disabled={!selectableVisibleListingIds.length} aria-label="Select all visible addresses with a listing-agent email" className="h-4 w-4 rounded border-input accent-primary" /><span>Select all</span></label></th><th className="px-4 py-3">Address</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Beds/Baths</th><th className="px-4 py-3">Sq. ft.</th><th className="px-4 py-3">Property type</th><th className="px-4 py-3">Eligibility</th><th className="px-4 py-3">Communications</th><th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleListings.map((listing) => (
                        <tr key={listing.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25">
                          <td className="px-4 py-3 align-top">
                            {visibleListingAgents.get(listing.id) ? (
                              <input
                                type="checkbox"
                                checked={selectedListingIds.has(listing.id)}
                                onChange={() => toggleListingSelection(listing.id)}
                                aria-label={`Select ${listing.address} for listing-agent outreach`}
                                className="h-4 w-4 rounded border-input accent-primary"
                              />
                            ) : <span className="text-[11px] text-muted-foreground">No agent email</span>}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">{listing.address}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{usd(listing.price)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{listing.bedrooms ?? "—"} / {listing.bathrooms ?? "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{listing.squareFootage?.toLocaleString("en-US") ?? "—"}</td>
                          <td className="px-4 py-3">{listing.propertyType ?? "—"}</td>
                          <td className="px-4 py-3"><div className="flex gap-1.5">{listing.isLmi === 1 ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-800">LMI</span> : null}{listing.isUsda === 1 ? <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[11px] font-bold text-emerald-800">USDA RD</span> : null}{listing.isLmi === 0 && listing.isUsda === 0 ? <span className="text-xs text-muted-foreground">General</span> : null}</div></td>
                          <td className="px-4 py-3 align-top"><ListingCommunicationStatus lastEmailSentAt={listing.lastEmailSentAt} emailResendCount={listing.emailResendCount} lastEmailTemplateName={listing.lastEmailTemplateName} /></td>
                          <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-3"><ListingDetails sourceData={listing.sourceData} address={listing.address} /><button type="button" onClick={() => openPropertyPageBuilder(listing.id)} className="text-xs font-semibold text-primary hover:underline">Property page</button>{visibleListingAgents.get(listing.id) ? <button type="button" disabled={recordListingEmailActivity.isPending} onClick={() => openSingleListingAgentDraft(listing)} className="text-xs font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-50">Agent draft</button> : null}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedAgentGroups.length ? <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Create a listing-agent outreach draft</p>
                  <p className="mt-1 text-xs text-muted-foreground">Selected listings are grouped by imported listing-agent email. The default sends one privacy-safe BCC draft to all selected agents; choose one agent below for a personalized draft limited to that agent’s selected listings. {selectedOutreachTemplate ? `Using “${selectedOutreachTemplate.name}.” ` : "Choose an email template above, or use the current general outreach copy. "}Each draft still automatically adds the relevant properties, saved program labels, eligibility language, and Mike Ford contact signature.</p>
                  <Select value={selectedAgentEmail} onValueChange={setSelectedAgentEmail}>
                    <SelectTrigger className="mt-3 h-10 bg-card"><SelectValue placeholder="All selected agents (BCC)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_SELECTED_AGENT_EMAILS}>All selected agents (BCC) · {selectedAgentGroups.length} {selectedAgentGroups.length === 1 ? "agent" : "agents"} · {selectedListingIds.size} selected {selectedListingIds.size === 1 ? "listing" : "listings"}</SelectItem>
                      {selectedAgentGroups.map((group) => <SelectItem key={group.email} value={group.email}>{group.name} · {group.email} · {group.listings.length} selected {group.listings.length === 1 ? "listing" : "listings"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={openListingAgentDraft} disabled={!selectedAgentGroups.length}>
                  <Mail className="mr-1.5 h-4 w-4" /> Open agent outreach draft <span className="ml-1.5 rounded-full bg-primary-foreground/15 px-1.5 py-0.5 text-[10px] font-bold">{selectedAgentGroups.length} {selectedAgentGroups.length === 1 ? "agent" : "agents"}</span>
                </Button>
              </div>
            </div> : null}

            <section id="property-pages" className="mt-8 rounded-xl border border-primary/20 bg-primary/[0.035] p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Single-property co-branded pages</p>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">Create each public page from one saved GeoSphere snapshot. The page preserves the current LO + agent assignment, Roadmap, chat, calculator, and dashboard lead workflows while clearly labeling saved property data as point-in-time information rather than a live listing feed.</p>
                </div>
                <Select value={propertyPageTemplateId} onValueChange={selectPropertyPageTemplate}>
                  <SelectTrigger className="h-9 w-full bg-card text-xs lg:w-[280px]"><SelectValue placeholder={propertyPageTemplatesQuery.isLoading ? "Loading page email templates…" : "Select property-page agent template"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ADD_CUSTOM_PROPERTY_PAGE_TEMPLATE}>Add template</SelectItem>
                    {(propertyPageTemplatesQuery.data ?? []).map((template) => <SelectItem key={template.id} value={String(template.id)}>Saved · {template.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {propertyPagesQuery.isLoading ? <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading saved property pages…</div> : propertyPages.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-border bg-card/60 p-5 text-sm text-muted-foreground">No property pages yet. Use <strong className="text-foreground">Property page</strong> in any saved listing row above to create one.</div> : <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {propertyPages.map((page) => {
                  const snapshot = parsePropertyLandingSnapshot(page.listingSnapshot);
                  const pairDraft = propertyPagePairDrafts[page.id] ?? { loanOfficerId: String(page.loanOfficerId ?? ""), agentId: String(page.agentId ?? "") };
                  const url = publicSiteUrl(`/property/${page.slug}`);
                  return <div key={page.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-foreground">{page.address}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${page.isActive === 1 ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{page.isActive === 1 ? "Public" : "Retired"}</span></div><p className="mt-1 text-xs text-muted-foreground">Saved snapshot {page.sourceSavedAt ? new Date(page.sourceSavedAt).toLocaleString() : "date unavailable"} · {snapshot?.isLmi && snapshot?.isUsda ? "LMI + USDA RD screen" : snapshot?.isLmi ? "LMI screen" : snapshot?.isUsda ? "USDA RD screen" : "general financing review"}</p></div>
                      <div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View</a></Button><Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success("Property-page URL copied."); } catch { toast.error("Copy failed; select the URL from View instead."); } }}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</Button></div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-muted-foreground">Loan officer<Select value={pairDraft.loanOfficerId} onValueChange={(value) => setPropertyPagePairDrafts((current) => ({ ...current, [page.id]: { ...pairDraft, loanOfficerId: value } }))}><SelectTrigger className="mt-1.5 h-9 bg-background text-xs"><SelectValue placeholder="Choose loan officer" /></SelectTrigger><SelectContent>{officers.map((officer) => <SelectItem key={officer.id} value={String(officer.id)}>{officer.name}</SelectItem>)}</SelectContent></Select></label>
                      <label className="text-xs font-semibold text-muted-foreground">Co-branded agent<Select value={pairDraft.agentId} onValueChange={(value) => setPropertyPagePairDrafts((current) => ({ ...current, [page.id]: { ...pairDraft, agentId: value } }))}><SelectTrigger className="mt-1.5 h-9 bg-background text-xs"><SelectValue placeholder="Choose agent" /></SelectTrigger><SelectContent>{agents.map((agent) => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}</SelectContent></Select></label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={() => savePropertyPagePair(page.id, page)} disabled={updatePropertyPagePair.isPending}><Link2 className="mr-1.5 h-3.5 w-3.5" /> Save pairing</Button><Button size="sm" onClick={() => openPropertyPageAgentDraft(page)}><Mail className="mr-1.5 h-3.5 w-3.5" /> Agent email draft</Button><Button size="sm" variant="outline" disabled={refreshPropertyPageSnapshot.isPending} onClick={() => refreshPropertyPageSnapshot.mutate({ id: page.id })}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh saved snapshot</Button><label className="ml-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">{page.isActive === 1 ? "Public" : "Retired"}<input type="checkbox" role="switch" aria-label={`Make ${page.address} ${page.isActive === 1 ? "retired" : "public"}`} checked={page.isActive === 1} disabled={setPropertyPageActive.isPending} onChange={(event) => setPropertyPageActive.mutate({ id: page.id, isActive: event.target.checked })} className="h-4 w-8 cursor-pointer accent-primary" /></label></div>
                    <PropertyPageAiSummaryEditor page={page} />
                    <PropertyPageTimeline propertyLandingPageId={page.id} />
                  </div>;
                })}
              </div>}
            </section>

            <div className="mt-6 rounded-xl border border-primary/15 bg-primary/[0.035] p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Create a property-list email draft</p>
                  <p className="mt-1 text-xs text-muted-foreground">Search, select one or more Roadmap or completed Mortgage Intake Specialist leads, and prepare the visible property list for review. Multiple recipients are placed in BCC so their email addresses remain private.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={recipientLastNameSearch}
                      onChange={(event) => setRecipientLastNameSearch(event.target.value)}
                      placeholder="Search one or multiple leads by last name (e.g., Smith, Garcia, Nguyen)"
                      className="h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                    <div className="flex gap-1.5" role="group" aria-label="Filter property-list email recipients by lead source">
                      <Button type="button" size="sm" variant={recipientSourceFilter === "roadmap" ? "default" : "outline"} onClick={() => setRecipientSourceFilter(recipientSourceFilter === "roadmap" ? "all" : "roadmap")}>Roadmap</Button>
                      <Button type="button" size="sm" variant={recipientSourceFilter === "chat" ? "default" : "outline"} onClick={() => setRecipientSourceFilter(recipientSourceFilter === "chat" ? "all" : "chat")}>Chat Intake</Button>
                    </div>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-md border border-input bg-card">
                    <label className="flex cursor-pointer items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-foreground">
                      <input type="checkbox" checked={visibleRecipientsSelected} onChange={toggleVisibleRecipientSelection} disabled={!visibleRecipients.length} className="h-4 w-4 rounded border-input accent-primary" />
                      Select all matching leads ({visibleRecipients.length})
                    </label>
                    <div className="max-h-36 overflow-y-auto">
                      {visibleRecipients.length ? visibleRecipients.map((recipient) => <label key={recipient.value} className="flex cursor-pointer items-center gap-2 border-b border-border/60 px-3 py-2 text-xs last:border-0 hover:bg-muted/25"><input type="checkbox" checked={selectedRecipientValues.has(recipient.value)} onChange={() => toggleRecipientSelection(recipient.value)} className="h-4 w-4 rounded border-input accent-primary" /><span className="min-w-0 flex-1 truncate font-medium text-foreground">{formatRecipientLastFirst(recipient.name)}</span><span className="truncate text-muted-foreground">{recipient.email} · {recipient.source}</span></label>) : <p className="px-3 py-3 text-xs text-muted-foreground">No matching lead recipients.</p>}
                    </div>
                  </div>
                  <Select value={propertyEmailTemplate} onValueChange={selectPropertyEmailTemplate}>
                    <SelectTrigger className="mt-3 h-10 bg-card"><SelectValue placeholder="Select property email template" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ADD_CUSTOM_PROPERTY_EMAIL_TEMPLATE}>Add custom email template</SelectItem>
                      {PROPERTY_EMAIL_TEMPLATES.map((template) => <SelectItem key={template.value} value={template.value}>{template.label}</SelectItem>)}
                      {(propertyTemplatesQuery.data ?? []).map((template) => <SelectItem key={template.id} value={`custom:${template.id}`}>Saved · {template.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{visibleRecipients.length} matching {visibleRecipients.length === 1 ? "lead" : "leads"}, ordered by last name. {selectedRecipients.length} selected. The draft includes all currently visible listings above.</p>
                </div>
                <Button onClick={openListingDraft} disabled={!visibleListings.length || selectedRecipients.length === 0 || !propertyEmailTemplate}>
                  <Mail className="mr-1.5 h-4 w-4" /> Open property email draft
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <Dialog open={customTemplateOpen} onOpenChange={setCustomTemplateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add custom email template</DialogTitle>
            <DialogDescription>Write only the reusable body copy. Each outreach draft automatically adds the listing-agent recipient, first-name greeting, selected property details with saved program labels, eligibility language, and Mike Ford’s Cornerstone First Mortgage signature.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="listing-agent-template-name">Template name</Label>
              <Input id="listing-agent-template-name" value={customTemplateName} onChange={(event) => setCustomTemplateName(event.target.value)} maxLength={160} placeholder="e.g., Coastal buyer-attraction outreach" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-agent-template-body">Reusable email body</Label>
              <Textarea id="listing-agent-template-body" value={customTemplateBody} onChange={(event) => setCustomTemplateBody(event.target.value)} maxLength={6000} className="min-h-56 resize-y" placeholder="Describe the buyer-attraction opportunity in your own words. The greeting, property lines, saved program labels, required eligibility language, and signature are added automatically." />
              <p className="text-right text-xs text-muted-foreground">{customTemplateBody.length}/6000</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCustomTemplateOpen(false)} disabled={saveOutreachTemplate.isPending}>Cancel</Button>
            <Button onClick={saveCustomTemplate} disabled={saveOutreachTemplate.isPending}>{saveOutreachTemplate.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}Save email template</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={customPropertyTemplateOpen} onOpenChange={setCustomPropertyTemplateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add custom property email template</DialogTitle>
            <DialogDescription>Write only the reusable opening or introduction. Each property email automatically adds the selected lead recipients, BCC privacy for group drafts, property details, Zillow links, listing-agent contacts, buyer-agent assistance offer, and Mike Ford’s signature.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="property-email-template-name">Template name</Label>
              <Input id="property-email-template-name" value={customPropertyTemplateName} onChange={(event) => setCustomPropertyTemplateName(event.target.value)} maxLength={160} placeholder="e.g., Weekend homes to review" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="property-email-template-body">Reusable email introduction</Label>
              <Textarea id="property-email-template-body" value={customPropertyTemplateBody} onChange={(event) => setCustomPropertyTemplateBody(event.target.value)} maxLength={6000} className="min-h-56 resize-y" placeholder="Write your warm introductory message. The greeting, selected properties, Zillow links, listing-agent contacts, buyer-agent assistance, and signature are added automatically." />
              <p className="text-right text-xs text-muted-foreground">{customPropertyTemplateBody.length}/6000</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCustomPropertyTemplateOpen(false)} disabled={savePropertyEmailTemplate.isPending}>Cancel</Button>
            <Button onClick={saveCustomPropertyTemplate} disabled={savePropertyEmailTemplate.isPending}>{savePropertyEmailTemplate.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}Save property email template</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={propertyPageBuilderOpen} onOpenChange={setPropertyPageBuilderOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">Create single-property co-branded page</DialogTitle>
            <DialogDescription>Create a public, saved-snapshot property page with the selected LO + agent pairing. Roadmap requests and mortgage chat intakes will enter the existing dashboard with this property address and pairing attached.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/15 bg-primary/[0.04] p-3 text-sm"><p className="font-semibold text-foreground">{propertyPageListing?.address ?? "Saved listing"}</p><p className="mt-1 text-xs text-muted-foreground">The page uses the saved listing snapshot available now. It will disclose that status, price, photo, feature, and program information require current verification.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><span className="text-sm font-medium">Loan officer</span><Select value={propertyPageLoanOfficerId} onValueChange={setPropertyPageLoanOfficerId}><SelectTrigger><SelectValue placeholder="Choose loan officer" /></SelectTrigger><SelectContent>{officers.map((officer) => <SelectItem key={officer.id} value={String(officer.id)}>{officer.name}</SelectItem>)}</SelectContent></Select></label>
              <label className="space-y-1.5"><span className="text-sm font-medium">Co-branded agent</span><Select value={propertyPageAgentId} onValueChange={setPropertyPageAgentId}><SelectTrigger><SelectValue placeholder="Choose agent" /></SelectTrigger><SelectContent>{agents.map((agent) => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}</SelectContent></Select></label>
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPropertyPageBuilderOpen(false)} disabled={createPropertyPage.isPending}>Cancel</Button><Button onClick={submitPropertyPage} disabled={createPropertyPage.isPending || !propertyPageListingId || !propertyPageLoanOfficerId || !propertyPageAgentId}>{createPropertyPage.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />} Save property page</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={customPropertyPageTemplateOpen} onOpenChange={setCustomPropertyPageTemplateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add property-page agent email template</DialogTitle>
            <DialogDescription>Write only the reusable introduction. Every draft automatically adds the listing-agent recipient, property-page URL, saved property details, program-screening context, snapshot limitation, and the assigned loan officer signature.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="property-page-agent-template-name">Template name</Label><Input id="property-page-agent-template-name" value={customPropertyPageTemplateName} onChange={(event) => setCustomPropertyPageTemplateName(event.target.value)} maxLength={160} placeholder="e.g., New co-branded property page" /></div>
            <div className="space-y-1.5"><Label htmlFor="property-page-agent-template-body">Reusable email introduction</Label><Textarea id="property-page-agent-template-body" value={customPropertyPageTemplateBody} onChange={(event) => setCustomPropertyPageTemplateBody(event.target.value)} maxLength={6000} className="min-h-56 resize-y" placeholder="Explain the shared first-time-buyer attraction opportunity in your own words. The recipient, property URL, saved property facts, current-verification reminder, and signature are added automatically." /><p className="text-right text-xs text-muted-foreground">{customPropertyPageTemplateBody.length}/6000</p></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCustomPropertyPageTemplateOpen(false)} disabled={savePropertyPageTemplate.isPending}>Cancel</Button><Button onClick={() => { if (customPropertyPageTemplateName.trim().length < 2 || customPropertyPageTemplateBody.trim().length < 20) { toast.error("Enter a template name and at least 20 characters of reusable email copy."); return; } savePropertyPageTemplate.mutate({ name: customPropertyPageTemplateName.trim(), bodyTemplate: customPropertyPageTemplateBody.trim() }); }} disabled={savePropertyPageTemplate.isPending}>{savePropertyPageTemplate.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}Save email template</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(bulkOutreachPreview)} onOpenChange={(open) => { if (!open) setBulkOutreachPreview(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Review BCC agent outreach</DialogTitle>
            <DialogDescription>Review the privacy-safe BCC recipients and selected properties before your email application opens. Recipient addresses will not be visible to one another.</DialogDescription>
          </DialogHeader>
          {bulkOutreachPreview ? <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/25 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">BCC recipients · {bulkOutreachPreview.agents.length}</p>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                {bulkOutreachPreview.agents.map((agent) => <div key={agent.email} className="rounded-md bg-card px-2.5 py-2 text-xs"><p className="font-semibold text-foreground">{agent.name}</p><p className="truncate text-muted-foreground">{agent.email}</p></div>)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/25 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Selected properties · {bulkOutreachPreview.listings.length}</p>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
                {bulkOutreachPreview.listings.map((listing) => <p key={listing.id} className="rounded-md bg-card px-2.5 py-2 text-xs font-medium text-foreground">{listing.address}</p>)}
              </div>
            </div>
          </div> : null}
          <p className="rounded-md border border-primary/15 bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground">Template: <span className="font-semibold text-foreground">{selectedOutreachTemplate?.name ?? "General buyer-attraction outreach"}</span></p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkOutreachPreview(null)} disabled={recordListingEmailActivity.isPending}>Cancel</Button>
            <Button onClick={() => {
              if (!bulkOutreachPreview) return;
              recordAndOpenListingAgentDraft({
                listingIds: bulkOutreachPreview.listingIds,
                mailto: bulkOutreachPreview.mailto,
                agentName: `all ${bulkOutreachPreview.agents.length} selected agents (BCC)`,
              });
              setBulkOutreachPreview(null);
            }} disabled={recordListingEmailActivity.isPending}>
              {recordListingEmailActivity.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Mail className="mr-1.5 h-4 w-4" />} Open BCC email draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
