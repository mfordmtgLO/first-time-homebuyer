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
import { Activity, Copy, Download, ExternalLink, Layers3, Link2, Loader2, Mail, MapPin, Plus, Printer, RefreshCw, SearchCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
import {
  buildListingAgentOutreachDraft,
  buildListingEmailDraft,
  type ListingEmailRow,
  type PropertyEmailTemplateKey,
} from "@shared/leadEmailDraft";
import { OVERLAY_LABELS, type GeoSphereOverlayKey } from "@shared/geosphere";
import { buildGeoSphereInventoryCsv, estimateExportMonthlyPrincipalAndInterest, estimateExportTotalMonthlyPayment, filterAndSortGeoSphereListings, type GeoSphereInventorySort } from "@shared/geosphereInventory";
import { firstHomeScreeningLabel, isFirstHomeLmiPriceEligible, parseFirstHomeScreening } from "@shared/geosphereFirstHome";
import { filterByImportedListingAgent, getImportedListingAgentOptions, parseImportedListingAgent } from "@shared/geosphereListingAgents";
import { filterPropertyListRecipients, formatRecipientLastFirst, type PropertyListRecipientFilter } from "@shared/geosphereRecipients";
import { buildPropertyPageAgentDraft } from "@shared/propertyPageEmailDraft";
import { buildPropertyLandingSnapshot, parsePropertyLandingSnapshot } from "@shared/propertyLandingPage";
import { calculateEffectiveContributionScreeningLimit, DEFAULT_PROGRAM_CONTRIBUTION_LIMIT_BPS, PROGRAM_CONTRIBUTION_LIMIT_KEYS, type ProgramContributionLimitValues } from "@shared/programContributionLimits";
import { publicSiteUrl } from "@shared/publicSiteUrl";
import { EmailTemplateLifecycleManager, type ManagedEmailTemplate } from "@/components/EmailTemplateLifecycleManager";
import { UniversalEmailTemplateEditor } from "@/components/UniversalEmailTemplateEditor";
import { richEmailTemplateToText } from "@shared/emailTemplateText";
import { buildLoanOfficerEmailSignature } from "@shared/mikeFordEmailSignature";

const OVERLAYS: GeoSphereOverlayKey[] = ["all", "lmi", "usda", "lmiUsda"];

const usd = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const escapePrintHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function printAllInMonthlyCostSummary(address: string, snapshot: { price: number | null; propertyTaxes: number | null; hoaDues: number | null; homeownerInsurance: number | null; mortgageInsurance: number | null; contributionProgram: "none" | "fha" | "va" | "usda" | "conventional"; conventionalOccupancy: "primary" | "second_home" | "investment"; conventionalLtvTier: "lte80" | "ltv81_90" | "gt90"; programContributionLimit: number | null; maxSellerContribution: number | null }) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow pop-ups to print the all-in monthly-cost summary.");
    return;
  }
  printWindow.opener = null;
  const estimatedPrincipalAndInterest = estimateExportMonthlyPrincipalAndInterest(snapshot.price);
  const estimatedTotal = estimateExportTotalMonthlyPayment(snapshot);
  const rows = [
    ["Saved price", usd(snapshot.price)],
    ["Estimated P&I", usd(estimatedPrincipalAndInterest)],
    ["Property taxes", snapshot.propertyTaxes === null ? "Not saved" : `${usd(snapshot.propertyTaxes / 12)}/mo (${usd(snapshot.propertyTaxes)}/yr)`],
    ["HOA dues", snapshot.hoaDues === null ? "Not saved" : `${usd(snapshot.hoaDues)}/mo`],
    ["Homeowner insurance", snapshot.homeownerInsurance === null ? "Not saved" : `${usd(snapshot.homeownerInsurance)}/mo`],
    ["Mortgage insurance", snapshot.mortgageInsurance === null ? "Not saved" : `${usd(snapshot.mortgageInsurance)}/mo`],
    ["Contribution program screen", snapshot.contributionProgram === "none" ? "Not selected" : `${CONTRIBUTION_PROGRAM_OPTIONS.find((option) => option.value === snapshot.contributionProgram)?.label ?? snapshot.contributionProgram}${snapshot.contributionProgram === "conventional" ? ` · ${CONVENTIONAL_OCCUPANCY_OPTIONS.find((option) => option.value === snapshot.conventionalOccupancy)?.label} · ${CONVENTIONAL_LTV_OPTIONS.find((option) => option.value === snapshot.conventionalLtvTier)?.label}` : ""}`],
    ["Private program contribution cap", snapshot.programContributionLimit === null ? "Not configured" : `${usd(snapshot.programContributionLimit)} (stricter configured sales-price percentage or dollar cap)`],
    ["Seller contribution to screen", snapshot.maxSellerContribution === null ? "Not entered" : usd(snapshot.maxSellerContribution)],
    ["Estimated all-in monthly planning total", usd(estimatedTotal)],
  ];
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>All-in monthly-cost summary — ${escapePrintHtml(address)}</title><style>body{font-family:Arial,sans-serif;color:#1d3128;margin:42px;line-height:1.45;position:relative}h1{font-family:Georgia,serif;font-size:28px;margin:0 0 4px}p{color:#56645e}.tag{display:inline-block;background:#e8b442;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{border-bottom:1px solid #d8dfdb;padding:10px;text-align:left;font-size:14px}th{width:58%;color:#50645a}.total th,.total td{font-weight:700;color:#153f30;background:#f3f6f3}.note{margin-top:28px;border-top:1px solid #d8dfdb;padding-top:14px;font-size:11px;color:#56645e}.watermark{position:fixed;top:46%;left:50%;z-index:-1;transform:translate(-50%,-50%) rotate(-28deg);font-size:46px;font-weight:800;letter-spacing:.1em;color:rgba(21,63,48,.10);white-space:nowrap;pointer-events:none;user-select:none}@media print{body{margin:0}.watermark{z-index:0}}</style></head><body><div class="watermark" aria-hidden="true">FOR INTERNAL USE ONLY</div><div class="tag">Loan officer planning worksheet · For Internal Use Only</div><h1>${escapePrintHtml(address)}</h1><p>Saved-property monthly-cost planning summary</p><table>${rows.map(([label, value], index) => `<tr class="${index === rows.length - 1 ? "total" : ""}"><th>${escapePrintHtml(label)}</th><td>${escapePrintHtml(value)}</td></tr>`).join("")}</table><p class="note">Internal planning worksheet only. Program contribution screens are configurable internal review aids, not eligibility determinations or public program guidance. Estimated P&I assumes a 30-year fixed loan, 6.5% rate, and 5% down. This is not a payment quote, APR quote, loan estimate, commitment to lend, or offer of credit. Actual terms, mortgage insurance, fees, discount points, closing costs, prepaids, seller contributions, eligibility, and underwriting may change results.</p><script>window.onload=()=>window.print();<\/script></body></html>`);
  printWindow.document.close();
}

const ALL_LISTING_AGENTS = "__all_listing_agents__";
const ALL_SELECTED_AGENT_EMAILS = "__all_selected_agents_bcc__";
const ADD_CUSTOM_TEMPLATE = "__add_custom_email_template__";
const ADD_CUSTOM_PROPERTY_EMAIL_TEMPLATE = "__add_custom_property_email_template__";
const ADD_CUSTOM_PROPERTY_PAGE_TEMPLATE = "__add_custom_property_page_template__";
const ADD_CUSTOM_PROPERTY_PAGE_BUYER_TEMPLATE = "__add_custom_property_page_buyer_template__";
const COMPLIANCE_STATUS_OPTIONS = [
  { value: "draft", label: "Draft · not submitted" },
  { value: "submitted", label: "Submitted for review" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes requested" },
] as const;
const CONTRIBUTION_PROGRAM_OPTIONS = [
  { value: "none", label: "No program screen" },
  { value: "fha", label: "FHA" },
  { value: "va", label: "VA" },
  { value: "usda", label: "USDA" },
  { value: "conventional", label: "Conventional" },
] as const;
const CONVENTIONAL_OCCUPANCY_OPTIONS = [
  { value: "primary", label: "Primary residence" },
  { value: "second_home", label: "Second home" },
  { value: "investment", label: "Investment property" },
] as const;
const CONVENTIONAL_LTV_OPTIONS = [
  { value: "lte80", label: "LTV 80% or less" },
  { value: "ltv81_90", label: "LTV 81–90%" },
  { value: "gt90", label: "LTV greater than 90%" },
] as const;
const PROGRAM_LIMIT_LABELS: Record<(typeof PROGRAM_CONTRIBUTION_LIMIT_KEYS)[number], string> = {
  fha: "FHA",
  va: "VA",
  usda: "USDA",
  conventional_primary: "Conventional · Primary residence",
  conventional_second_home: "Conventional · Second home",
  conventional_investment: "Conventional · Investment property",
  conventional_ltv81_90: "Conventional · LTV 81–90%",
  conventional_gt90: "Conventional · LTV greater than 90%",
};
function parseOptionalCurrencyAmount(raw: string, label: string, maximum: number) {
  const normalized = raw.trim();
  if (!normalized) return { value: null as number | null };
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return { error: `${label} must be a non-negative dollar amount with no more than two decimal places.` };
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > maximum) return { error: `${label} must be between $0 and ${usd(maximum)}.` };
  return { value: Math.round(value * 100) / 100 };
}
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
  email_pdf_summary: "Email PDF summary draft",
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
    return event.eventType === "social_share" || event.eventType === "print_export" || event.eventType === "email_pdf_summary";
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
  const [firstHomeOnly, setFirstHomeOnly] = useState(false);
  const [selectedRecipientValues, setSelectedRecipientValues] = useState<Set<string>>(() => new Set());
  const [recipientLastNameSearch, setRecipientLastNameSearch] = useState("");
  const [recipientSourceFilter, setRecipientSourceFilter] = useState<PropertyListRecipientFilter>("all");
  const [propertyEmailTemplate, setPropertyEmailTemplate] = useState<string>("property_shortlist_with_agent_follow_up");
  const [customPropertyTemplateOpen, setCustomPropertyTemplateOpen] = useState(false);
  const [propertyEmailTemplateManagerOpen, setPropertyEmailTemplateManagerOpen] = useState(false);
  const [editingPropertyEmailTemplateId, setEditingPropertyEmailTemplateId] = useState<number | null>(null);
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
  const [listingAgentTemplateManagerOpen, setListingAgentTemplateManagerOpen] = useState(false);
  const [editingListingAgentTemplateId, setEditingListingAgentTemplateId] = useState<number | null>(null);
  const [customTemplateName, setCustomTemplateName] = useState("");
  const [customTemplateBody, setCustomTemplateBody] = useState("");
  const [propertyPageBuilderOpen, setPropertyPageBuilderOpen] = useState(false);
  const [propertyPageListingId, setPropertyPageListingId] = useState<number | null>(null);
  const [propertyPageLoanOfficerId, setPropertyPageLoanOfficerId] = useState("");
  const [propertyPageAgentId, setPropertyPageAgentId] = useState("");
  const [propertyPageExternalUrl, setPropertyPageExternalUrl] = useState("");
  const [propertyPageTaxes, setPropertyPageTaxes] = useState("");
  const [propertyPageUnits, setPropertyPageUnits] = useState("");
  const [propertyPageHoaDues, setPropertyPageHoaDues] = useState("");
  const [propertyPageHomeownerInsurance, setPropertyPageHomeownerInsurance] = useState("");
  const [propertyPageMortgageInsurance, setPropertyPageMortgageInsurance] = useState("");
  const [propertyPageComplianceApprovalStatus, setPropertyPageComplianceApprovalStatus] = useState<"draft" | "submitted" | "approved" | "changes_requested">("draft");
  const [propertyPageContributionProgram, setPropertyPageContributionProgram] = useState<"none" | "fha" | "va" | "usda" | "conventional">("none");
  const [propertyPageConventionalOccupancy, setPropertyPageConventionalOccupancy] = useState<"primary" | "second_home" | "investment">("primary");
  const [propertyPageConventionalLtvTier, setPropertyPageConventionalLtvTier] = useState<"lte80" | "ltv81_90" | "gt90">("lte80");
  const [propertyPageMaxSellerContribution, setPropertyPageMaxSellerContribution] = useState("");
  const [propertyPageTemplateId, setPropertyPageTemplateId] = useState("");
  const [customPropertyPageTemplateOpen, setCustomPropertyPageTemplateOpen] = useState(false);
  const [propertyPageAgentTemplateManagerOpen, setPropertyPageAgentTemplateManagerOpen] = useState(false);
  const [editingPropertyPageAgentTemplateId, setEditingPropertyPageAgentTemplateId] = useState<number | null>(null);
  const [customPropertyPageTemplateName, setCustomPropertyPageTemplateName] = useState("");
  const [customPropertyPageTemplateBody, setCustomPropertyPageTemplateBody] = useState("");
  const [propertyPageBuyerTemplateId, setPropertyPageBuyerTemplateId] = useState("");
  const [customPropertyPageBuyerTemplateOpen, setCustomPropertyPageBuyerTemplateOpen] = useState(false);
  const [propertyPageBuyerTemplateManagerOpen, setPropertyPageBuyerTemplateManagerOpen] = useState(false);
  const [editingPropertyPageBuyerTemplateId, setEditingPropertyPageBuyerTemplateId] = useState<number | null>(null);
  const [customPropertyPageBuyerTemplateName, setCustomPropertyPageBuyerTemplateName] = useState("");
  const [customPropertyPageBuyerTemplateSubject, setCustomPropertyPageBuyerTemplateSubject] = useState("Buyer calculation summary — {{property_address}}");
  const [customPropertyPageBuyerTemplateBody, setCustomPropertyPageBuyerTemplateBody] = useState("Hi {{client_name}},\n\nI prepared a buyer calculation summary for {{property_address}}. You can review the saved property page here: {{property_url}}\n\nPlease let me know what questions you have about the property or your first-home financing options.\n\n{{loan_officer_signature}}\n\n{{agent_signature}}");
  const [propertyPagePairDrafts, setPropertyPagePairDrafts] = useState<Record<number, { loanOfficerId: string; agentId: string }>>({});
  const [propertyPageExternalUrlDrafts, setPropertyPageExternalUrlDrafts] = useState<Record<number, string>>({});
  const [propertyPageMetadataEditorId, setPropertyPageMetadataEditorId] = useState<number | null>(null);
  const [propertyPageMetadataDrafts, setPropertyPageMetadataDrafts] = useState<Record<number, { propertyTaxes: string; units: string; hoaDues: string; homeownerInsurance: string; mortgageInsurance: string; complianceApprovalStatus: "draft" | "submitted" | "approved" | "changes_requested"; contributionProgram: "none" | "fha" | "va" | "usda" | "conventional"; conventionalOccupancy: "primary" | "second_home" | "investment"; conventionalLtvTier: "lte80" | "ltv81_90" | "gt90"; maxSellerContribution: string }>>({});
  const [programLimitDrafts, setProgramLimitDrafts] = useState<ProgramContributionLimitValues>(DEFAULT_PROGRAM_CONTRIBUTION_LIMIT_BPS);

  const statusQuery = trpc.geosphere.status.useQuery();
  const pullsQuery = trpc.geosphere.listPulls.useQuery();
  const leadsQuery = trpc.leads.list.useQuery();
  const chatsQuery = trpc.chat.list.useQuery();
  const outreachTemplatesQuery = trpc.geosphere.listListingAgentEmailTemplates.useQuery();
  const allOutreachTemplatesQuery = trpc.geosphere.listListingAgentEmailTemplates.useQuery({ includeArchived: true });
  const propertyTemplatesQuery = trpc.geosphere.listPropertyEmailTemplates.useQuery();
  const allPropertyTemplatesQuery = trpc.geosphere.listPropertyEmailTemplates.useQuery({ includeArchived: true });
  const propertyPagesQuery = trpc.propertyPages.list.useQuery();
  const programContributionLimitsQuery = trpc.propertyPages.programContributionLimits.useQuery();
  const propertyPageTemplatesQuery = trpc.propertyPages.listAgentEmailTemplates.useQuery();
  const allPropertyPageTemplatesQuery = trpc.propertyPages.listAgentEmailTemplates.useQuery({ includeArchived: true });
  const propertyPageBuyerTemplatesQuery = trpc.propertyPages.listBuyerEmailTemplates.useQuery();
  const allPropertyPageBuyerTemplatesQuery = trpc.propertyPages.listBuyerEmailTemplates.useQuery({ includeArchived: true });
  const officersQuery = trpc.loanOfficer.list.useQuery();
  const agentsQuery = trpc.agent.list.useQuery();
  const saveProgramContributionLimits = trpc.propertyPages.saveProgramContributionLimits.useMutation({
    onSuccess: (limits) => { setProgramLimitDrafts(limits); void programContributionLimitsQuery.refetch(); toast.success("Private program contribution screens saved."); },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (programContributionLimitsQuery.data) setProgramLimitDrafts(programContributionLimitsQuery.data);
  }, [programContributionLimitsQuery.data]);
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
  const updateOutreachTemplate = trpc.geosphere.updateListingAgentEmailTemplate.useMutation({ onSuccess: async (template) => { await utils.geosphere.listListingAgentEmailTemplates.invalidate(); setSelectedOutreachTemplateId(String(template.id)); setCustomTemplateOpen(false); setEditingListingAgentTemplateId(null); toast.success(`${template.name} was updated.`); }, onError: (error) => toast.error(error.message || "The email template could not be updated.") });
  const setOutreachTemplateArchived = trpc.geosphere.setListingAgentEmailTemplateArchived.useMutation({ onSuccess: async (result, variables) => { await utils.geosphere.listListingAgentEmailTemplates.invalidate(); if (variables.archived) setSelectedOutreachTemplateId((current) => current === String(variables.id) ? "" : current); toast.success(result.archived ? "Email template archived." : "Email template restored."); }, onError: (error) => toast.error(error.message || "The email template archive state could not be changed.") });
  const deleteOutreachTemplate = trpc.geosphere.deleteListingAgentEmailTemplate.useMutation({ onSuccess: async (_result, variables) => { await utils.geosphere.listListingAgentEmailTemplates.invalidate(); setSelectedOutreachTemplateId((current) => current === String(variables.id) ? "" : current); toast.success("Email template permanently deleted."); }, onError: (error) => toast.error(error.message || "The email template could not be deleted.") });
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
  const updatePropertyEmailTemplate = trpc.geosphere.updatePropertyEmailTemplate.useMutation({ onSuccess: async (template) => { await utils.geosphere.listPropertyEmailTemplates.invalidate(); setPropertyEmailTemplate(`custom:${template.id}`); setCustomPropertyTemplateOpen(false); setEditingPropertyEmailTemplateId(null); toast.success(`${template.name} was updated.`); }, onError: (error) => toast.error(error.message || "The property email template could not be updated.") });
  const setPropertyEmailTemplateArchived = trpc.geosphere.setPropertyEmailTemplateArchived.useMutation({ onSuccess: async (result, variables) => { await utils.geosphere.listPropertyEmailTemplates.invalidate(); if (variables.archived) setPropertyEmailTemplate((current) => current === `custom:${variables.id}` ? "" : current); toast.success(result.archived ? "Property email template archived." : "Property email template restored."); }, onError: (error) => toast.error(error.message || "The property email template archive state could not be changed.") });
  const deletePropertyEmailTemplate = trpc.geosphere.deletePropertyEmailTemplate.useMutation({ onSuccess: async (_result, variables) => { await utils.geosphere.listPropertyEmailTemplates.invalidate(); setPropertyEmailTemplate((current) => current === `custom:${variables.id}` ? "" : current); toast.success("Property email template permanently deleted."); }, onError: (error) => toast.error(error.message || "The property email template could not be deleted.") });
  const recordListingEmailActivity = trpc.geosphere.recordListingEmailActivity.useMutation({
    onError: (error) => toast.error(error.message || "The email draft opened, but communication activity could not be recorded."),
  });
  const recordTemplateUsage = trpc.templateUsage.recordDraftOpen.useMutation({
    onSuccess: () => utils.templateUsage.listCounts.invalidate(),
  });
  const createPropertyPage = trpc.propertyPages.createFromListing.useMutation({
    onSuccess: async (page) => {
      await utils.propertyPages.list.invalidate();
      setPropertyPageBuilderOpen(false);
      setPropertyPageListingId(null);
      setPropertyPageExternalUrl("");
      setPropertyPageTaxes("");
      setPropertyPageUnits("");
      setPropertyPageHoaDues("");
      setPropertyPageHomeownerInsurance("");
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
  const updatePropertyPageExternalUrl = trpc.propertyPages.updateExternalListingUrl.useMutation({
    onSuccess: async () => {
      await utils.propertyPages.list.invalidate();
      toast.success("External live-listing link saved.");
    },
    onError: (error) => toast.error(error.message || "The external live-listing link could not be saved."),
  });
  const updatePropertyPageMetadata = trpc.propertyPages.updateMetadata.useMutation({
    onSuccess: async () => {
      await utils.propertyPages.list.invalidate();
      setPropertyPageMetadataEditorId(null);
      toast.success("Saved property facts updated.");
    },
    onError: (error) => toast.error(error.message || "The saved property facts could not be updated."),
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
  const updatePropertyPageTemplate = trpc.propertyPages.updateAgentEmailTemplate.useMutation({ onSuccess: async (template) => { await utils.propertyPages.listAgentEmailTemplates.invalidate(); setPropertyPageTemplateId(String(template.id)); setCustomPropertyPageTemplateOpen(false); setEditingPropertyPageAgentTemplateId(null); toast.success(`${template.name} was updated.`); }, onError: (error) => toast.error(error.message || "The property-page agent template could not be updated.") });
  const setPropertyPageTemplateArchived = trpc.propertyPages.setAgentEmailTemplateArchived.useMutation({ onSuccess: async (result, variables) => { await utils.propertyPages.listAgentEmailTemplates.invalidate(); if (variables.archived) setPropertyPageTemplateId((current) => current === String(variables.id) ? "" : current); toast.success(result.archived ? "Property-page agent template archived." : "Property-page agent template restored."); }, onError: (error) => toast.error(error.message || "The property-page agent template archive state could not be changed.") });
  const deletePropertyPageTemplate = trpc.propertyPages.deleteAgentEmailTemplate.useMutation({ onSuccess: async (_result, variables) => { await utils.propertyPages.listAgentEmailTemplates.invalidate(); setPropertyPageTemplateId((current) => current === String(variables.id) ? "" : current); toast.success("Property-page agent template permanently deleted."); }, onError: (error) => toast.error(error.message || "The property-page agent template could not be deleted.") });
  const savePropertyPageBuyerTemplate = trpc.propertyPages.saveBuyerEmailTemplate.useMutation({
    onSuccess: async (template) => {
      await utils.propertyPages.listBuyerEmailTemplates.invalidate();
      setPropertyPageBuyerTemplateId(String(template.id));
      setCustomPropertyPageBuyerTemplateOpen(false);
      setCustomPropertyPageBuyerTemplateName("");
      toast.success(`${template.name} is now available for buyer email drafts.`);
    },
    onError: (error) => toast.error(error.message || "The buyer email template could not be saved."),
  });
  const updatePropertyPageBuyerTemplate = trpc.propertyPages.updateBuyerEmailTemplate.useMutation({
    onSuccess: async (template) => {
      await utils.propertyPages.listBuyerEmailTemplates.invalidate();
      setPropertyPageBuyerTemplateId(String(template.id));
      setCustomPropertyPageBuyerTemplateOpen(false);
      setEditingPropertyPageBuyerTemplateId(null);
      toast.success(`${template.name} was updated.`);
    },
    onError: (error) => toast.error(error.message || "The buyer email template could not be updated."),
  });
  const deletePropertyPageBuyerTemplate = trpc.propertyPages.deleteBuyerEmailTemplate.useMutation({
    onSuccess: async (_result, variables) => {
      await utils.propertyPages.listBuyerEmailTemplates.invalidate();
      setPropertyPageBuyerTemplateId((selected) => selected === String(variables.id) ? "" : selected);
      toast.success("Buyer email template deleted.");
    },
    onError: (error) => toast.error(error.message || "The buyer email template could not be deleted."),
  });
  const setPropertyPageBuyerTemplateArchived = trpc.propertyPages.setBuyerEmailTemplateArchived.useMutation({ onSuccess: async (result, variables) => { await utils.propertyPages.listBuyerEmailTemplates.invalidate(); if (variables.archived) setPropertyPageBuyerTemplateId((current) => current === String(variables.id) ? "" : current); toast.success(result.archived ? "Buyer email template archived." : "Buyer email template restored."); }, onError: (error) => toast.error(error.message || "The buyer email template archive state could not be changed.") });

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
        const snapshot = buildPropertyLandingSnapshot(listing);
        return {
          listingAgentName: agent?.name,
          listingAgentEmail: agent?.email,
          listingAgentPhone: agent?.phone,
          zillowUrl: getZillowListingUrl(listing.sourceData),
          propertyTaxes: snapshot.propertyTaxes,
          units: snapshot.units,
          hoaDues: snapshot.hoaDues,
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
    if (selectedCustomPropertyEmailTemplate) recordTemplateUsage.mutate({ templateScope: "property_list", templateId: selectedCustomPropertyEmailTemplate.id });
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
  const firstHomeEligibleCount = useMemo(
    () => allSnapshotListings.filter((listing) => isFirstHomeLmiPriceEligible(listing.sourceData)).length,
    [allSnapshotListings]
  );
  const firstHomeMetadataCount = useMemo(
    () => allSnapshotListings.filter((listing) => parseFirstHomeScreening(listing.sourceData)?.available).length,
    [allSnapshotListings]
  );
  const searchedListings = useMemo(
    () => filterAndSortGeoSphereListings(listings, listingSearch, listingSort),
    [listings, listingSearch, listingSort]
  );
  const firstHomeFilteredListings = useMemo(
    () => firstHomeOnly ? searchedListings.filter((listing) => isFirstHomeLmiPriceEligible(listing.sourceData)) : searchedListings,
    [firstHomeOnly, searchedListings]
  );
  const visibleListings = useMemo(
    () => listingAgentKey === ALL_LISTING_AGENTS ? firstHomeFilteredListings : filterByImportedListingAgent(firstHomeFilteredListings, listingAgentKey),
    [firstHomeFilteredListings, listingAgentKey]
  );
  const hasInventoryFilters = Boolean(listingSearch.trim()) || listingSort !== "address" || overlay !== "all" || firstHomeOnly || listingAgentKey !== ALL_LISTING_AGENTS;
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
  const selectedPropertyPageBuyerTemplate = useMemo(
    () => (propertyPageBuyerTemplatesQuery.data ?? []).find((template) => String(template.id) === propertyPageBuyerTemplateId),
    [propertyPageBuyerTemplateId, propertyPageBuyerTemplatesQuery.data]
  );
  const propertyPageListing = useMemo(
    () => (listingsQuery.data ?? []).find((listing) => listing.id === propertyPageListingId) ?? null,
    [listingsQuery.data, propertyPageListingId]
  );
  const builderProgramContributionLimit = calculateEffectiveContributionScreeningLimit({
    price: propertyPageListing?.price ?? null,
    program: propertyPageContributionProgram,
    conventionalOccupancy: propertyPageConventionalOccupancy,
    conventionalLtvTier: propertyPageConventionalLtvTier,
    limits: programLimitDrafts,
  });
  const builderContributionNeedsReview = builderProgramContributionLimit !== null && Number.isFinite(Number(propertyPageMaxSellerContribution)) && Number(propertyPageMaxSellerContribution) > builderProgramContributionLimit;
  const openPropertyPageBuilder = (listingId: number) => {
    setPropertyPageListingId(listingId);
    setPropertyPageLoanOfficerId(officers[0] ? String(officers[0].id) : "");
    setPropertyPageAgentId(agents[0] ? String(agents[0].id) : "");
    setPropertyPageExternalUrl("");
    setPropertyPageTaxes("");
    setPropertyPageUnits("");
    setPropertyPageHoaDues("");
    setPropertyPageHomeownerInsurance("");
    setPropertyPageMortgageInsurance("");
    setPropertyPageComplianceApprovalStatus("draft");
    setPropertyPageContributionProgram("none");
    setPropertyPageConventionalOccupancy("primary");
    setPropertyPageConventionalLtvTier("lte80");
    setPropertyPageMaxSellerContribution("");
    setPropertyPageBuilderOpen(true);
  };
  const submitPropertyPage = () => {
    if (!propertyPageListingId || !propertyPageLoanOfficerId || !propertyPageAgentId) {
      toast.error("Choose a saved listing, loan officer, and co-branded agent first.");
      return;
    }
    const taxes = parseOptionalCurrencyAmount(propertyPageTaxes, "Annual property taxes", 10_000_000);
    const hoaDues = parseOptionalCurrencyAmount(propertyPageHoaDues, "Monthly HOA dues", 100_000);
    const homeownerInsurance = parseOptionalCurrencyAmount(propertyPageHomeownerInsurance, "Monthly homeowner insurance", 100_000);
    const mortgageInsurance = parseOptionalCurrencyAmount(propertyPageMortgageInsurance, "Monthly mortgage insurance", 100_000);
    const maxSellerContribution = parseOptionalCurrencyAmount(propertyPageMaxSellerContribution, "Maximum seller contribution", 1_000_000);
    if ("error" in taxes) { toast.error(taxes.error); return; }
    if ("error" in hoaDues) { toast.error(hoaDues.error); return; }
    if ("error" in homeownerInsurance) { toast.error(homeownerInsurance.error); return; }
    if ("error" in mortgageInsurance) { toast.error(mortgageInsurance.error); return; }
    if ("error" in maxSellerContribution) { toast.error(maxSellerContribution.error); return; }
    const programContributionLimit = calculateEffectiveContributionScreeningLimit({
      price: propertyPageListing?.price ?? null,
      program: propertyPageContributionProgram,
      conventionalOccupancy: propertyPageConventionalOccupancy,
      conventionalLtvTier: propertyPageConventionalLtvTier,
      limits: programLimitDrafts,
    });
    createPropertyPage.mutate({
      geosphereListingId: propertyPageListingId,
      loanOfficerId: Number(propertyPageLoanOfficerId),
      agentId: Number(propertyPageAgentId),
      externalListingUrl: propertyPageExternalUrl.trim(),
      ...(taxes.value !== null ? { propertyTaxes: taxes.value } : {}),
      ...(propertyPageUnits.trim() ? { units: propertyPageUnits.trim() } : {}),
      ...(hoaDues.value !== null ? { hoaDues: hoaDues.value } : {}),
      ...(homeownerInsurance.value !== null ? { homeownerInsurance: homeownerInsurance.value } : {}),
      ...(mortgageInsurance.value !== null ? { mortgageInsurance: mortgageInsurance.value } : {}),
      complianceApprovalStatus: propertyPageComplianceApprovalStatus,
      contributionProgram: propertyPageContributionProgram,
      conventionalOccupancy: propertyPageConventionalOccupancy,
      conventionalLtvTier: propertyPageConventionalLtvTier,
      programContributionLimit,
      ...(maxSellerContribution.value !== null ? { maxSellerContribution: maxSellerContribution.value } : {}),
    });
  };
  const savePropertyPageFacts = (pageId: number, draft: { propertyTaxes: string; units: string; hoaDues: string; homeownerInsurance: string; mortgageInsurance: string; complianceApprovalStatus: "draft" | "submitted" | "approved" | "changes_requested"; contributionProgram: "none" | "fha" | "va" | "usda" | "conventional"; conventionalOccupancy: "primary" | "second_home" | "investment"; conventionalLtvTier: "lte80" | "ltv81_90" | "gt90"; maxSellerContribution: string }) => {
    const taxes = parseOptionalCurrencyAmount(draft.propertyTaxes, "Annual property taxes", 10_000_000);
    const hoaDues = parseOptionalCurrencyAmount(draft.hoaDues, "Monthly HOA dues", 100_000);
    const homeownerInsurance = parseOptionalCurrencyAmount(draft.homeownerInsurance, "Monthly homeowner insurance", 100_000);
    const mortgageInsurance = parseOptionalCurrencyAmount(draft.mortgageInsurance, "Monthly mortgage insurance", 100_000);
    const maxSellerContribution = parseOptionalCurrencyAmount(draft.maxSellerContribution, "Maximum seller contribution", 1_000_000);
    if ("error" in taxes) { toast.error(taxes.error); return; }
    if ("error" in hoaDues) { toast.error(hoaDues.error); return; }
    if ("error" in homeownerInsurance) { toast.error(homeownerInsurance.error); return; }
    if ("error" in mortgageInsurance) { toast.error(mortgageInsurance.error); return; }
    if ("error" in maxSellerContribution) { toast.error(maxSellerContribution.error); return; }
    const page = propertyPages.find((candidate) => candidate.id === pageId);
    const snapshot = page ? parsePropertyLandingSnapshot(page.listingSnapshot) : null;
    const programContributionLimit = calculateEffectiveContributionScreeningLimit({
      price: snapshot?.price ?? null,
      program: draft.contributionProgram,
      conventionalOccupancy: draft.conventionalOccupancy,
      conventionalLtvTier: draft.conventionalLtvTier,
      limits: programLimitDrafts,
    });
    updatePropertyPageMetadata.mutate({ id: pageId, propertyTaxes: taxes.value, units: draft.units.trim() || null, hoaDues: hoaDues.value, homeownerInsurance: homeownerInsurance.value, mortgageInsurance: mortgageInsurance.value, complianceApprovalStatus: draft.complianceApprovalStatus, contributionProgram: draft.contributionProgram, conventionalOccupancy: draft.conventionalOccupancy, conventionalLtvTier: draft.conventionalLtvTier, programContributionLimit, maxSellerContribution: maxSellerContribution.value });
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
      templateBody: selectedPropertyPageTemplate?.bodyTemplate ? richEmailTemplateToText(selectedPropertyPageTemplate.bodyTemplate) : undefined,
      propertyUrl: publicSiteUrl(`/property/${page.slug}`),
      snapshot,
      listingAgentName: snapshot.listingAgent.name,
      listingAgentEmail: snapshot.listingAgent.email,
      loanOfficer: officer,
    });
    if (selectedPropertyPageTemplate) recordTemplateUsage.mutate({ templateScope: "property_page_agent", templateId: selectedPropertyPageTemplate.id });
    window.location.href = draft;
    toast.success("Property-page listing-agent draft opened with the saved property URL.");
  };
  const selectPropertyPageTemplate = (value: string) => {
    if (value === ADD_CUSTOM_PROPERTY_PAGE_TEMPLATE) {
      setEditingPropertyPageAgentTemplateId(null);
      setCustomPropertyPageTemplateOpen(true);
      return;
    }
    setPropertyPageTemplateId(value);
  };
  const openPropertyPageAgentTemplateEditor = (template: NonNullable<typeof allPropertyPageTemplatesQuery.data>[number]) => {
    setEditingPropertyPageAgentTemplateId(template.id);
    setCustomPropertyPageTemplateName(template.name);
    setCustomPropertyPageTemplateBody(template.bodyTemplate);
    setPropertyPageAgentTemplateManagerOpen(false);
    setCustomPropertyPageTemplateOpen(true);
  };
  const selectPropertyPageBuyerTemplate = (value: string) => {
    if (value === ADD_CUSTOM_PROPERTY_PAGE_BUYER_TEMPLATE) {
      setEditingPropertyPageBuyerTemplateId(null);
      setCustomPropertyPageBuyerTemplateOpen(true);
      return;
    }
    setPropertyPageBuyerTemplateId(value);
  };
  const openPropertyPageBuyerTemplateEditor = (template: NonNullable<typeof propertyPageBuyerTemplatesQuery.data>[number]) => {
    setEditingPropertyPageBuyerTemplateId(template.id);
    setCustomPropertyPageBuyerTemplateName(template.name);
    setCustomPropertyPageBuyerTemplateSubject(template.subjectTemplate);
    setCustomPropertyPageBuyerTemplateBody(template.bodyTemplate);
    setPropertyPageBuyerTemplateManagerOpen(false);
    setCustomPropertyPageBuyerTemplateOpen(true);
  };
  const openPropertyPageBuyerDraft = (page: typeof propertyPages[number]) => {
    const snapshot = parsePropertyLandingSnapshot(page.listingSnapshot);
    const officer = officers.find((candidate) => candidate.id === page.loanOfficerId);
    const agent = agents.find((candidate) => candidate.id === page.agentId);
    if (!snapshot || !officer) {
      toast.error("This property needs a valid saved snapshot and loan officer before opening a buyer email draft.");
      return;
    }
    const clientEmail = window.prompt("Enter the client email address for this buyer-summary draft:")?.trim();
    if (!clientEmail) return;
    const clientName = window.prompt("Optional client first name for the greeting:")?.trim() || "there";
    const propertyUrl = publicSiteUrl(`/property/${page.slug}`);
    const loanOfficerSignature = buildLoanOfficerEmailSignature(officer);
    const agentSignature = agent ? `${agent.name}${agent.companyName ? ` · ${agent.companyName}` : ""}${agent.phone ? ` · ${agent.phone}` : ""}` : "";
    const values: Record<string, string> = { client_name: clientName, property_address: page.address, property_url: propertyUrl, loan_officer_signature: loanOfficerSignature, agent_signature: agentSignature };
    const replaceTokens = (value: string) => value.replace(/\{\{(client_name|property_address|property_url|loan_officer_signature|agent_signature)\}\}/g, (_match, token: string) => values[token] ?? "");
    const subject = replaceTokens(selectedPropertyPageBuyerTemplate?.subjectTemplate ?? "Buyer calculation summary — {{property_address}}");
    const resolvedBody = replaceTokens(selectedPropertyPageBuyerTemplate?.bodyTemplate ? richEmailTemplateToText(selectedPropertyPageBuyerTemplate.bodyTemplate) : "Hi {{client_name}},\n\nI prepared a buyer calculation summary for {{property_address}}. Review the saved property page and current calculators here: {{property_url}}\n\nUse the page’s Buyer calculation PDF action to save the current scenario before attaching it to this message.\n\n{{loan_officer_signature}}\n\n{{agent_signature}}");
    const body = resolvedBody.includes(loanOfficerSignature) ? resolvedBody : `${resolvedBody.trim()}\n\n${loanOfficerSignature}${agentSignature && !resolvedBody.includes(agentSignature) ? `\n\n${agentSignature}` : ""}`;
    if (selectedPropertyPageBuyerTemplate) recordTemplateUsage.mutate({ templateScope: "property_page_buyer", templateId: selectedPropertyPageBuyerTemplate.id });
    window.location.href = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success(`Buyer email draft opened${selectedPropertyPageBuyerTemplate ? ` using “${selectedPropertyPageBuyerTemplate.name}.”` : "."}`);
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
    setFirstHomeOnly(false);
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
    if (editingListingAgentTemplateId) updateOutreachTemplate.mutate({ id: editingListingAgentTemplateId, name, bodyTemplate });
    else saveOutreachTemplate.mutate({ name, bodyTemplate });
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
    if (editingPropertyEmailTemplateId) updatePropertyEmailTemplate.mutate({ id: editingPropertyEmailTemplateId, name, bodyTemplate });
    else savePropertyEmailTemplate.mutate({ name, bodyTemplate });
  };

  const recordAndOpenListingAgentDraft = (input: { listingIds: number[]; mailto: string; agentName: string }) => {
    const templateName = selectedOutreachTemplate?.name ?? "General buyer-attraction outreach";
    recordListingEmailActivity.mutate(
      { listingIds: input.listingIds, templateName },
      {
        onSuccess: async (activities) => {
          await utils.geosphere.listListings.invalidate();
          if (selectedOutreachTemplate) recordTemplateUsage.mutate({ templateScope: "listing_agent", templateId: selectedOutreachTemplate.id });
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
    const csv = buildGeoSphereInventoryCsv(visibleListings.map((listing) => {
      const snapshot = buildPropertyLandingSnapshot(listing);
      return { ...listing, propertyTaxes: snapshot.propertyTaxes, units: snapshot.units, hoaDues: snapshot.hoaDues, homeownerInsurance: snapshot.homeownerInsurance, mortgageInsurance: snapshot.mortgageInsurance };
    }));
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
            {firstHomeMetadataCount > 0 ? <span className="rounded-full bg-sky-500/10 px-3 py-2 text-sky-800">FirstHome screen: {firstHomeEligibleCount}</span> : null}
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
                <button
                  type="button"
                  onClick={() => setFirstHomeOnly((value) => !value)}
                  aria-pressed={firstHomeOnly}
                  disabled={firstHomeMetadataCount === 0}
                  title={firstHomeMetadataCount === 0 ? "FirstHome metadata will appear after the next GeoSphere saved-pull sync." : "Show LMI listings at or below the applicable targeted or non-targeted FirstHome purchase-price maximum."}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${firstHomeOnly ? "border-sky-700 bg-sky-700 text-white" : "border-sky-500/35 bg-sky-500/10 text-sky-900 hover:bg-sky-500/15"} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <SearchCheck className="mr-1 inline-block h-3.5 w-3.5" /> FirstHome: LMI + purchase price {firstHomeMetadataCount > 0 ? `(${firstHomeEligibleCount})` : "(sync to load)"}
                </button>
                <span className="ml-auto text-xs font-semibold text-muted-foreground" aria-live="polite">Showing {visibleListings.length} of {listings.length}</span>
              </div>
              {firstHomeOnly ? <p className="mt-3 rounded-md border border-sky-500/25 bg-sky-500/[0.06] px-3 py-2 text-xs leading-relaxed text-sky-950">Showing saved listings that GeoSphere screened as LMI and at or below the applicable <strong>OHCS Flex Lending FirstHome</strong> targeted or non-targeted maximum purchase price. This is saved-screening context only; confirm current program requirements before outreach or borrower guidance.</p> : null}
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
                  <Button type="button" size="sm" variant="outline" className="h-9 text-xs" onClick={() => setListingAgentTemplateManagerOpen(true)}>Manage</Button>
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
                      {visibleListings.map((listing) => {
                        const firstHomeLabel = firstHomeScreeningLabel(parseFirstHomeScreening(listing.sourceData));
                        return <tr key={listing.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25">
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
                          <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{listing.isLmi === 1 ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-800">LMI</span> : null}{listing.isUsda === 1 ? <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[11px] font-bold text-emerald-800">USDA RD</span> : null}{firstHomeLabel ? <span title={firstHomeLabel} className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-bold text-sky-900">FirstHome</span> : null}{listing.isLmi === 0 && listing.isUsda === 0 && !firstHomeLabel ? <span className="text-xs text-muted-foreground">General</span> : null}</div>{firstHomeLabel ? <p className="mt-1 max-w-48 text-[10px] leading-snug text-sky-900">{firstHomeLabel}</p> : null}</td>
                          <td className="px-4 py-3 align-top"><ListingCommunicationStatus lastEmailSentAt={listing.lastEmailSentAt} emailResendCount={listing.emailResendCount} lastEmailTemplateName={listing.lastEmailTemplateName} /></td>
                          <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-3"><ListingDetails sourceData={listing.sourceData} address={listing.address} /><button type="button" onClick={() => openPropertyPageBuilder(listing.id)} className="text-xs font-semibold text-primary hover:underline">Property page</button>{visibleListingAgents.get(listing.id) ? <button type="button" disabled={recordListingEmailActivity.isPending} onClick={() => openSingleListingAgentDraft(listing)} className="text-xs font-semibold text-primary hover:underline disabled:cursor-wait disabled:opacity-50">Agent draft</button> : null}</div></td>
                        </tr>;
                      })}
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
                <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row">
                  <Select value={propertyPageTemplateId} onValueChange={selectPropertyPageTemplate}>
                    <SelectTrigger className="h-9 w-full bg-card text-xs lg:w-[260px]"><SelectValue placeholder={propertyPageTemplatesQuery.isLoading ? "Loading agent templates…" : "Agent email template"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ADD_CUSTOM_PROPERTY_PAGE_TEMPLATE}>Add template</SelectItem>
                      {(propertyPageTemplatesQuery.data ?? []).map((template) => <SelectItem key={template.id} value={String(template.id)}>Saved · {template.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" className="h-9 text-xs" onClick={() => setPropertyPageAgentTemplateManagerOpen(true)}>Manage</Button>
                  <Select value={propertyPageBuyerTemplateId} onValueChange={selectPropertyPageBuyerTemplate}>
                    <SelectTrigger className="h-9 w-full bg-card text-xs lg:w-[260px]"><SelectValue placeholder={propertyPageBuyerTemplatesQuery.isLoading ? "Loading buyer templates…" : "Buyer email template"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ADD_CUSTOM_PROPERTY_PAGE_BUYER_TEMPLATE}>Add buyer template</SelectItem>
                      {(propertyPageBuyerTemplatesQuery.data ?? []).map((template) => <SelectItem key={template.id} value={String(template.id)}>Saved · {template.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" className="h-9 text-xs" onClick={() => setPropertyPageBuyerTemplateManagerOpen(true)}>Manage</Button>
                </div>
              </div>
              <details className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.045] p-3">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">Program contribution limits <span className="font-normal text-muted-foreground">(private internal settings)</span></summary>
                <p className="mt-2 max-w-4xl text-[11px] leading-relaxed text-muted-foreground">Set a sales-price percentage and/or fixed USD ceiling for FHA, VA, USDA, and each conventional screen. Percentages are always calculated from the saved property sales price—not loan amount. If both are entered, the stricter amount applies. Values require current corporate-compliance or qualified-counsel review and are not public program guidance.</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {PROGRAM_CONTRIBUTION_LIMIT_KEYS.map((key) => <div key={key} className="rounded-md border border-border bg-background/80 p-2.5"><p className="text-[11px] font-semibold text-foreground">{PROGRAM_LIMIT_LABELS[key]}</p><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[10px] font-medium text-muted-foreground">% sales price<Input className="mt-1 h-8 bg-card text-xs" type="number" min="0" max="100" step="0.01" inputMode="decimal" value={(programLimitDrafts[key].percentBps / 100).toFixed(2)} onChange={(event) => { const percent = Number(event.target.value); setProgramLimitDrafts((current) => ({ ...current, [key]: { ...current[key], percentBps: Number.isFinite(percent) ? Math.round(percent * 100) : 0 } })); }} /></label><label className="text-[10px] font-medium text-muted-foreground">USD cap<Input className="mt-1 h-8 bg-card text-xs" type="number" min="0" step="0.01" inputMode="decimal" value={programLimitDrafts[key].dollarCap ?? ""} onChange={(event) => { const raw = event.target.value.trim(); const amount = raw ? Number(raw) : null; setProgramLimitDrafts((current) => ({ ...current, [key]: { ...current[key], dollarCap: amount !== null && Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null } })); }} placeholder="None" /></label></div></div>)}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-muted-foreground">For conventional primary/second-home cases, the relevant LTV screen also applies when selected; the lowest resulting cap wins.</p><Button type="button" size="sm" disabled={saveProgramContributionLimits.isPending} onClick={() => saveProgramContributionLimits.mutate({ limits: programLimitDrafts })}>{saveProgramContributionLimits.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}Save program limits</Button></div>
              </details>
              {propertyPagesQuery.isLoading ? <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading saved property pages…</div> : propertyPages.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-border bg-card/60 p-5 text-sm text-muted-foreground">No property pages yet. Use <strong className="text-foreground">Property page</strong> in any saved listing row above to create one.</div> : <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {propertyPages.map((page) => {
                  const snapshot = parsePropertyLandingSnapshot(page.listingSnapshot);
                  const pairDraft = propertyPagePairDrafts[page.id] ?? { loanOfficerId: String(page.loanOfficerId ?? ""), agentId: String(page.agentId ?? "") };
                  const metadataDraft = propertyPageMetadataDrafts[page.id] ?? {
                    propertyTaxes: snapshot?.propertyTaxes === null || snapshot?.propertyTaxes === undefined ? "" : String(snapshot.propertyTaxes),
                    units: snapshot?.units ?? "",
                    hoaDues: snapshot?.hoaDues === null || snapshot?.hoaDues === undefined ? "" : String(snapshot.hoaDues),
                    homeownerInsurance: snapshot?.homeownerInsurance === null || snapshot?.homeownerInsurance === undefined ? "" : String(snapshot.homeownerInsurance),
                    mortgageInsurance: snapshot?.mortgageInsurance === null || snapshot?.mortgageInsurance === undefined ? "" : String(snapshot.mortgageInsurance),
                    complianceApprovalStatus: snapshot?.complianceApprovalStatus ?? "draft",
                    contributionProgram: snapshot?.contributionProgram ?? "none",
                    conventionalOccupancy: snapshot?.conventionalOccupancy ?? "primary",
                    conventionalLtvTier: snapshot?.conventionalLtvTier ?? "lte80",
                    maxSellerContribution: snapshot?.maxSellerContribution === null || snapshot?.maxSellerContribution === undefined ? "" : String(snapshot.maxSellerContribution),
                  };
                  const currentProgramCap = calculateEffectiveContributionScreeningLimit({ price: snapshot?.price ?? null, program: metadataDraft.contributionProgram, conventionalOccupancy: metadataDraft.conventionalOccupancy, conventionalLtvTier: metadataDraft.conventionalLtvTier, limits: programLimitDrafts });
                  const enteredSellerContribution = Number(metadataDraft.maxSellerContribution);
                  const contributionNeedsReview = currentProgramCap !== null && Number.isFinite(enteredSellerContribution) && enteredSellerContribution > currentProgramCap;
                  const url = publicSiteUrl(`/property/${page.slug}`);
                  return <div key={page.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-foreground">{page.address}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${page.isActive === 1 ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{page.isActive === 1 ? "Public" : "Retired"}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${snapshot?.complianceApprovalStatus === "approved" ? "bg-emerald-100 text-emerald-800" : snapshot?.complianceApprovalStatus === "changes_requested" ? "bg-rose-100 text-rose-800" : snapshot?.complianceApprovalStatus === "submitted" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>Compliance · {COMPLIANCE_STATUS_OPTIONS.find((option) => option.value === (snapshot?.complianceApprovalStatus ?? "draft"))?.label}</span></div><p className="mt-1 text-xs text-muted-foreground">Saved snapshot {page.sourceSavedAt ? new Date(page.sourceSavedAt).toLocaleString() : "date unavailable"} · {snapshot?.isLmi && snapshot?.isUsda ? "LMI + USDA RD screen" : snapshot?.isLmi ? "LMI screen" : snapshot?.isUsda ? "USDA RD screen" : "general financing review"}</p></div>
                      <div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View</a></Button><Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success("Property-page URL copied."); } catch { toast.error("Copy failed; select the URL from View instead."); } }}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</Button></div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-muted-foreground">Loan officer<Select value={pairDraft.loanOfficerId} onValueChange={(value) => setPropertyPagePairDrafts((current) => ({ ...current, [page.id]: { ...pairDraft, loanOfficerId: value } }))}><SelectTrigger className="mt-1.5 h-9 bg-background text-xs"><SelectValue placeholder="Choose loan officer" /></SelectTrigger><SelectContent>{officers.map((officer) => <SelectItem key={officer.id} value={String(officer.id)}>{officer.name}</SelectItem>)}</SelectContent></Select></label>
                      <label className="text-xs font-semibold text-muted-foreground">Co-branded agent<Select value={pairDraft.agentId} onValueChange={(value) => setPropertyPagePairDrafts((current) => ({ ...current, [page.id]: { ...pairDraft, agentId: value } }))}><SelectTrigger className="mt-1.5 h-9 bg-background text-xs"><SelectValue placeholder="Choose agent" /></SelectTrigger><SelectContent>{agents.map((agent) => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}</SelectContent></Select></label>
                    </div>
                    <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-xs font-semibold text-muted-foreground">External live-listing URL <span className="font-normal">(optional)</span><Input className="mt-1.5 h-9 bg-background text-xs" type="url" value={propertyPageExternalUrlDrafts[page.id] ?? page.externalListingUrl ?? ""} onChange={(event) => setPropertyPageExternalUrlDrafts((current) => ({ ...current, [page.id]: event.target.value }))} placeholder="https://your-crm.example/property/..." /></label><Button size="sm" variant="outline" disabled={updatePropertyPageExternalUrl.isPending} onClick={() => updatePropertyPageExternalUrl.mutate({ id: page.id, externalListingUrl: (propertyPageExternalUrlDrafts[page.id] ?? page.externalListingUrl ?? "").trim() })}><Link2 className="mr-1.5 h-3.5 w-3.5" />Save live link</Button></div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Use an authorized Surefire, Total Expert, MLS-vendor, or other third-party property URL. This page only links out—it does not fetch, copy, or represent third-party listing data as live.</p>{page.externalListingUrl ? <a href={page.externalListingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Open saved live-listing link <ExternalLink className="h-3 w-3" /></a> : null}</div>
                    <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-foreground">Saved property facts</p><Button size="sm" variant="outline" onClick={() => { setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: metadataDraft })); setPropertyPageMetadataEditorId((current) => current === page.id ? null : page.id); }}>{propertyPageMetadataEditorId === page.id ? "Close editor" : "Edit property facts"}</Button></div>
                      {propertyPageMetadataEditorId === page.id ? <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <label className="text-xs font-semibold text-muted-foreground">Annual property taxes<Input className="mt-1.5 h-9 bg-background text-xs" type="number" min="0" step="1" value={metadataDraft.propertyTaxes} onChange={(event) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, propertyTaxes: event.target.value } }))} placeholder="e.g., 2400" /></label>
                        <label className="text-xs font-semibold text-muted-foreground">Units<Input className="mt-1.5 h-9 bg-background text-xs" value={metadataDraft.units} maxLength={80} onChange={(event) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, units: event.target.value } }))} placeholder="e.g., 2" /></label>
                        <label className="text-xs font-semibold text-muted-foreground">Monthly HOA dues<Input className="mt-1.5 h-9 bg-background text-xs" type="number" min="0" step="0.01" value={metadataDraft.hoaDues} onChange={(event) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, hoaDues: event.target.value } }))} placeholder="e.g., 125" /></label>
                        <label className="text-xs font-semibold text-muted-foreground">Monthly homeowner insurance<Input className="mt-1.5 h-9 bg-background text-xs" type="number" min="0" step="0.01" value={metadataDraft.homeownerInsurance} onChange={(event) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, homeownerInsurance: event.target.value } }))} placeholder="e.g., 145" /></label>
                        <label className="text-xs font-semibold text-muted-foreground">Monthly mortgage insurance<Input className="mt-1.5 h-9 bg-background text-xs" type="number" min="0" step="0.01" value={metadataDraft.mortgageInsurance} onChange={(event) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, mortgageInsurance: event.target.value } }))} placeholder="e.g., 180" /></label>
                        <label className="text-xs font-semibold text-muted-foreground">Compliance review status<Select value={metadataDraft.complianceApprovalStatus} onValueChange={(value) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, complianceApprovalStatus: value as typeof metadataDraft.complianceApprovalStatus } }))}><SelectTrigger className="mt-1.5 h-9 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent>{COMPLIANCE_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>
                        <label className="text-xs font-semibold text-muted-foreground">Contribution program<Select value={metadataDraft.contributionProgram} onValueChange={(value) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, contributionProgram: value as typeof metadataDraft.contributionProgram } }))}><SelectTrigger className="mt-1.5 h-9 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent>{CONTRIBUTION_PROGRAM_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>
                        {metadataDraft.contributionProgram === "conventional" ? <><label className="text-xs font-semibold text-muted-foreground">Conventional occupancy<Select value={metadataDraft.conventionalOccupancy} onValueChange={(value) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, conventionalOccupancy: value as typeof metadataDraft.conventionalOccupancy } }))}><SelectTrigger className="mt-1.5 h-9 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent>{CONVENTIONAL_OCCUPANCY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label><label className="text-xs font-semibold text-muted-foreground">Conventional LTV tier<Select value={metadataDraft.conventionalLtvTier} onValueChange={(value) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, conventionalLtvTier: value as typeof metadataDraft.conventionalLtvTier } }))}><SelectTrigger className="mt-1.5 h-9 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent>{CONVENTIONAL_LTV_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label></> : null}
                        <label className="text-xs font-semibold text-muted-foreground">Seller contribution to screen <span className="font-normal">(internal USD)</span><Input className="mt-1.5 h-9 bg-background text-xs" type="number" min="0" step="0.01" inputMode="decimal" value={metadataDraft.maxSellerContribution} onChange={(event) => setPropertyPageMetadataDrafts((current) => ({ ...current, [page.id]: { ...metadataDraft, maxSellerContribution: event.target.value } }))} placeholder="e.g., 12000" /></label>
                        <div className="sm:col-span-2 xl:col-span-4 flex items-center justify-between gap-3"><p className={`text-[11px] leading-relaxed ${contributionNeedsReview ? "font-semibold text-rose-700" : "text-muted-foreground"}`}>{metadataDraft.contributionProgram === "none" ? "Choose a program to apply your private sales-price percentage and dollar-cap screen." : currentProgramCap === null ? "Saved sales price is required before a program cap can be screened." : contributionNeedsReview ? `Review needed: entered seller contribution exceeds the stricter configured cap of ${usd(currentProgramCap)}.` : `Current private program screen: ${usd(currentProgramCap)} based on the saved sales price; percentages never use loan amount.`}</p><Button size="sm" disabled={updatePropertyPageMetadata.isPending} onClick={() => savePropertyPageFacts(page.id, metadataDraft)}>Save facts</Button></div>
                      </div> : <p className="mt-2 text-[11px] text-muted-foreground">Taxes: {snapshot?.propertyTaxes === null || snapshot?.propertyTaxes === undefined ? "not saved" : usd(snapshot.propertyTaxes)} · Units: {snapshot?.units ?? "not saved"} · HOA: {snapshot?.hoaDues === null || snapshot?.hoaDues === undefined ? "not saved" : `${usd(snapshot.hoaDues)}/mo`} · Home insurance: {snapshot?.homeownerInsurance === null || snapshot?.homeownerInsurance === undefined ? "not saved" : `${usd(snapshot.homeownerInsurance)}/mo`} · Mortgage insurance: {snapshot?.mortgageInsurance === null || snapshot?.mortgageInsurance === undefined ? "not saved" : `${usd(snapshot.mortgageInsurance)}/mo`} · Program screen: {snapshot?.programContributionLimit === null || snapshot?.programContributionLimit === undefined ? "not saved" : usd(snapshot.programContributionLimit)} · Contribution to screen: {snapshot?.maxSellerContribution === null || snapshot?.maxSellerContribution === undefined ? "not saved" : usd(snapshot.maxSellerContribution)}</p>}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={() => savePropertyPagePair(page.id, page)} disabled={updatePropertyPagePair.isPending}><Link2 className="mr-1.5 h-3.5 w-3.5" /> Save pairing</Button><Button size="sm" onClick={() => openPropertyPageAgentDraft(page)}><Mail className="mr-1.5 h-3.5 w-3.5" /> Agent email draft</Button><Button size="sm" variant="outline" onClick={() => openPropertyPageBuyerDraft(page)}><Mail className="mr-1.5 h-3.5 w-3.5" /> Buyer email draft</Button>{snapshot ? <Button size="sm" variant="outline" onClick={() => printAllInMonthlyCostSummary(page.address, snapshot)}><Printer className="mr-1.5 h-3.5 w-3.5" /> Print all-in costs</Button> : null}<Button size="sm" variant="outline" disabled={refreshPropertyPageSnapshot.isPending} onClick={() => refreshPropertyPageSnapshot.mutate({ id: page.id })}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh saved snapshot</Button><label className="ml-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">{page.isActive === 1 ? "Public" : "Retired"}<input type="checkbox" role="switch" aria-label={`Make ${page.address} ${page.isActive === 1 ? "retired" : "public"}`} checked={page.isActive === 1} disabled={setPropertyPageActive.isPending} onChange={(event) => setPropertyPageActive.mutate({ id: page.id, isActive: event.target.checked })} className="h-4 w-8 cursor-pointer accent-primary" /></label></div>
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
                  <Button type="button" size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={() => setPropertyEmailTemplateManagerOpen(true)}>Manage saved templates</Button>
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
              <UniversalEmailTemplateEditor id="listing-agent-template-body" value={customTemplateBody} onChange={setCustomTemplateBody} workflow="listing_agent" maxLength={6000} placeholder="Describe the buyer-attraction opportunity in your own words. The greeting, property lines, saved program labels, required eligibility language, and Mike Ford’s complete signature are added automatically." />
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
              <UniversalEmailTemplateEditor id="property-email-template-body" value={customPropertyTemplateBody} onChange={setCustomPropertyTemplateBody} workflow="property_list" maxLength={6000} placeholder="Write your warm introductory message. The greeting, selected properties, Zillow links, listing-agent contacts, buyer-agent assistance, and Mike Ford’s complete signature are added automatically." />
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1.5"><Label htmlFor="property-page-taxes">Property taxes <span className="font-normal text-muted-foreground">(annual USD, optional)</span></Label><Input id="property-page-taxes" type="number" min="0" step="1" inputMode="decimal" value={propertyPageTaxes} onChange={(event) => setPropertyPageTaxes(event.target.value)} placeholder="e.g., 2400" /><p className="text-xs text-muted-foreground">Shown as the saved annual tax amount on the public property details.</p></div>
              <div className="space-y-1.5"><Label htmlFor="property-page-units">Units <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="property-page-units" value={propertyPageUnits} onChange={(event) => setPropertyPageUnits(event.target.value)} maxLength={80} placeholder="e.g., 2" /><p className="text-xs text-muted-foreground">Use the official unit count or an appropriate property-unit label.</p></div>
              <div className="space-y-1.5"><Label htmlFor="property-page-hoa-dues">HOA dues <span className="font-normal text-muted-foreground">(monthly USD, optional)</span></Label><Input id="property-page-hoa-dues" type="number" min="0" step="0.01" inputMode="decimal" value={propertyPageHoaDues} onChange={(event) => setPropertyPageHoaDues(event.target.value)} placeholder="e.g., 125" /><p className="text-xs text-muted-foreground">Shown as saved monthly HOA dues on the public property details.</p></div>
              <div className="space-y-1.5"><Label htmlFor="property-page-homeowner-insurance">Homeowner insurance <span className="font-normal text-muted-foreground">(monthly USD, optional)</span></Label><Input id="property-page-homeowner-insurance" type="number" min="0" step="0.01" inputMode="decimal" value={propertyPageHomeownerInsurance} onChange={(event) => setPropertyPageHomeownerInsurance(event.target.value)} placeholder="e.g., 145" /><p className="text-xs text-muted-foreground">Used as saved monthly planning context, not an insurance quote.</p></div>
              <div className="space-y-1.5"><Label htmlFor="property-page-mortgage-insurance">Mortgage insurance <span className="font-normal text-muted-foreground">(monthly USD, optional)</span></Label><Input id="property-page-mortgage-insurance" type="number" min="0" step="0.01" inputMode="decimal" value={propertyPageMortgageInsurance} onChange={(event) => setPropertyPageMortgageInsurance(event.target.value)} placeholder="e.g., 180" /><p className="text-xs text-muted-foreground">Planning estimate only; verify loan-specific mortgage insurance with the loan officer.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Compliance review status <span className="font-normal text-muted-foreground">(private)</span></Label><Select value={propertyPageComplianceApprovalStatus} onValueChange={(value) => setPropertyPageComplianceApprovalStatus(value as typeof propertyPageComplianceApprovalStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COMPLIANCE_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Tracks internal or corporate review progress; it is never shown on the public page.</p></div>
              <div className="space-y-1.5"><Label>Contribution program <span className="font-normal text-muted-foreground">(private)</span></Label><Select value={propertyPageContributionProgram} onValueChange={(value) => setPropertyPageContributionProgram(value as typeof propertyPageContributionProgram)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTRIBUTION_PROGRAM_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Uses the private Program contribution limits settings saved for the selected program.</p></div>
            </div>
            {propertyPageContributionProgram === "conventional" ? <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Conventional occupancy</Label><Select value={propertyPageConventionalOccupancy} onValueChange={(value) => setPropertyPageConventionalOccupancy(value as typeof propertyPageConventionalOccupancy)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONVENTIONAL_OCCUPANCY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Conventional LTV tier</Label><Select value={propertyPageConventionalLtvTier} onValueChange={(value) => setPropertyPageConventionalLtvTier(value as typeof propertyPageConventionalLtvTier)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONVENTIONAL_LTV_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div></div> : null}
            <div className="space-y-1.5"><Label htmlFor="property-page-seller-contribution">Seller contribution to screen <span className="font-normal text-muted-foreground">(internal USD, optional)</span></Label><Input id="property-page-seller-contribution" type="number" min="0" step="0.01" inputMode="decimal" value={propertyPageMaxSellerContribution} onChange={(event) => setPropertyPageMaxSellerContribution(event.target.value)} placeholder="e.g., 12000" /><p className={`text-xs ${builderContributionNeedsReview ? "font-semibold text-rose-700" : "text-muted-foreground"}`}>{propertyPageContributionProgram === "none" ? "Choose a program to apply a private seller-contribution screen." : builderProgramContributionLimit === null ? "A saved sales price is required before the program cap can be calculated." : builderContributionNeedsReview ? `Review needed: entered contribution exceeds the stricter configured cap of ${usd(builderProgramContributionLimit)}.` : `Current private program screen: ${usd(builderProgramContributionLimit)}. The percentage is calculated from sales price, never loan amount.`}</p></div>
            <div className="space-y-1.5"><Label htmlFor="property-page-external-url">Existing live property-page URL <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="property-page-external-url" type="url" value={propertyPageExternalUrl} onChange={(event) => setPropertyPageExternalUrl(event.target.value)} placeholder="https://surefire.com/... or https://totalexpert.com/..." /><p className="text-xs leading-relaxed text-muted-foreground">For an authorized third-party CRM or MLS-vendor property page. We link to it from this saved-snapshot page but do not pull in its photos, description, status, or other listing data.</p></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPropertyPageBuilderOpen(false)} disabled={createPropertyPage.isPending}>Cancel</Button><Button onClick={submitPropertyPage} disabled={createPropertyPage.isPending || !propertyPageListingId || !propertyPageLoanOfficerId || !propertyPageAgentId}>{createPropertyPage.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />} Save property page</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={customPropertyPageTemplateOpen} onOpenChange={setCustomPropertyPageTemplateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editingPropertyPageAgentTemplateId ? "Edit property-page agent email template" : "Add property-page agent email template"}</DialogTitle>
            <DialogDescription>Write only the reusable introduction. Every draft automatically adds the listing-agent recipient, property-page URL, saved property details, program-screening context, snapshot limitation, and the assigned loan officer signature.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="property-page-agent-template-name">Template name</Label><Input id="property-page-agent-template-name" value={customPropertyPageTemplateName} onChange={(event) => setCustomPropertyPageTemplateName(event.target.value)} maxLength={160} placeholder="e.g., New co-branded property page" /></div>
            <div className="space-y-1.5"><Label htmlFor="property-page-agent-template-body">Reusable email introduction</Label><UniversalEmailTemplateEditor id="property-page-agent-template-body" value={customPropertyPageTemplateBody} onChange={setCustomPropertyPageTemplateBody} workflow="property_page_agent" maxLength={6000} placeholder="Explain the shared first-time-buyer attraction opportunity in your own words. The recipient, property URL, saved property facts, current-verification reminder, and Mike Ford’s complete signature are added automatically." /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCustomPropertyPageTemplateOpen(false)} disabled={savePropertyPageTemplate.isPending || updatePropertyPageTemplate.isPending}>Cancel</Button><Button onClick={() => { if (customPropertyPageTemplateName.trim().length < 2 || customPropertyPageTemplateBody.trim().length < 20) { toast.error("Enter a template name and at least 20 characters of reusable email copy."); return; } const input = { name: customPropertyPageTemplateName.trim(), bodyTemplate: customPropertyPageTemplateBody.trim() }; if (editingPropertyPageAgentTemplateId) updatePropertyPageTemplate.mutate({ id: editingPropertyPageAgentTemplateId, ...input }); else savePropertyPageTemplate.mutate(input); }} disabled={savePropertyPageTemplate.isPending || updatePropertyPageTemplate.isPending}>{savePropertyPageTemplate.isPending || updatePropertyPageTemplate.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}{editingPropertyPageAgentTemplateId ? "Update email template" : "Save email template"}</Button></div>
        </DialogContent>
      </Dialog>
      <Dialog open={customPropertyPageBuyerTemplateOpen} onOpenChange={(open) => { setCustomPropertyPageBuyerTemplateOpen(open); if (!open) setEditingPropertyPageBuyerTemplateId(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editingPropertyPageBuyerTemplateId ? "Edit buyer email template" : "Add buyer email template"}</DialogTitle>
            <DialogDescription>Save reusable client-facing copy for property-page buyer summaries. Available merge fields: <code>{"{{client_name}}"}</code>, <code>{"{{property_address}}"}</code>, <code>{"{{property_url}}"}</code>, <code>{"{{loan_officer_signature}}"}</code>, and <code>{"{{agent_signature}}"}</code>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="property-page-buyer-template-name">Template name</Label><Input id="property-page-buyer-template-name" value={customPropertyPageBuyerTemplateName} onChange={(event) => setCustomPropertyPageBuyerTemplateName(event.target.value)} maxLength={160} placeholder="e.g., Buyer numbers to review" /></div>
            <div className="space-y-1.5"><Label htmlFor="property-page-buyer-template-subject">Email subject</Label><Input id="property-page-buyer-template-subject" value={customPropertyPageBuyerTemplateSubject} onChange={(event) => setCustomPropertyPageBuyerTemplateSubject(event.target.value)} maxLength={300} placeholder="Buyer calculation summary — {{property_address}}" /></div>
            <div className="space-y-1.5"><Label htmlFor="property-page-buyer-template-body">Reusable buyer email body</Label><UniversalEmailTemplateEditor id="property-page-buyer-template-body" value={customPropertyPageBuyerTemplateBody} onChange={setCustomPropertyPageBuyerTemplateBody} workflow="property_page_buyer" maxLength={6000} placeholder="Write your client message, then use supported merge fields for property and co-brand details." /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCustomPropertyPageBuyerTemplateOpen(false)} disabled={savePropertyPageBuyerTemplate.isPending || updatePropertyPageBuyerTemplate.isPending}>Cancel</Button><Button onClick={() => { if (customPropertyPageBuyerTemplateName.trim().length < 2 || customPropertyPageBuyerTemplateSubject.trim().length < 4 || customPropertyPageBuyerTemplateBody.trim().length < 20) { toast.error("Enter a name, subject, and at least 20 characters of reusable buyer email copy."); return; } const input = { name: customPropertyPageBuyerTemplateName.trim(), subjectTemplate: customPropertyPageBuyerTemplateSubject.trim(), bodyTemplate: customPropertyPageBuyerTemplateBody.trim() }; if (editingPropertyPageBuyerTemplateId) updatePropertyPageBuyerTemplate.mutate({ id: editingPropertyPageBuyerTemplateId, ...input }); else savePropertyPageBuyerTemplate.mutate(input); }} disabled={savePropertyPageBuyerTemplate.isPending || updatePropertyPageBuyerTemplate.isPending}>{savePropertyPageBuyerTemplate.isPending || updatePropertyPageBuyerTemplate.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}{editingPropertyPageBuyerTemplateId ? "Update buyer template" : "Save buyer template"}</Button></div>
        </DialogContent>
      </Dialog>
      <EmailTemplateLifecycleManager open={listingAgentTemplateManagerOpen} onOpenChange={setListingAgentTemplateManagerOpen} title="Manage listing-agent email templates" description="Built-in templates remain available and protected. Custom drafts can be edited, archived to hide them, restored, or permanently deleted." templateScope="listing_agent" templates={(allOutreachTemplatesQuery.data ?? [])} pending={updateOutreachTemplate.isPending || setOutreachTemplateArchived.isPending || deleteOutreachTemplate.isPending} onEdit={(template) => { setEditingListingAgentTemplateId(template.id); setCustomTemplateName(template.name); setCustomTemplateBody(template.bodyTemplate); setListingAgentTemplateManagerOpen(false); setCustomTemplateOpen(true); }} onArchive={(template) => setOutreachTemplateArchived.mutate({ id: template.id, archived: true })} onRestore={(template) => setOutreachTemplateArchived.mutate({ id: template.id, archived: false })} onDelete={(template) => { if (window.confirm(`Permanently delete “${template.name}”? This cannot be undone.`)) deleteOutreachTemplate.mutate({ id: template.id }); }} onBulkArchive={(ids) => ids.forEach((id) => setOutreachTemplateArchived.mutate({ id, archived: true }))} onBulkRestore={(ids) => ids.forEach((id) => setOutreachTemplateArchived.mutate({ id, archived: false }))} onBulkDelete={(ids) => ids.forEach((id) => deleteOutreachTemplate.mutate({ id }))} onImport={async (templates) => { for (const template of templates) await saveOutreachTemplate.mutateAsync({ name: template.name, bodyTemplate: template.bodyTemplate }); }} />
      <EmailTemplateLifecycleManager open={propertyEmailTemplateManagerOpen} onOpenChange={setPropertyEmailTemplateManagerOpen} title="Manage property-list email templates" description="Archive a draft to hide it from property-list email menus, restore it later, or permanently delete it." templateScope="property_list" templates={(allPropertyTemplatesQuery.data ?? [])} pending={updatePropertyEmailTemplate.isPending || setPropertyEmailTemplateArchived.isPending || deletePropertyEmailTemplate.isPending} onEdit={(template) => { setEditingPropertyEmailTemplateId(template.id); setCustomPropertyTemplateName(template.name); setCustomPropertyTemplateBody(template.bodyTemplate); setPropertyEmailTemplateManagerOpen(false); setCustomPropertyTemplateOpen(true); }} onArchive={(template) => setPropertyEmailTemplateArchived.mutate({ id: template.id, archived: true })} onRestore={(template) => setPropertyEmailTemplateArchived.mutate({ id: template.id, archived: false })} onDelete={(template) => { if (window.confirm(`Permanently delete “${template.name}”? This cannot be undone.`)) deletePropertyEmailTemplate.mutate({ id: template.id }); }} onBulkArchive={(ids) => ids.forEach((id) => setPropertyEmailTemplateArchived.mutate({ id, archived: true }))} onBulkRestore={(ids) => ids.forEach((id) => setPropertyEmailTemplateArchived.mutate({ id, archived: false }))} onBulkDelete={(ids) => ids.forEach((id) => deletePropertyEmailTemplate.mutate({ id }))} onImport={async (templates) => { for (const template of templates) await savePropertyEmailTemplate.mutateAsync({ name: template.name, bodyTemplate: template.bodyTemplate }); }} />
      <EmailTemplateLifecycleManager open={propertyPageAgentTemplateManagerOpen} onOpenChange={setPropertyPageAgentTemplateManagerOpen} title="Manage property-page agent templates" description="Archive drafts to hide them from co-branded property page outreach, restore them when needed, or permanently delete them." templateScope="property_page_agent" templates={(allPropertyPageTemplatesQuery.data ?? [])} pending={updatePropertyPageTemplate.isPending || setPropertyPageTemplateArchived.isPending || deletePropertyPageTemplate.isPending} onEdit={(template) => openPropertyPageAgentTemplateEditor(template as NonNullable<typeof allPropertyPageTemplatesQuery.data>[number])} onArchive={(template) => setPropertyPageTemplateArchived.mutate({ id: template.id, archived: true })} onRestore={(template) => setPropertyPageTemplateArchived.mutate({ id: template.id, archived: false })} onDelete={(template) => { if (window.confirm(`Permanently delete “${template.name}”? This cannot be undone.`)) deletePropertyPageTemplate.mutate({ id: template.id }); }} onBulkArchive={(ids) => ids.forEach((id) => setPropertyPageTemplateArchived.mutate({ id, archived: true }))} onBulkRestore={(ids) => ids.forEach((id) => setPropertyPageTemplateArchived.mutate({ id, archived: false }))} onBulkDelete={(ids) => ids.forEach((id) => deletePropertyPageTemplate.mutate({ id }))} onImport={async (templates) => { for (const template of templates) await savePropertyPageTemplate.mutateAsync({ name: template.name, bodyTemplate: template.bodyTemplate }); }} />
      <EmailTemplateLifecycleManager open={propertyPageBuyerTemplateManagerOpen} onOpenChange={setPropertyPageBuyerTemplateManagerOpen} title="Manage buyer email templates" description="Edit, archive to hide, restore, or permanently delete your private buyer-summary drafts." templateScope="property_page_buyer" templates={(allPropertyPageBuyerTemplatesQuery.data ?? [])} pending={updatePropertyPageBuyerTemplate.isPending || setPropertyPageBuyerTemplateArchived.isPending || deletePropertyPageBuyerTemplate.isPending} onEdit={(template) => openPropertyPageBuyerTemplateEditor(template as NonNullable<typeof allPropertyPageBuyerTemplatesQuery.data>[number])} onArchive={(template) => setPropertyPageBuyerTemplateArchived.mutate({ id: template.id, archived: true })} onRestore={(template) => setPropertyPageBuyerTemplateArchived.mutate({ id: template.id, archived: false })} onDelete={(template) => { if (window.confirm(`Permanently delete “${template.name}”? This cannot be undone.`)) deletePropertyPageBuyerTemplate.mutate({ id: template.id }); }} onBulkArchive={(ids) => ids.forEach((id) => setPropertyPageBuyerTemplateArchived.mutate({ id, archived: true }))} onBulkRestore={(ids) => ids.forEach((id) => setPropertyPageBuyerTemplateArchived.mutate({ id, archived: false }))} onBulkDelete={(ids) => ids.forEach((id) => deletePropertyPageBuyerTemplate.mutate({ id }))} onImport={async (templates) => { for (const template of templates) await savePropertyPageBuyerTemplate.mutateAsync({ name: template.name, subjectTemplate: template.subjectTemplate || "Buyer calculation summary — {{property_address}}", bodyTemplate: template.bodyTemplate }); }} />
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
