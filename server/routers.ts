import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PROPERTY_ACTIVITY_RANGES, getPropertyActivitySince } from "@shared/propertyActivity";
import { HIGH_ACTIVITY_WEEKLY_THRESHOLD } from "@shared/propertyEngagement";
import { buydownScenarioSchema, costOfWaitingScenarioSchema } from "@shared/scenario";
import { SLUG_PATTERN, slugify } from "@shared/slug";
import {
  completeMessage,
  openingMessage,
  parseAnswer,
  type ChatStep,
  type IntakeValues,
} from "@shared/chatIntake";
import { nanoid } from "nanoid";
import { parse as parseCookie } from "cookie";
import {
  addChatTranscript,
  createChatLead,
  createTextMessageDraft,
  createTextMessageForTwilioDelivery,
  createListingAgentEmailTemplate,
  createPropertyEmailTemplate,
  createPropertyLandingPage,
  createPropertyPageAgentEmailTemplate,
  createPropertyPageBuyerEmailTemplate,
  updatePropertyPageBuyerEmailTemplate,
  deletePropertyPageBuyerEmailTemplate,
  createDirectoryOutreachEmailTemplate,
  createPlatformLeadIfAbsent,
  createPlatformLeadNote,
  createPlatformLeadProgressStatus,
  deleteDirectoryOutreachEmailTemplate,
  createDirectoryFilterPreset,
  deleteDirectoryFilterPreset,
  deletePlatformLeadProgressStatus,
  getDirectoryOutreachLastDrafts,
  listDirectoryOutreachEmailTemplates,
  listDirectoryFilterPresets,
  listPlatformLeadNotes,
  listPlatformLeadOutreachTemplates,
  ensurePlatformLeadProgressStatuses,
  listPlatformLeads,
  recordDirectoryOutreachDrafts,
  setDirectoryOutreachEmailTemplateArchived,
  setPlatformLeadArchived,
  setPlatformLeadsArchived,
  setPlatformLeadProgressStatus,
  updatePlatformLeadDetails,
  updatePlatformLeadAssignments,
  deletePlatformLeads,
  savePlatformLeadOutreachTemplate,
  listEmailTemplateAiPrompts,
  createEmailTemplateAiPrompt,
  deleteEmailTemplateAiPrompt,
  setPlatformLeadOutreachTemplateArchived,
  deletePlatformLeadOutreachTemplates,
  updateDirectoryOutreachEmailTemplate,
  createAgent,
  createLoanOfficer,
  createLoAgentSpendPairing,
  addLoAgentSpendEntry,
  updateLoAgentSpendEntry,
  createMortgagePaymentQuote,
  createWorkflowAiReviewHistory,
  createBackupHistoryEvent,
  saveAdvertisingIntegrationSetting,
  saveAdvertisingIntegrationModuleVisibility,
  saveAdvertisingIntegrationChecklist,
  saveAdvertisingIntegrationChecklistReminder,
  resetAdvertisingIntegrationChecklist,
  createTeamLoanOfficerWorkspace,
  prepareTeamLoanOfficerWorkspace,
  createTeamTemplateLibraryEntry,
  createTeamTemplateSubmission,
  createCampaignSpendEntry,
  deleteMortgagePaymentQuote,
  deleteTeamTemplateLibraryEntry,
  deleteCampaignSpendEntry,
  deleteLoAgentSpendEntry,
  deleteLoAgentSpendPairing,
  deleteAgent,
  deleteLoanOfficer,
  ensureGeoSphereSyncSetting,
  updateGeoSphereSyncSetting,
  getAgentById,
  getAgentBySlug,
  getAgentLeadStats,
  getChatLeadById,
  getChatLeadBySession,
  getChatTranscriptByLeadId,
  getFeaturedAgent,
  getFeaturedLoanOfficer,
  getLeadById,
  getLoanOfficerById,
  getLoanOfficerBySlug,
  getPropertyLandingPageById,
  getPropertyLandingPageBySlug,
  getPropertyEngagementSetting,
  getProgramContributionLimits,
  getTeamLoanOfficerWorkspaceForMember,
  getTeamLoanOfficerWorkspaceForAdminMember,
  getSyncedTopAgent,
  createSyncedAgentOutreachTemplate,
  updateSyncedAgentOutreachTemplate,
  setSyncedAgentOutreachTemplateArchived,
  deleteSyncedAgentOutreachTemplate,
  getLoAgentSpendPairingForOwner,
  getAdminTeamActivityFeed,
  getAdminTeamPerformance,
  listCampaignSpendEntries,
  listGeoSphereListings,
  listGeoSphereSavedPulls,
  listListingAgentEmailTemplates,
  updateListingAgentEmailTemplate,
  setListingAgentEmailTemplateArchived,
  deleteListingAgentEmailTemplate,
  listPropertyEmailTemplates,
  updatePropertyEmailTemplate,
  setPropertyEmailTemplateArchived,
  deletePropertyEmailTemplate,
  listPropertyLandingPages,
  listWeeklyPropertyPageEngagement,
  listPropertyPageAgentEmailTemplates,
  updatePropertyPageAgentEmailTemplate,
  setPropertyPageAgentEmailTemplateArchived,
  deletePropertyPageAgentEmailTemplate,
  listPropertyPageBuyerEmailTemplates,
  setPropertyPageBuyerEmailTemplateArchived,
  getEmailTemplateUsageCounts,
  recordEmailTemplateUsage,
  recordEmailTemplateVersion,
  listEmailTemplateVersions,
  getEmailTemplateVersion,
  getPropertyEmailPdfSummaryEngagement,
  getPropertyCalendarClickEngagement,
  loanOfficerSlugTaken,
  recordChatIntakeResendAttempt,
  recordGeoSphereListingEmailActivity,
  recordPropertyPageActivity,
  releaseTeamLoanOfficerWorkspaceHandoff,
  refreshPropertyLandingPage,
  savePropertyEngagementThreshold,
  savePropertyEngagementPreferences,
  saveProgramContributionLimits,
  listPropertyPageActivity,
  insertLead,
  listAgents,
  listChatIntakeLeads,
  listLoanOfficers,
  listLeads,
  listLoAgentSpendTrackers,
  listMortgagePaymentQuotes,
  listTeamLoanOfficerWorkspaces,
  listTeamTemplateLibrary,
  listTeamTemplateSubmissionsForAdmin,
  listTeamTemplateSubmissionsForMember,
  listWorkflowAiReviewHistory,
  listBackupHistoryEvents,
  listAdvertisingIntegrationSettings,
  getAdvertisingIntegrationModuleVisibility,
  listSyncedTopAgents,
  listSyncedAgentOutreachTemplates,
  listSyncedTopAgentRankHistory,
  listSyncedTopAgentReviews,
  listTextMessageDrafts,
  listTextChainByLead,
  listTextReadyRecipients,
  recordTextChainEvent,
  markLeadSentToAgent,
  setFeaturedAgent,
  setFeaturedLoanOfficer,
  slugTaken,
  upsertSyncedTopAgents,
  markSyncedTopAgentCreated,
  resolveSyncedTopAgentReview,
  updateAgent,
  updateChatLead,
  updateLeadAgent,
  updateLeadStatus,
  updateLeadNotes,
  updateLoanOfficer,
  updateWorkflowAiReviewOutcome,
  updateTeamLoanOfficerWorkspaceStatus,
  updateTeamTemplateLibraryEntry,
  reviewTeamTemplateSubmission,
  activateTeamLoanOfficerWorkspace,
  updatePropertyLandingPageAiSummary,
  updatePropertyLandingPageExternalListingUrl,
  updatePropertyLandingPageMetadata,
  updatePropertyLandingPagePair,
  updatePropertyLandingPageStatus,
  updateTextMessageProviderMode,
  updateTextMessageRecipientDelivery,
} from "./db";
import { syncGeoSphereSavedListings } from "./geosphere";
import { createHeartbeatJob, updateHeartbeatJob } from "./_core/heartbeat";
import { notifyOwner } from "./_core/notification";
import { buildChatIntakeNotification, buildReferralEmail, sendChatIntakeNotification, sendReferralEmail } from "./email";
import { hasUsableRoadmapPhone } from "../shared/roadmapPhone";
import { publicSiteUrl } from "../shared/publicSiteUrl";
import { storagePut } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { parsePropertyLandingSnapshot, propertyEligibilityLabel, propertyFinancingContext } from "../shared/propertyLandingPage";
import { buildSyncedAgentOutreachDraft } from "../shared/syncedAgentOutreachDraft";
import { getTwilioReadiness, safeTwilioErrorMessage, sendTwilioTextMessage } from "./twilio";

const ADMIN_ONLY_MESSAGE = "Only the site owner can manage agents.";

const optionalPublicHttpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || (/^https?:\/\//i.test(value) && z.string().url().safeParse(value).success), {
    message: "Enter a valid http(s) URL or leave blank.",
  })
  .default("");

const agentProfileInputSchema = z.object({
  name: z.string().trim().max(160).default(""),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(160)
    .refine((v) => v === "" || SLUG_PATTERN.test(v), {
      message: "Use only lowercase letters, numbers, and hyphens.",
    })
    .default(""),
  email: z
    .string()
    .trim()
    .max(320)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid email or leave blank.",
    })
    .default(""),
  phone: z.string().trim().max(40).default(""),
  bio: z.string().trim().max(2000).default(""),
  website: z.string().trim().max(500).default(""),
  facebookUrl: optionalPublicHttpUrl,
  instagramUrl: optionalPublicHttpUrl,
  linkedinUrl: optionalPublicHttpUrl,
  companyName: z.string().trim().max(200).default(""),
  headshotUrl: z.string().trim().max(500).default(""),
  companyLogoUrl: z.string().trim().max(500).default(""),
  syncedTopAgentId: z.number().int().positive().nullable().default(null),
  visible: z.boolean().default(true),
});

const directoryOutreachAudienceSchema = z.enum(["agent", "loan_officer"]);
const directoryOutreachTemplateInputSchema = z.object({
  audience: directoryOutreachAudienceSchema,
  name: z.string().trim().min(2).max(160),
  subjectTemplate: z.string().trim().min(4).max(300),
  bodyTemplate: z.string().trim().min(20).max(6000),
});
const directoryOutreachRecipientSchema = z.object({ recipientId: z.number().int().positive(), recipientName: z.string().trim().min(1).max(160) });
const directoryFilterPresetInputSchema = z.object({ audience: directoryOutreachAudienceSchema, name: z.string().trim().min(2).max(120), searchQuery: z.string().trim().max(300), sortOrder: z.enum(["last_name", "recent"]), principalBrokerOnly: z.boolean().optional() });

const oregonAgentSourceProfileSchema = z.object({
  // Top agents use their positive source IDs; derived standalone principal
  // brokers use stable negative IDs so they cannot collide with agents.
  sourceAgentId: z.number().int().refine((value) => value !== 0, {
    message: "A source profile ID cannot be zero.",
  }),
  fullName: z.string().trim().min(1).max(160),
  state: z.literal("Oregon"),
  brokerage: z.string().nullable(),
  cityArea: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  websiteBioUrl: z.string().nullable(),
  zillowUrl: z.string().nullable(),
  headshotUrl: z.string().nullable(),
  realtrendsRank: z.number().int().nullable(),
  rankTotal: z.number().int().positive().optional(),
  principalBrokerName: z.string().nullable().optional(),
  principalBrokerTitle: z.string().nullable().optional(),
  principalBrokerPhone: z.string().nullable().optional(),
  principalBrokerEmail: z.string().nullable().optional(),
  principalBrokerHeadshotUrl: z.string().nullable().optional(),
  officeBuysideRank: z.number().int().nullable().optional(),
  sourceProfileUrl: z.string().url().optional(),
  principalBrokerProfileUrl: z.string().url().nullable().optional(),
  sourceUpdatedAt: z.string().datetime(),
}).passthrough();

const syncedAgentOutreachTemplateInputSchema = z.object({
  name: z.string().trim().min(1, "Template name is required.").max(160),
  subjectTemplate: z.string().trim().min(1, "Email subject is required.").max(240),
  bodyTemplate: z.string().trim().min(1, "Email body is required.").max(8000),
});

const oregonAgentSourceExportSchema = z.object({
  version: z.literal(1),
  source: z.literal("oregon-agent-leads"),
  state: z.literal("Oregon"),
  exportedAt: z.string().datetime(),
  count: z.number().int().nonnegative(),
  agents: z.array(oregonAgentSourceProfileSchema),
});

const OREGON_AGENT_SYNC_URL = process.env.OREGON_AGENT_SYNC_URL ?? "https://oregonleads-bqkuz5cc.manus.space/api/sync/agents?state=Oregon";

function syncedAgentBio(profile: z.infer<typeof oregonAgentSourceProfileSchema>) {
  const details = [
    profile.brokerage ? `Brokerage: ${profile.brokerage}` : null,
    profile.cityArea ? `Service area: ${profile.cityArea}` : null,
    typeof profile.realtrendsRank === "number" ? `Source ranking: #${profile.realtrendsRank}` : null,
    profile.zillowUrl ? `Zillow profile: ${profile.zillowUrl}` : null,
    typeof profile.notes === "string" && profile.notes.trim() ? profile.notes.trim() : null,
  ].filter((value): value is string => Boolean(value));
  return details.join("\n\n");
}

/** Resolve a unique slug for an agent, appending -2, -3... on collisions. */
async function resolveUniqueSlug(desired: string, name: string, excludeId?: number) {
  let base = desired || slugify(name);
  if (!base) base = "agent";
  let candidate = base;
  for (let i = 2; await slugTaken(candidate, excludeId); i++) {
    if (i > 50) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Couldn't find a unique link for this agent — please set a custom slug.",
      });
    }
    candidate = `${base}-${i}`;
  }
  return candidate;
}

/** Resolve a unique public slug for a loan officer. */
async function resolveUniqueLoanOfficerSlug(desired: string, name: string, excludeId?: number) {
  let base = desired || slugify(name);
  if (!base) base = "loan-officer";
  let candidate = base;
  for (let i = 2; await loanOfficerSlugTaken(candidate, excludeId); i++) {
    if (i > 50) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Couldn't find a unique link for this loan officer — please set a custom slug.",
      });
    }
    candidate = `${base}-${i}`;
  }
  return candidate;
}

function requireAdmin(role: string | undefined) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: ADMIN_ONLY_MESSAGE });
  }
}

/** Resolves a team member's single active loan-officer workspace; admins remain unrestricted. */
async function resolveDashboardWorkspace(user: { id: number; role: string; email: string | null }) {
  if (user.role === "admin") return null;
  if (user.role !== "team_member") throw new TRPCError({ code: "FORBIDDEN", message: "This dashboard workspace has not been activated." });
  const workspace = await getTeamLoanOfficerWorkspaceForMember(user.id);
  if (!workspace) throw new TRPCError({ code: "FORBIDDEN", message: "Your team workspace is not active. Ask the administrator to review your assignment." });
  return workspace;
}

/**
 * Runs the server-to-server Oregon directory refresh. Keeping this outside the
 * tRPC procedures guarantees that legacy and versioned dashboard actions use
 * the same authenticated, JSON-validated import path.
 */
export async function refreshOregonTopAgentsForOwner(ownerUserId: number) {
  const token = process.env.OREGON_AGENT_SYNC_TOKEN;
  if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Oregon sync token is not configured." });
  const sourceUrl = "https://oregonleads-bqkuz5cc.manus.space/api/sync/agents?state=Oregon";
  let response: Response;
  try {
    response = await fetch(sourceUrl, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Could not reach the Oregon agent directory." });
  }
  if (!response.ok) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The Oregon agent directory rejected the sync request." });
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The Oregon agent directory returned a non-JSON response. Please retry Sync Top Agents." });
  }
  const raw = await response.json().catch(() => null);
  const payload = oregonAgentSourceExportSchema.safeParse(raw);
  if (!payload.success) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "The Oregon agent directory returned an unexpected export format." });
  }
  await upsertSyncedTopAgents(ownerUserId, payload.data.agents.map((profile) => ({
    sourceAgentId: profile.sourceAgentId,
    state: profile.state,
    fullName: profile.fullName,
    brokerage: profile.brokerage,
    cityArea: profile.cityArea,
    phone: profile.phone,
    email: profile.email,
    websiteBioUrl: profile.websiteBioUrl,
    zillowUrl: profile.zillowUrl,
    headshotUrl: profile.headshotUrl,
    sourceRank: profile.realtrendsRank,
    rankTotal: profile.rankTotal,
    profileData: JSON.stringify(profile),
    sourceUpdatedAt: new Date(profile.sourceUpdatedAt),
  })));
  return { refreshed: true } as const;
}

/** Accepted upload types → extension. Keeps keys tidy and rejects non-images. */
const IMAGE_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** ~4MB raw ≈ 5.6MB base64. Generous for headshots/logos without abuse risk. */
const MAX_IMAGE_BASE64_CHARS = 5_600_000;

const textDraftRecipientSchema = z.object({
  sourceType: z.enum(["roadmap", "chat"]),
  sourceLeadId: z.number().int().positive(),
});

const textDraftAttachmentSchema = z.object({
  storageKey: z.string().trim().min(1).max(700),
  url: z.string().trim().startsWith("/manus-storage/").max(1000),
  fileName: z.string().trim().min(1).max(300),
  mimeType: z.literal("image/jpeg"),
  sizeBytes: z.number().int().positive().max(4_000_000),
});

function assertOwnedTextAttachments(userId: number, attachments: Array<z.infer<typeof textDraftAttachmentSchema>>) {
  const allowedPrefix = `text-drafts/${userId}/`;
  const hasUnsafeAttachment = attachments.some((attachment) =>
    !attachment.storageKey.startsWith(allowedPrefix)
    || attachment.storageKey.includes("..")
    || attachment.url !== `/manus-storage/${attachment.storageKey}`
  );
  if (hasUnsafeAttachment) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Text attachments must be JPG files uploaded by the current administrator." });
  }
}

function isJpegBuffer(buffer: Buffer) {
  return buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

const chatSessionSchema = z.string().trim().min(12).max(72);

const campaignAttributionInputSchema = z.object({
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(160).optional(),
  utmContent: z.string().trim().max(160).optional(),
  utmTerm: z.string().trim().max(160).optional(),
  landingPath: z.string().trim().max(500).optional(),
  referrerHost: z.string().trim().max(320).optional(),
});

const propertyPageSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(240)
  .refine((v) => SLUG_PATTERN.test(v), { message: "Invalid property page link." });

const propertyScenarioInputSchema = z.object({
  buydown: buydownScenarioSchema.optional(),
  costOfWaiting: costOfWaitingScenarioSchema.optional(),
});

const loanOfficerInputSchema = z.object({
  name: z.string().trim().min(1, "Loan officer name is required").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(160)
    .refine((v) => v === "" || SLUG_PATTERN.test(v), {
      message: "Use only lowercase letters, numbers, and hyphens.",
    })
    .default(""),
  email: z.string().trim().email("Enter a valid email address").max(320),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(40),
  nmls: z.string().trim().max(40).default(""),
  title: z.string().trim().max(120).default("Loan Officer"),
  companyName: z.string().trim().max(200).default(""),
  bio: z.string().trim().max(2000).default(""),
  website: z.string().trim().max(500).default(""),
  calendlyUrl: optionalPublicHttpUrl,
  headshotUrl: z.string().trim().max(500).default(""),
  companyLogoUrl: z.string().trim().max(500).default(""),
  agentId: z.number().int().positive().nullable().default(null),
  visible: z.boolean().default(true),
});

const FALLBACK_LOAN_OFFICER = {
  name: "Mike Ford",
  email: "mford@cfmtg.com",
  phone: "(541) 729-0819",
  nmls: "288455",
  title: "Loan Officer",
};

function chatValuesFromLead(lead: {
  loanPurpose: "purchase" | "refinance" | null;
  propertyType: string | null;
  propertyValue: number | null;
  creditRange: string | null;
  annualIncome: number | null;
  downPayment: number | null;
  loanAmount: number | null;
  lowDownPaymentHomeSearch: number | null;
  searchAreaType: string | null;
  targetArea: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  smsConsent: number | null;
}): IntakeValues {
  return {
    loanPurpose: lead.loanPurpose,
    propertyType: lead.propertyType,
    propertyValue: lead.propertyValue,
    creditRange: lead.creditRange as IntakeValues["creditRange"],
    annualIncome: lead.annualIncome,
    downPayment: lead.downPayment,
    loanAmount: lead.loanAmount,
    lowDownPaymentHomeSearch: lead.lowDownPaymentHomeSearch,
    searchAreaType: lead.searchAreaType as IntakeValues["searchAreaType"],
    targetArea: lead.targetArea,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    smsConsent: lead.smsConsent,
  };
}

function chatContact(officer: Awaited<ReturnType<typeof getFeaturedLoanOfficer>>) {
  return officer ?? FALLBACK_LOAN_OFFICER;
}

type CompletedChatIntake = {
  id: number;
  agentId: number | null;
  loanOfficerId: number | null;
  loanPurpose: "purchase" | "refinance" | null;
  propertyType: string | null;
  propertyValue: number | null;
  creditRange: string | null;
  annualIncome: number | null;
  downPayment: number | null;
  loanAmount: number | null;
  lowDownPaymentHomeSearch: number | null;
  searchAreaType: string | null;
  targetArea: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  scenario: string | null;
};

/** Sends (or re-sends) a qualified intake to its loan officer and co-branded agent. */
async function deliverChatIntakeRecipientEmails(lead: CompletedChatIntake) {
  const [selectedOfficer, coBrandedAgent] = await Promise.all([
    lead.loanOfficerId ? getLoanOfficerById(lead.loanOfficerId) : Promise.resolve(undefined),
    lead.agentId ? getAgentById(lead.agentId) : Promise.resolve(undefined),
  ]);
  const recipients = [
    selectedOfficer?.email ? { recipientName: selectedOfficer.name, recipientEmail: selectedOfficer.email, recipientRole: "loan_officer" as const } : null,
    coBrandedAgent?.email ? { recipientName: coBrandedAgent.name, recipientEmail: coBrandedAgent.email, recipientRole: "agent" as const } : null,
  ].filter((recipient): recipient is NonNullable<typeof recipient> => recipient !== null);
  const uniqueRecipients = recipients.filter((recipient, index) =>
    recipients.findIndex((candidate) => candidate.recipientEmail.toLowerCase() === recipient.recipientEmail.toLowerCase()) === index
  );
  const coBrandedSourceUrl = selectedOfficer?.slug && coBrandedAgent?.slug
    ? publicSiteUrl(`/with/${selectedOfficer.slug}/${coBrandedAgent.slug}`)
    : null;
  const deliveryResults = await Promise.all(uniqueRecipients.map((recipient) => sendChatIntakeNotification({
    ...recipient,
    fullName: lead.fullName ?? "there",
    email: lead.email ?? "Not provided",
    phone: lead.phone ?? "Not provided",
    loanPurpose: lead.loanPurpose,
    propertyType: lead.propertyType,
    propertyValue: lead.propertyValue,
    creditRange: lead.creditRange,
    annualIncome: lead.annualIncome,
    downPayment: lead.downPayment,
    loanAmount: lead.loanAmount,
    lowDownPaymentHomeSearch: lead.lowDownPaymentHomeSearch,
    searchAreaType: lead.searchAreaType,
    targetArea: lead.targetArea,
    calculatorContext: summarizeChatCalculatorContext(lead.scenario),
    coBrandedAgentName: coBrandedAgent?.name ?? null,
    coBrandedSourceUrl,
  })));
  const failureDetails = deliveryResults
    .map((result, index) => result.sent ? null : `${uniqueRecipients[index]?.recipientName ?? "Recipient"} <${uniqueRecipients[index]?.recipientEmail ?? "unknown"}>: ${result.reason}`)
    .filter((detail): detail is string => detail !== null);
  if (uniqueRecipients.length === 0 || failureDetails.length > 0) {
    const detail = uniqueRecipients.length === 0
      ? "No selected loan officer or co-branded agent has a valid email address."
      : failureDetails.join("; ");
    await updateChatLead(lead.id, { recipientEmailStatus: "manual_follow_up", recipientEmailDetail: detail });
    try {
      await notifyOwner({
        title: `Manual intake email follow-up: ${lead.fullName ?? "visitor"}`,
        content: `${detail} The completed intake is saved in the Mortgage chat intakes dashboard; please follow up manually with the intended recipient(s).`,
      });
    } catch (error) {
      console.error("[Chat] Manual notification follow-up alert failed:", error);
    }
    return { recipientEmailStatus: "manual_follow_up" as const, recipientEmailDetail: detail };
  }
  await updateChatLead(lead.id, { recipientEmailStatus: "sent", recipientEmailDetail: null });
  return { recipientEmailStatus: "sent" as const, recipientEmailDetail: null };
}

function summarizeChatCalculatorContext(raw: string | null) {
  if (!raw) return null;
  try {
    const snapshot = JSON.parse(raw) as { buydown?: Record<string, number>; costOfWaiting?: Record<string, number> };
    const lines: string[] = [];
    if (snapshot.buydown?.purchasePrice) {
      lines.push(`2-1 buydown: $${snapshot.buydown.purchasePrice.toLocaleString()} purchase; Year 1 savings $${(snapshot.buydown.year1MonthlySavings ?? 0).toLocaleString()}/mo; Year 2 savings $${(snapshot.buydown.year2MonthlySavings ?? 0).toLocaleString()}/mo; seller subsidy $${(snapshot.buydown.totalSubsidy ?? 0).toLocaleString()}.`);
    }
    if (snapshot.costOfWaiting?.costOfWaiting) {
      lines.push(`Cost of waiting: $${snapshot.costOfWaiting.costOfWaiting.toLocaleString()} estimated over ${snapshot.costOfWaiting.waitYears ?? "the selected"} year(s).`);
    }
    return lines.length ? lines.join("\n") : null;
  } catch {
    return null;
  }
}

function buildChatAgentMailto(lead: CompletedChatIntake, agent: { name: string; email: string }, coBrandedSourceUrl: string | null) {
  const calculatorContext = summarizeChatCalculatorContext(lead.scenario);
  const { subject, text } = buildChatIntakeNotification({
    recipientName: agent.name,
    recipientEmail: agent.email,
    recipientRole: "agent",
    fullName: lead.fullName ?? "Visitor",
    email: lead.email ?? "Not provided",
    phone: lead.phone ?? "Not provided",
    loanPurpose: lead.loanPurpose,
    propertyType: lead.propertyType,
    propertyValue: lead.propertyValue,
    creditRange: lead.creditRange,
    annualIncome: lead.annualIncome,
    downPayment: lead.downPayment,
    loanAmount: lead.loanAmount,
    lowDownPaymentHomeSearch: lead.lowDownPaymentHomeSearch,
    searchAreaType: lead.searchAreaType,
    targetArea: lead.targetArea,
    calculatorContext,
    coBrandedAgentName: agent.name,
    coBrandedSourceUrl,
  });
  return `mailto:${agent.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  templateUsage: router({
    listCounts: protectedProcedure.input(z.object({
      templateScope: z.enum(["listing_agent", "property_list", "property_page_agent", "property_page_buyer", "oregon_outreach", "agent_directory", "loan_officer_directory"]),
    })).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const ownerUserId = input.templateScope === "property_page_buyer" || input.templateScope === "oregon_outreach" || input.templateScope === "agent_directory" || input.templateScope === "loan_officer_directory" ? ctx.user.id : null;
      return getEmailTemplateUsageCounts({ templateScope: input.templateScope, ownerUserId });
    }),
    recordDraftOpen: protectedProcedure.input(z.object({
      templateScope: z.enum(["listing_agent", "property_list", "property_page_agent", "property_page_buyer", "oregon_outreach", "agent_directory", "loan_officer_directory"]),
      templateId: z.number().int().positive(),
    })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const ownerUserId = input.templateScope === "property_page_buyer" || input.templateScope === "oregon_outreach" || input.templateScope === "agent_directory" || input.templateScope === "loan_officer_directory" ? ctx.user.id : null;
      await recordEmailTemplateUsage({ ...input, ownerUserId });
      return { recorded: true };
    }),
  }),
  templateVersions: router({
    list: protectedProcedure.input(z.object({
      templateScope: z.enum(["listing_agent", "property_list", "property_page_agent", "property_page_buyer", "oregon_outreach", "agent_directory", "loan_officer_directory"]),
      templateId: z.number().int().positive(),
    })).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return listEmailTemplateVersions({ ...input, ownerUserId: ctx.user.id });
    }),
    restore: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const version = await getEmailTemplateVersion({ id: input.id, ownerUserId: ctx.user.id });
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Template version not found." });
      const subjectTemplate = version.subjectTemplate ?? "";
      switch (version.templateScope) {
        case "listing_agent": await updateListingAgentEmailTemplate({ id: version.templateId, name: version.name, bodyTemplate: version.bodyTemplate }); break;
        case "property_list": await updatePropertyEmailTemplate({ id: version.templateId, name: version.name, bodyTemplate: version.bodyTemplate }); break;
        case "property_page_agent": await updatePropertyPageAgentEmailTemplate({ id: version.templateId, name: version.name, bodyTemplate: version.bodyTemplate }); break;
        case "property_page_buyer": await updatePropertyPageBuyerEmailTemplate({ ownerUserId: ctx.user.id, id: version.templateId, name: version.name, subjectTemplate, bodyTemplate: version.bodyTemplate }); break;
        case "oregon_outreach": await updateSyncedAgentOutreachTemplate({ ownerUserId: ctx.user.id, id: version.templateId, name: version.name, subjectTemplate, bodyTemplate: version.bodyTemplate }); break;
        case "agent_directory": await updateDirectoryOutreachEmailTemplate({ ownerUserId: ctx.user.id, audience: "agent", id: version.templateId, name: version.name, subjectTemplate, bodyTemplate: version.bodyTemplate }); break;
        case "loan_officer_directory": await updateDirectoryOutreachEmailTemplate({ ownerUserId: ctx.user.id, audience: "loan_officer", id: version.templateId, name: version.name, subjectTemplate, bodyTemplate: version.bodyTemplate }); break;
      }
      await recordEmailTemplateVersion({ templateScope: version.templateScope, templateId: version.templateId, ownerUserId: ctx.user.id, name: version.name, subjectTemplate: version.subjectTemplate, bodyTemplate: version.bodyTemplate });
      return { restored: true };
    }),
  }),
  directoryOutreachTemplates: router({
    list: protectedProcedure.input(z.object({ audience: directoryOutreachAudienceSchema, includeArchived: z.boolean().optional() })).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return listDirectoryOutreachEmailTemplates({ ownerUserId: ctx.user.id, audience: input.audience, includeArchived: input.includeArchived });
    }),
    create: protectedProcedure.input(directoryOutreachTemplateInputSchema).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const template = await createDirectoryOutreachEmailTemplate({ ownerUserId: ctx.user.id, ...input });
      await recordEmailTemplateVersion({ templateScope: input.audience === "agent" ? "agent_directory" : "loan_officer_directory", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, subjectTemplate: template.subjectTemplate, bodyTemplate: template.bodyTemplate });
      return template;
    }),
    update: protectedProcedure.input(directoryOutreachTemplateInputSchema.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const template = await updateDirectoryOutreachEmailTemplate({ ownerUserId: ctx.user.id, ...input });
      await recordEmailTemplateVersion({ templateScope: input.audience === "agent" ? "agent_directory" : "loan_officer_directory", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, subjectTemplate: template.subjectTemplate, bodyTemplate: template.bodyTemplate });
      return template;
    }),
    setArchived: protectedProcedure.input(z.object({ audience: directoryOutreachAudienceSchema, id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await setDirectoryOutreachEmailTemplateArchived({ ownerUserId: ctx.user.id, ...input });
      return { archived: input.archived };
    }),
    delete: protectedProcedure.input(z.object({ audience: directoryOutreachAudienceSchema, id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await deleteDirectoryOutreachEmailTemplate({ ownerUserId: ctx.user.id, ...input });
      return { deleted: true };
    }),
  }),
  directoryOutreach: router({
    lastDrafts: protectedProcedure.input(z.object({ audience: directoryOutreachAudienceSchema })).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return getDirectoryOutreachLastDrafts({ ownerUserId: ctx.user.id, audience: input.audience });
    }),
    recordDraftOpen: protectedProcedure.input(z.object({ audience: directoryOutreachAudienceSchema, templateId: z.number().int().positive().nullable().optional(), recipients: z.array(directoryOutreachRecipientSchema).min(1).max(100) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await recordDirectoryOutreachDrafts({ ownerUserId: ctx.user.id, audience: input.audience, templateId: input.templateId ?? null, recipients: input.recipients });
      return { recorded: input.recipients.length };
    }),
    filterPresets: router({
      list: protectedProcedure.input(z.object({ audience: directoryOutreachAudienceSchema })).query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return listDirectoryFilterPresets({ ownerUserId: ctx.user.id, audience: input.audience });
      }),
      create: protectedProcedure.input(directoryFilterPresetInputSchema).mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return createDirectoryFilterPreset({ ownerUserId: ctx.user.id, ...input });
      }),
      delete: protectedProcedure.input(z.object({ audience: directoryOutreachAudienceSchema, id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await deleteDirectoryFilterPreset({ ownerUserId: ctx.user.id, ...input });
        return { deleted: true };
      }),
    }),
  }),
  site: router({
    /** Public metadata used to validate the configured hosted-site title. */
    notificationTitle: publicProcedure.query(() => ({
      title: process.env.VITE_APP_TITLE ?? "",
    })),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  leads: router({
    submit: publicProcedure
      .input(
        z.object({
          firstName: z.string().trim().min(1, "First name is required").max(120),
          email: z.string().trim().email("A valid email is required").max(320),
          phone: z.string().trim().min(7, "A valid phone number is required").max(40).optional(),
          smsConsent: z.literal(true, { error: "SMS consent is required." }),
          preferredContactMethod: z.enum(["text", "email"]).default("text"),
          captureDevice: z.enum(["mobile", "desktop"]).default("desktop"),
          source: z.string().trim().max(64).optional(),
          campaignAttribution: campaignAttributionInputSchema.optional(),
          scenario: buydownScenarioSchema.optional(),
          costOfWaiting: costOfWaitingScenarioSchema.optional(),
          propertyPageSlug: propertyPageSlugSchema.optional(),
          /** Slug of the co-branded /with/:slug page the visitor submitted from. */
          agentSlug: z
            .string()
            .trim()
            .toLowerCase()
            .max(160)
            .refine((v) => SLUG_PATTERN.test(v), { message: "Invalid agent link." })
            .optional(),
          loanOfficerSlug: z
            .string()
            .trim()
            .toLowerCase()
            .max(160)
            .refine((v) => SLUG_PATTERN.test(v), { message: "Invalid loan officer link." })
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        // The scenario column stores a combined payload so both calculators can
        // ride along with a single lead. Legacy rows may contain a bare buydown
        // object; the dashboard parser handles both shapes.
        if (!hasUsableRoadmapPhone(input.phone)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid 10-digit phone number; placeholder numbers are not accepted." });
        }

        const scenarioPayload =
          input.scenario || input.costOfWaiting
            ? JSON.stringify({
                ...(input.scenario ? { buydown: input.scenario } : {}),
                ...(input.costOfWaiting ? { costOfWaiting: input.costOfWaiting } : {}),
              })
            : undefined;

        // Auto-tag the lead with the agent whose co-branded page captured it.
        // A bad/stale slug must never block lead capture.
        let agentId: number | undefined;
        let agentName: string | undefined;
        let loanOfficerId: number | undefined;
        let propertyPageId: number | undefined;
        if (input.agentSlug) {
          try {
            const agent = await getAgentBySlug(input.agentSlug);
            if (agent) {
              agentId = agent.id;
              agentName = agent.name;
            }
          } catch (error) {
            console.warn("[Leads] Agent slug lookup failed:", error);
          }
        }

        if (input.loanOfficerSlug) {
          try {
            const officer = await getLoanOfficerBySlug(input.loanOfficerSlug);
            const isValidPair = agentId !== undefined && officer?.agentId === agentId;
            const isStandaloneOfficer = agentId === undefined && officer?.visible === 1;
            if (officer?.visible === 1 && (isValidPair || isStandaloneOfficer)) {
              loanOfficerId = officer.id;
            }
          } catch (error) {
            console.warn("[Leads] Loan officer slug lookup failed:", error);
          }
        } else if (agentId !== undefined) {
          // Legacy /with/:agent links predate paired URLs. If the agent has one
          // and only one visible partnered LO, recover that unambiguous
          // attribution. Never choose among multiple officers automatically.
          try {
            const pairedOfficers = (await listLoanOfficers()).filter(
              (officer) => officer.visible === 1 && officer.agentId === agentId
            );
            if (pairedOfficers.length === 1) loanOfficerId = pairedOfficers[0].id;
          } catch (error) {
            console.warn("[Leads] Legacy co-brand officer lookup failed:", error);
          }
        }

        if (input.propertyPageSlug) {
          try {
            const propertyPage = await getPropertyLandingPageBySlug(input.propertyPageSlug);
            if (propertyPage?.page) {
              propertyPageId = propertyPage.page.id;
              agentId = propertyPage.page.agentId ?? agentId;
              loanOfficerId = propertyPage.page.loanOfficerId ?? loanOfficerId;
            }
          } catch (error) {
            console.warn("[Leads] Property page lookup failed:", error);
          }
        }

        await insertLead({
          firstName: input.firstName,
          email: input.email,
          phone: input.phone,
          smsConsent: 1,
          preferredContactMethod: input.preferredContactMethod,
          captureDevice: input.captureDevice,
          source: propertyPageId ? "property-page" : input.source ?? "roadmap",
          scenario: scenarioPayload,
          agentId,
          loanOfficerId,
          propertyPageId,
          agentSource: agentId !== undefined ? "link" : undefined,
          ...input.campaignAttribution,
        });

        if (propertyPageId) {
          await recordPropertyPageActivity({ propertyLandingPageId: propertyPageId, eventType: "roadmap_request" });
          if (input.scenario) {
            await recordPropertyPageActivity({ propertyLandingPageId: propertyPageId, eventType: "buydown_calculator" });
          }
          if (input.costOfWaiting) {
            await recordPropertyPageActivity({ propertyLandingPageId: propertyPageId, eventType: "cost_of_waiting_calculator" });
          }
        }

        // Alert the owner (Mike) about the new lead. Notification failure must not
        // block the lead from being stored, but we log it for observability — the
        // lead is still recoverable from the database/dashboard.
        try {
          const delivered = await notifyOwner({
            title: `New Roadmap lead: ${input.firstName}`,
            content: buildRoadmapNotificationContent({
              firstName: input.firstName,
              phone: input.phone,
              email: input.email,
              agentName,
              scenario: scenarioPayload ?? null,
            }),
          });
          if (!delivered) {
            console.warn(
              `[Leads] Owner notification not delivered for lead ${input.email}; lead is stored in DB and visible in the Database panel.`
            );
          }
        } catch (error) {
          console.error("[Leads] Owner notification failed:", error);
        }

        return { success: true } as const;
      }),
    list: protectedProcedure.input(z.object({ activityRange: z.enum(PROPERTY_ACTIVITY_RANGES).optional() }).optional()).query(async ({ ctx, input }) => {
      const workspace = await resolveDashboardWorkspace(ctx.user);
      return listLeads({ activitySince: getPropertyActivitySince(input?.activityRange ?? "all"), loanOfficerId: workspace?.loanOfficerId });
    }),
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["new", "contacted", "booked"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await resolveDashboardWorkspace(ctx.user);
        if (workspace) {
          const lead = await getLeadById(input.id);
          if (!lead || lead.loanOfficerId !== workspace.loanOfficerId) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found in your assigned workspace." });
        }
        if (workspace) await updateLeadStatus(input.id, input.status, workspace.loanOfficerId);
        else await updateLeadStatus(input.id, input.status);
        return { success: true } as const;
      }),
    updateNotes: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          notes: z.string().max(5000, "Notes are limited to 5000 characters."),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const workspace = await resolveDashboardWorkspace(ctx.user);
        if (workspace) {
          const lead = await getLeadById(input.id);
          if (!lead || lead.loanOfficerId !== workspace.loanOfficerId) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found in your assigned workspace." });
        }
        if (workspace) await updateLeadNotes(input.id, input.notes, workspace.loanOfficerId);
        else await updateLeadNotes(input.id, input.notes);
        return { success: true } as const;
      }),
    /** Admin-only: assign (or clear) a saved agent on a lead. */
    assignAgent: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          agentId: z.number().int().positive().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        if (input.agentId !== null) {
          const agent = await getAgentById(input.agentId);
          if (!agent) {
            throw new TRPCError({ code: "NOT_FOUND", message: "That agent no longer exists." });
          }
        }
        await updateLeadAgent(input.id, input.agentId);
        return { success: true } as const;
      }),
    /** Admin-only: email the lead's assigned agent an intro referral. */
    sendToAgent: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const lead = await getLeadById(input.id);
        if (!lead) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
        }
        if (!lead.agentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Assign an agent to this lead first.",
          });
        }
        const agent = await getAgentById(lead.agentId);
        if (!agent) {
          throw new TRPCError({ code: "NOT_FOUND", message: "That agent no longer exists." });
        }
        if (!agent.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${agent.name} has no email on file — add one in the Agents panel.`,
          });
        }

        const scenarioSummary = summarizeLeadScenario(lead.scenario);
        const result = await sendReferralEmail({
          agentName: agent.name,
          agentEmail: agent.email,
          leadFirstName: lead.firstName,
          leadEmail: lead.email,
          leadPhone: lead.phone,
          leadSource: lead.source,
          submittedAt: lead.createdAt,
          scenarioSummary,
          ownerName: "Mike Ford",
        });

        if (result.sent) {
          await markLeadSentToAgent(input.id);
          return { sent: true as const };
        }
        if (result.reason === "not_configured" || result.reason === "unverified_domain") {
          // Let the client fall back to a prefilled mailto: link. This also gives
          // the owner a no-dead-end path while a Resend sending domain awaits DNS
          // verification.
          return {
            sent: false as const,
            reason: result.reason,
            mailto: buildMailtoFallback(agent.email, lead, agent.name, scenarioSummary),
          };
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The referral email couldn't be sent. Please try again.",
        });
      }),
  }),

  chat: router({
    /** Creates or resumes a secure, resumable chat intake session. */
    start: publicProcedure
      .input(
        z.object({
          sessionId: chatSessionSchema.optional(),
          agentSlug: z
            .string()
            .trim()
            .toLowerCase()
            .max(160)
            .refine((v) => v === "" || SLUG_PATTERN.test(v), { message: "Invalid agent link." })
            .optional(),
          loanOfficerSlug: z
            .string()
            .trim()
            .toLowerCase()
            .max(160)
            .refine((v) => v === "" || SLUG_PATTERN.test(v), { message: "Invalid loan officer link." })
            .optional(),
          campaignAttribution: campaignAttributionInputSchema.optional(),
          propertyPageSlug: propertyPageSlugSchema.optional(),
          scenario: propertyScenarioInputSchema.optional(),
          captureDevice: z.enum(["mobile", "desktop"]).default("desktop"),
        })
      )
      .mutation(async ({ input }) => {
        const sessionId = input.sessionId ?? nanoid(32);
        const existing = await getChatLeadBySession(sessionId);
        const defaultOfficer = await getFeaturedLoanOfficer();

        if (existing) {
          const transcript = await getChatTranscriptByLeadId(existing.id);
          const [existingOfficer, existingAgent] = await Promise.all([
            existing.loanOfficerId ? getLoanOfficerById(existing.loanOfficerId) : Promise.resolve(undefined),
            existing.agentId ? getAgentById(existing.agentId) : Promise.resolve(undefined),
          ]);
          return {
            sessionId,
            leadId: existing.id,
            status: existing.status,
            currentStep: existing.currentStep as ChatStep,
            messages: transcript.map((message) => ({ role: message.role, content: message.content })),
            officer: chatContact(existingOfficer ?? defaultOfficer),
            agent: existingAgent
              ? { name: existingAgent.name, companyName: existingAgent.companyName, phone: existingAgent.phone, email: existingAgent.email }
              : null,
            buyerAgentEligible: existing.status === "qualified" && existing.loanPurpose === "purchase",
            buyerAgentRequested: existing.buyerAgentRequest === 1,
          };
        }

        let agent: Awaited<ReturnType<typeof getAgentBySlug>> | undefined;
        let officer = defaultOfficer;
        let propertyPageId: number | undefined;
        if (input.agentSlug) {
          const found = await getAgentBySlug(input.agentSlug);
          if (found?.visible === 1) agent = found;
        }
        if (input.loanOfficerSlug && agent) {
          const pairedOfficer = await getLoanOfficerBySlug(input.loanOfficerSlug);
          if (pairedOfficer?.visible === 1 && pairedOfficer.agentId === agent.id) {
            officer = pairedOfficer;
          } else {
            // Pairing must be explicit; never silently use an unrelated LO with
            // a co-branded agent.
            agent = undefined;
          }
        } else if (input.loanOfficerSlug) {
          const standaloneOfficer = await getLoanOfficerBySlug(input.loanOfficerSlug);
          if (standaloneOfficer?.visible === 1) officer = standaloneOfficer;
        }

        if (input.propertyPageSlug) {
          const propertyPage = await getPropertyLandingPageBySlug(input.propertyPageSlug);
          if (propertyPage?.page) {
            propertyPageId = propertyPage.page.id;
            if (propertyPage.agent?.visible === 1) agent = propertyPage.agent;
            if (propertyPage.loanOfficer?.visible === 1) officer = propertyPage.loanOfficer;
          }
        }

        const contact = chatContact(officer);
        const greeting = openingMessage(
          contact,
          agent
            ? { name: agent.name, companyName: agent.companyName, phone: agent.phone, email: agent.email }
            : null
        );
        const leadId = await createChatLead({
          sessionId,
          currentStep: "loan_purpose",
          agentId: agent?.id,
          loanOfficerId: officer?.id,
          propertyPageId,
          scenario: input.scenario ? JSON.stringify(input.scenario) : undefined,
          captureDevice: input.captureDevice,
          ...input.campaignAttribution,
        });
        await addChatTranscript(Number(leadId), "assistant", greeting);
        if (propertyPageId) {
          await recordPropertyPageActivity({ propertyLandingPageId: propertyPageId, eventType: "chat_started" });
          if (input.scenario?.buydown) await recordPropertyPageActivity({ propertyLandingPageId: propertyPageId, eventType: "buydown_calculator" });
          if (input.scenario?.costOfWaiting) await recordPropertyPageActivity({ propertyLandingPageId: propertyPageId, eventType: "cost_of_waiting_calculator" });
        }

        return {
          sessionId,
          leadId: Number(leadId),
          status: "incomplete" as const,
          currentStep: "loan_purpose" as const,
          messages: [{ role: "assistant" as const, content: greeting }],
          officer: contact,
          agent: agent
            ? { name: agent.name, companyName: agent.companyName, phone: agent.phone, email: agent.email }
            : null,
          buyerAgentEligible: false,
          buyerAgentRequested: false,
        };
      }),
    /** Processes one answer at a time and persists both the value and transcript turn. */
    answer: publicProcedure
      .input(z.object({ sessionId: chatSessionSchema, message: z.string().trim().min(1).max(1000) }))
      .mutation(async ({ input }) => {
        const lead = await getChatLeadBySession(input.sessionId);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "That chat session has expired. Please start again." });
        if (lead.status === "qualified") {
          return {
            completed: true as const,
            currentStep: "complete" as const,
            message: completeMessage(lead.fullName ?? "there", lead.phone ?? "your preferred number", lead.lowDownPaymentHomeSearch === 1, lead.searchAreaType as IntakeValues["searchAreaType"], lead.targetArea),
            homesListRequested: lead.lowDownPaymentHomeSearch === 1,
            buyerAgentEligible: lead.loanPurpose === "purchase",
          };
        }

        const currentStep = lead.currentStep as ChatStep;
        const values = chatValuesFromLead(lead);
        await addChatTranscript(lead.id, "user", input.message);
        const parsed = parseAnswer(currentStep, input.message, values);

        if (!parsed.ok) {
          await addChatTranscript(lead.id, "assistant", parsed.response);
          return { completed: false as const, currentStep, message: parsed.response };
        }

        const { smsConsent, ...answerPatch } = parsed.patch;
        const consentPatch = smsConsent === 1
          ? { smsConsent: 1, smsConsentAt: new Date() }
          : smsConsent === 0
            ? { smsConsent: 0, smsConsentAt: null }
            : {};
        const persistedPatch = { ...answerPatch, ...consentPatch };
        const updatedValues = { ...values, ...parsed.patch };
        if (parsed.nextStep === "complete") {
          const fullName = updatedValues.fullName ?? "there";
          const phone = updatedValues.phone ?? "your preferred number";
          const completion = completeMessage(fullName, phone, updatedValues.lowDownPaymentHomeSearch === 1, updatedValues.searchAreaType, updatedValues.targetArea);
          await updateChatLead(lead.id, {
            ...persistedPatch,
            currentStep: "complete",
            status: "qualified",
            completedAt: new Date(),
          });
          await addChatTranscript(lead.id, "assistant", completion);
          if (lead.propertyPageId) {
            await recordPropertyPageActivity({ propertyLandingPageId: lead.propertyPageId, eventType: "chat_completed" });
            if (updatedValues.lowDownPaymentHomeSearch === 1) {
              await recordPropertyPageActivity({ propertyLandingPageId: lead.propertyPageId, eventType: "homes_list_request" });
            }
          }
          try {
            await notifyOwner({
              title: `Qualified chat intake: ${fullName}`,
              content: `${fullName} completed the Mortgage Intake Specialist chat. Purpose: ${updatedValues.loanPurpose ?? "—"}; property value: ${updatedValues.propertyValue ? `$${updatedValues.propertyValue.toLocaleString("en-US")}` : "—"}; credit range: ${updatedValues.creditRange ?? "—"}; income: ${updatedValues.annualIncome ? `$${updatedValues.annualIncome.toLocaleString("en-US")}` : "—"}; low/no-down-payment home search: ${updatedValues.lowDownPaymentHomeSearch === 1 ? `requested${updatedValues.targetArea ? ` for ${updatedValues.searchAreaType?.toLowerCase() ?? "area"} ${updatedValues.targetArea}` : ""}` : "not requested"}; phone: ${phone}; email: ${updatedValues.email ?? "—"}.`,
            });
          } catch (error) {
            console.error("[Chat] Owner notification failed:", error);
          }
          try {
            await deliverChatIntakeRecipientEmails({ ...lead, ...updatedValues, phone });
          } catch (error) {
            // Intake capture succeeds even when an external email provider is unavailable.
            console.error("[Chat] Intake recipient notification failed:", error);
            await updateChatLead(lead.id, {
              recipientEmailStatus: "manual_follow_up",
              recipientEmailDetail: "Unexpected error while sending recipient email notifications.",
            });
          }
          return {
            completed: true as const,
            currentStep: "complete" as const,
            message: completion,
            homesListRequested: updatedValues.lowDownPaymentHomeSearch === 1,
            buyerAgentEligible: updatedValues.loanPurpose === "purchase",
          };
        }

        await updateChatLead(lead.id, { ...persistedPatch, currentStep: parsed.nextStep });
        await addChatTranscript(lead.id, "assistant", parsed.response);
        return { completed: false as const, currentStep: parsed.nextStep, message: parsed.response };
      }),
    /** Public, explicit buyer-agent handoff request after a completed purchase intake. */
    requestBuyerAgent: publicProcedure
      .input(z.object({ sessionId: chatSessionSchema }))
      .mutation(async ({ input }) => {
        const lead = await getChatLeadBySession(input.sessionId);
        if (!lead || lead.status !== "qualified") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Complete the purchase intake before requesting a buyer-agent connection." });
        }
        if (lead.loanPurpose !== "purchase") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Buyer-agent connections are available for purchase planning conversations." });
        }
        const isNewRequest = lead.buyerAgentRequest !== 1;
        await updateChatLead(lead.id, { buyerAgentRequest: 1, buyerAgentRequestedAt: lead.buyerAgentRequestedAt ?? new Date() });
        if (isNewRequest && lead.propertyPageId) {
          await recordPropertyPageActivity({ propertyLandingPageId: lead.propertyPageId, eventType: "buyer_agent_request" });
        }
        if (isNewRequest) {
          try {
            await notifyOwner({
              title: `Buyer-agent connection requested: ${lead.fullName ?? "visitor"}`,
              content: `${lead.fullName ?? "A completed purchase intake"} requested a buyer-agent connection. Review the Mortgage chat intakes dashboard for contact information and planning details.`,
            });
          } catch (error) {
            console.error("[Chat] Buyer-agent request notification failed:", error);
          }
        }
        return { success: true as const, alreadyRequested: !isNewRequest };
      }),
    /** Admin-only list used by the dashboard's chat-intake review panel. */
    list: protectedProcedure.input(z.object({ activityRange: z.enum(PROPERTY_ACTIVITY_RANGES).optional() }).optional()).query(async ({ ctx, input }) => {
      const workspace = await resolveDashboardWorkspace(ctx.user);
      return listChatIntakeLeads({ activitySince: getPropertyActivitySince(input?.activityRange ?? "all"), loanOfficerId: workspace?.loanOfficerId });
    }),
    /** Admin-only transcript view for a single chat intake. */
    transcript: protectedProcedure
      .input(z.object({ chatLeadId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const workspace = await resolveDashboardWorkspace(ctx.user);
        if (workspace) {
          const lead = await getChatLeadById(input.chatLeadId);
          if (!lead || lead.loanOfficerId !== workspace.loanOfficerId) throw new TRPCError({ code: "NOT_FOUND", message: "Mortgage intake not found in your assigned workspace." });
        }
        return getChatTranscriptByLeadId(input.chatLeadId);
      }),
    /** Admin-only private follow-up notes for a chat intake. */
    updateNotes: protectedProcedure
      .input(z.object({ chatLeadId: z.number().int().positive(), notes: z.string().max(5000) }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await resolveDashboardWorkspace(ctx.user);
        const lead = await getChatLeadById(input.chatLeadId);
        if (!lead || (workspace && lead.loanOfficerId !== workspace.loanOfficerId)) throw new TRPCError({ code: "NOT_FOUND", message: "Mortgage intake not found." });
        await updateChatLead(input.chatLeadId, { notes: input.notes });
        return { success: true as const };
      }),
    /** Admin-only retry for a qualified intake that needs recipient email follow-up. */
    resend: protectedProcedure
      .input(z.object({ chatLeadId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const lead = await getChatLeadById(input.chatLeadId);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Mortgage intake not found." });
        if (lead.status !== "qualified") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only completed mortgage intakes can be resent." });
        }
        try {
          await recordChatIntakeResendAttempt(lead.id);
          return await deliverChatIntakeRecipientEmails(lead);
        } catch (error) {
          console.error("[Chat] Manual resend failed:", error);
          const recipientEmailDetail = "Unexpected error while resending recipient email notifications.";
          await updateChatLead(lead.id, { recipientEmailStatus: "manual_follow_up", recipientEmailDetail });
          return { recipientEmailStatus: "manual_follow_up" as const, recipientEmailDetail };
        }
      }),
    /** Admin-only manual agent assignment for a chat intake. */
    assignAgent: protectedProcedure
      .input(z.object({ chatLeadId: z.number().int().positive(), agentId: z.number().int().positive().nullable() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        if (input.agentId) {
          const agent = await getAgentById(input.agentId);
          if (!agent || agent.visible !== 1) {
            throw new TRPCError({ code: "NOT_FOUND", message: "That agent is no longer available." });
          }
        }
        const lead = await getChatLeadById(input.chatLeadId);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Mortgage intake not found." });
        await updateChatLead(input.chatLeadId, { agentId: input.agentId });
        return { success: true as const };
      }),
    /** Admin-only referral to the currently assigned agent, with a manual mail-draft fallback. */
    sendToAgent: protectedProcedure
      .input(z.object({ chatLeadId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const lead = await getChatLeadById(input.chatLeadId);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Mortgage intake not found." });
        if (!lead.agentId) throw new TRPCError({ code: "BAD_REQUEST", message: "Assign an agent before sending this intake." });
        const agent = await getAgentById(lead.agentId);
        if (!agent?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "The assigned agent does not have an email address." });
        const officer = lead.loanOfficerId ? await getLoanOfficerById(lead.loanOfficerId) : undefined;
        const coBrandedSourceUrl = officer?.slug && agent.slug
          ? publicSiteUrl(`/with/${officer.slug}/${agent.slug}`)
          : null;
        const result = await sendChatIntakeNotification({
          recipientName: agent.name,
          recipientEmail: agent.email,
          recipientRole: "agent",
          fullName: lead.fullName ?? "Visitor",
          email: lead.email ?? "Not provided",
          phone: lead.phone ?? "Not provided",
          loanPurpose: lead.loanPurpose,
          propertyType: lead.propertyType,
          propertyValue: lead.propertyValue,
          creditRange: lead.creditRange,
          annualIncome: lead.annualIncome,
          downPayment: lead.downPayment,
          loanAmount: lead.loanAmount,
          lowDownPaymentHomeSearch: lead.lowDownPaymentHomeSearch,
          searchAreaType: lead.searchAreaType,
          targetArea: lead.targetArea,
          calculatorContext: summarizeChatCalculatorContext(lead.scenario),
          coBrandedAgentName: agent.name,
          coBrandedSourceUrl,
        });
        await recordChatIntakeResendAttempt(lead.id);
        if (result.sent) {
          await updateChatLead(lead.id, { recipientEmailStatus: "sent", recipientEmailDetail: null });
          return { sent: true as const };
        }
        return { sent: false as const, reason: result.reason, mailto: buildChatAgentMailto(lead, agent, coBrandedSourceUrl) };
      }),
  }),

  texting: router({
    /** Admin-only non-secret provider readiness state. */
    status: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      const readiness = getTwilioReadiness();
      return { providerConfigured: readiness.configured, mode: readiness.mode, detail: readiness.detail, statusCallbackUrl: readiness.statusCallbackUrl };
    }),
    /** Admin-only: only recipients with recorded consent and a valid non-placeholder phone are returned. */
    recipients: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      const recipients = await listTextReadyRecipients();
      return recipients.filter((recipient) => hasUsableRoadmapPhone(recipient.phone));
    }),
    /** Admin-only: saved drafts and their independently-addressed recipients. */
    listDrafts: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return listTextMessageDrafts();
    }),
    /** Admin-only: one consented lead's ordered dashboard drafts and future provider-synchronized SMS/MMS events. */
    chain: protectedProcedure
      .input(z.object({ sourceType: z.enum(["roadmap", "chat"]), sourceLeadId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const candidate = (await listTextReadyRecipients()).find(
          (recipient) => recipient.sourceType === input.sourceType && recipient.sourceLeadId === input.sourceLeadId && hasUsableRoadmapPhone(recipient.phone)
        );
        if (!candidate) {
          throw new TRPCError({ code: "NOT_FOUND", message: "This lead is not currently text-ready." });
        }
        return listTextChainByLead(input);
      }),
    /** Admin-only: upload a JPG attachment to storage for a saved future MMS draft. */
    uploadJpg: protectedProcedure
      .input(
        z.object({
          fileName: z.string().trim().min(1).max(300),
          dataBase64: z.string().min(1).max(MAX_IMAGE_BASE64_CHARS, "JPG is too large (max ~4MB)."),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const buffer = Buffer.from(input.dataBase64, "base64");
        if (buffer.length === 0 || buffer.length > 4_000_000 || !isJpegBuffer(buffer)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a valid JPG file no larger than 4MB." });
        }
        const key = `text-drafts/${ctx.user.id}/${nanoid(16)}.jpg`;
        const { url } = await storagePut(key, buffer, "image/jpeg");
        return { storageKey: key, url, fileName: input.fileName, mimeType: "image/jpeg" as const, sizeBytes: buffer.length };
      }),
    /** Admin-only: save a provider-unconfigured message draft. This never sends an SMS or MMS. */
    saveDraft: protectedProcedure
      .input(
        z.object({
          body: z.string().trim().min(1, "Write a message before saving.").max(1600, "Messages are limited to 1600 characters."),
          recipients: z.array(textDraftRecipientSchema).min(1, "Select at least one text-ready lead.").max(100, "Select up to 100 leads per draft."),
          attachments: z.array(textDraftAttachmentSchema).max(3, "Attach up to three JPG files per draft."),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        assertOwnedTextAttachments(ctx.user.id, input.attachments);
        const candidates = await listTextReadyRecipients();
        const validCandidates = new Map(
          candidates
            .filter((candidate) => hasUsableRoadmapPhone(candidate.phone))
            .map((candidate) => [`${candidate.sourceType}:${candidate.sourceLeadId}`, candidate])
        );
        const distinctSelections = Array.from(new Map(input.recipients.map((recipient) => [`${recipient.sourceType}:${recipient.sourceLeadId}`, recipient])).values());
        const recipients = distinctSelections.map((selection) => validCandidates.get(`${selection.sourceType}:${selection.sourceLeadId}`)).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
        if (recipients.length !== distinctSelections.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "One or more selected leads are no longer text-ready. Refresh the workspace and review consent." });
        }
        const messageId = await createTextMessageDraft({
          body: input.body,
          createdByUserId: ctx.user.id,
          recipients,
          attachments: input.attachments,
        });
        return { messageId, providerConfigured: false as const, deliveryMode: "provider_setup_required" as const };
      }),
    /** Admin-only live delivery: human confirmation and current consent are mandatory for every selected lead. */
    sendConfirmed: protectedProcedure
      .input(
        z.object({
          confirmation: z.literal(true, { message: "Confirm that every selected lead has explicitly consented to text messages before sending." }),
          body: z.string().trim().min(1, "Write a message before sending.").max(1600, "Messages are limited to 1600 characters."),
          recipients: z.array(textDraftRecipientSchema).min(1, "Select at least one text-ready lead.").max(100, "Select up to 100 leads per confirmed send."),
          attachments: z.array(textDraftAttachmentSchema).max(3, "Attach up to three JPG files per message."),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        if (!getTwilioReadiness().configured) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Twilio is not securely configured. Sending remains disabled." });
        assertOwnedTextAttachments(ctx.user.id, input.attachments);
        const candidates = await listTextReadyRecipients();
        const validCandidates = new Map(
          candidates.filter((candidate) => hasUsableRoadmapPhone(candidate.phone)).map((candidate) => [`${candidate.sourceType}:${candidate.sourceLeadId}`, candidate])
        );
        const distinctSelections = Array.from(new Map(input.recipients.map((recipient) => [`${recipient.sourceType}:${recipient.sourceLeadId}`, recipient])).values());
        const recipients = distinctSelections.map((selection) => validCandidates.get(`${selection.sourceType}:${selection.sourceLeadId}`)).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
        if (recipients.length !== distinctSelections.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "One or more selected leads are no longer text-ready. Refresh the workspace and review recorded consent before sending." });
        }

        const created = await createTextMessageForTwilioDelivery({ body: input.body, createdByUserId: ctx.user.id, recipients, attachments: input.attachments });
        const outcomes: Array<{ sourceType: "roadmap" | "chat"; sourceLeadId: number; sent: boolean; status: string; detail: string }> = [];
        for (const recipient of created.recipients) {
          try {
            const provider = await sendTwilioTextMessage({ to: recipient.phone, body: input.body, attachmentUrls: input.attachments.map((attachment) => attachment.url) });
            const detail = provider.deliveryStatus === "queued" ? "Twilio accepted this message for delivery." : `Twilio reported ${provider.deliveryStatus}.`;
            await updateTextMessageRecipientDelivery({ textMessageRecipientId: recipient.id, deliveryStatus: provider.deliveryStatus, deliveryDetail: detail, providerMessageId: provider.providerMessageId, sentAt: new Date() });
            await recordTextChainEvent({ sourceType: recipient.sourceType, sourceLeadId: recipient.sourceLeadId, direction: "outgoing", body: input.body, eventStatus: provider.deliveryStatus, senderLabel: "Mike Ford", providerName: "twilio", providerMessageId: provider.providerMessageId, textMessageId: created.textMessageId, textMessageRecipientId: recipient.id, occurredAt: new Date(), attachments: input.attachments });
            outcomes.push({ sourceType: recipient.sourceType, sourceLeadId: recipient.sourceLeadId, sent: true, status: provider.deliveryStatus, detail });
          } catch (error) {
            const detail = safeTwilioErrorMessage(error);
            await updateTextMessageRecipientDelivery({ textMessageRecipientId: recipient.id, deliveryStatus: "failed", deliveryDetail: detail, sentAt: new Date() });
            await recordTextChainEvent({ sourceType: recipient.sourceType, sourceLeadId: recipient.sourceLeadId, direction: "outgoing", body: input.body, eventStatus: "failed", senderLabel: "Mike Ford", providerName: "twilio", textMessageId: created.textMessageId, textMessageRecipientId: recipient.id, occurredAt: new Date(), attachments: input.attachments });
            outcomes.push({ sourceType: recipient.sourceType, sourceLeadId: recipient.sourceLeadId, sent: false, status: "failed", detail });
          }
        }
        const sentCount = outcomes.filter((outcome) => outcome.sent).length;
        await updateTextMessageProviderMode({ textMessageId: created.textMessageId, providerMode: sentCount ? "sent" : "failed" });
        return { messageId: created.textMessageId, sentCount, failedCount: outcomes.length - sentCount, outcomes };
      }),
  }),

  geosphere: router({
    /** Admin-only configuration and most-recent import state for saved listings. */
    status: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return ensureGeoSphereSyncSetting();
    }),
    /** Admin-only area-pull index, ordered by the latest source snapshot. */
    listPulls: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return listGeoSphereSavedPulls();
    }),
    /** Admin-only listing browser for one saved pull and one persisted overlay set. */
    listListings: protectedProcedure
      .input(z.object({ savedPullId: z.number().int().positive(), overlay: z.enum(["all", "lmi", "usda", "lmiUsda"]) }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return listGeoSphereListings(input.savedPullId, input.overlay);
      }),
    /** Admin-only reusable listing-agent email copy. The builder adds all lead and listing variables separately. */
    listListingAgentEmailTemplates: protectedProcedure.input(z.object({ includeArchived: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return listListingAgentEmailTemplates(input?.includeArchived ?? false);
    }),
    /** Stores a reusable custom intro; recipient, property details, disclosures, and signature are always composed automatically. */
    saveListingAgentEmailTemplate: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(2, "Enter a template name.").max(160),
        bodyTemplate: z.string().trim().min(20, "Write at least 20 characters for the email body.").max(6000),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        try {
          const template = await createListingAgentEmailTemplate(input);
          await recordEmailTemplateVersion({ templateScope: "listing_agent", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, bodyTemplate: template.bodyTemplate });
          return template;
        } catch (error) {
          if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
            throw new TRPCError({ code: "CONFLICT", message: "A template with that name already exists." });
          }
          throw error;
        }
      }),
    updateListingAgentEmailTemplate: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160), bodyTemplate: z.string().trim().min(20).max(6000) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); const template = await updateListingAgentEmailTemplate(input); await recordEmailTemplateVersion({ templateScope: "listing_agent", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, bodyTemplate: template.bodyTemplate }); return template; }),
    setListingAgentEmailTemplateArchived: protectedProcedure.input(z.object({ id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await setListingAgentEmailTemplateArchived(input); return { archived: input.archived }; }),
    deleteListingAgentEmailTemplate: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await deleteListingAgentEmailTemplate(input.id); return { deleted: true }; }),
    /** Admin-only reusable buyer-facing property-email intros. Property variables and signature remain automatic. */
    listPropertyEmailTemplates: protectedProcedure.input(z.object({ includeArchived: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return listPropertyEmailTemplates(input?.includeArchived ?? false);
    }),
    savePropertyEmailTemplate: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(2, "Enter a template name.").max(160),
        bodyTemplate: z.string().trim().min(20, "Write at least 20 characters for the email body.").max(6000),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        try {
          const template = await createPropertyEmailTemplate(input);
          await recordEmailTemplateVersion({ templateScope: "property_list", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, bodyTemplate: template.bodyTemplate });
          return template;
        } catch (error) {
          if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
            throw new TRPCError({ code: "CONFLICT", message: "A template with that name already exists." });
          }
          throw error;
        }
      }),
    updatePropertyEmailTemplate: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160), bodyTemplate: z.string().trim().min(20).max(6000) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); const template = await updatePropertyEmailTemplate(input); await recordEmailTemplateVersion({ templateScope: "property_list", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, bodyTemplate: template.bodyTemplate }); return template; }),
    setPropertyEmailTemplateArchived: protectedProcedure.input(z.object({ id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await setPropertyEmailTemplateArchived(input); return { archived: input.archived }; }),
    deletePropertyEmailTemplate: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await deletePropertyEmailTemplate(input.id); return { deleted: true }; }),
    /** Records dashboard-opened listing-agent outreach drafts for per-property communication visibility. */
    recordListingEmailActivity: protectedProcedure
      .input(z.object({
        listingIds: z.array(z.number().int().positive()).min(1).max(100),
        templateName: z.string().trim().min(1).max(160),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return recordGeoSphereListingEmailActivity(input);
      }),
    /** Manually runs a cache-only import; it never calls Rentcast directly. */
    syncNow: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return syncGeoSphereSavedListings();
    }),
    /** Creates or updates the single weekly project-level GeoSphere sync job. */
    configureWeekly: protectedProcedure
      .input(z.object({ cron: z.string().trim().regex(/^\S+(?:\s+\S+){5}$/, "Use a six-field UTC cron expression.") }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const setting = await ensureGeoSphereSyncSetting();
        const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
        const description = "Weekly cache-only import of manually refreshed GeoSphere saved Rentcast listings.";
        if (setting?.scheduleCronTaskUid) {
          const result = await updateHeartbeatJob(
            setting.scheduleCronTaskUid,
            { cron: input.cron, path: "/api/scheduled/geosphere-sync", method: "POST", description, enable: true },
            sessionToken
          );
          return { taskUid: setting.scheduleCronTaskUid, ...result };
        }
        const job = await createHeartbeatJob(
          {
            name: "geosphere-weekly-saved-listing-sync",
            cron: input.cron,
            path: "/api/scheduled/geosphere-sync",
            method: "POST",
            description,
          },
          sessionToken
        );
        await updateGeoSphereSyncSetting({ scheduleCronTaskUid: job.taskUid });
        return job;
      }),
  }),

  propertyPages: router({
    /** Public saved-snapshot lookup for a /property/:slug marketing page. */
    getPublic: publicProcedure
      .input(z.object({ slug: propertyPageSlugSchema }))
      .query(async ({ input }) => (await getPropertyLandingPageBySlug(input.slug)) ?? null),
    /** Records page-level interactions only; visitor identity stays in protected lead tables. */
    trackActivity: publicProcedure
      .input(z.object({
        slug: propertyPageSlugSchema,
        eventType: z.enum(["page_view", "buydown_calculator", "cost_of_waiting_calculator", "social_share", "print_export", "email_pdf_summary", "calendar_click"]),
        detail: z.string().trim().max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        const page = await getPropertyLandingPageBySlug(input.slug);
        if (!page?.page) return { recorded: false as const };
        await recordPropertyPageActivity({ propertyLandingPageId: page.page.id, eventType: input.eventType, detail: input.detail ?? null });
        return { recorded: true as const };
      }),
    /** Dashboard inventory of public property pages and their current co-brand assignment. */
    list: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await resolveDashboardWorkspace(ctx.user);
      return listPropertyLandingPages(workspace?.loanOfficerId);
    }),
    /** Private owner-managed internal seller-contribution screens. */
    programContributionLimits: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getProgramContributionLimits(ctx.user.id);
    }),
    saveProgramContributionLimits: protectedProcedure
      .input(z.object({
        limits: z.object({
          fha: z.object({ percentBps: z.number().int().min(0).max(10_000), dollarCap: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable() }),
          va: z.object({ percentBps: z.number().int().min(0).max(10_000), dollarCap: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable() }),
          usda: z.object({ percentBps: z.number().int().min(0).max(10_000), dollarCap: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable() }),
          conventional_primary: z.object({ percentBps: z.number().int().min(0).max(10_000), dollarCap: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable() }),
          conventional_second_home: z.object({ percentBps: z.number().int().min(0).max(10_000), dollarCap: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable() }),
          conventional_investment: z.object({ percentBps: z.number().int().min(0).max(10_000), dollarCap: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable() }),
          conventional_ltv81_90: z.object({ percentBps: z.number().int().min(0).max(10_000), dollarCap: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable() }),
          conventional_gt90: z.object({ percentBps: z.number().int().min(0).max(10_000), dollarCap: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable() }),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return saveProgramContributionLimits({ ownerUserId: ctx.user.id, limits: input.limits });
      }),
    weeklyEngagement: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return listWeeklyPropertyPageEngagement();
    }),
    engagementSetting: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return (await getPropertyEngagementSetting(ctx.user.id)) ?? {
        highActivityThreshold: HIGH_ACTIVITY_WEEKLY_THRESHOLD,
        weeklySort: "activity" as const,
        minimumActivity: 1,
      };
    }),
    saveEngagementThreshold: protectedProcedure
      .input(z.object({ highActivityThreshold: z.number().int().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return savePropertyEngagementThreshold({ ownerUserId: ctx.user.id, highActivityThreshold: input.highActivityThreshold });
      }),
    saveEngagementPreferences: protectedProcedure
      .input(z.object({
        highActivityThreshold: z.number().int().min(1).max(1000),
        weeklySort: z.enum(["activity", "conversion"]),
        minimumActivity: z.number().int().min(1).max(1000),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return savePropertyEngagementPreferences({ ownerUserId: ctx.user.id, ...input });
      }),
    activity: protectedProcedure
      .input(z.object({ propertyLandingPageId: z.number().int().positive(), activityRange: z.enum(PROPERTY_ACTIVITY_RANGES).optional() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return listPropertyPageActivity(input.propertyLandingPageId, getPropertyActivitySince(input.activityRange ?? "all"));
      }),
    /** Creates or refreshes a public page from one immutable saved-listing snapshot. */
    createFromListing: protectedProcedure
      .input(z.object({
        geosphereListingId: z.number().int().positive(),
        loanOfficerId: z.number().int().positive(),
        agentId: z.number().int().positive(),
        externalListingUrl: optionalPublicHttpUrl,
        propertyTaxes: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable().optional(),
        units: z.string().trim().max(80).nullable().optional(),
        hoaDues: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable().optional(),
        homeownerInsurance: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable().optional(),
        mortgageInsurance: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable().optional(),
        complianceApprovalStatus: z.enum(["draft", "submitted", "approved", "changes_requested", "needs_review"]).optional(),
        contributionProgram: z.enum(["none", "fha", "va", "usda", "conventional"]).optional(),
        conventionalOccupancy: z.enum(["primary", "second_home", "investment"]).optional(),
        conventionalLtvTier: z.enum(["lte80", "ltv81_90", "gt90"]).optional(),
        programContributionLimit: z.number().finite().min(0).max(1_000_000).multipleOf(0.01).nullable().optional(),
        maxSellerContribution: z.number().finite().min(0).max(1_000_000).multipleOf(0.01).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await resolveDashboardWorkspace(ctx.user);
        if (workspace && input.loanOfficerId !== workspace.loanOfficerId) throw new TRPCError({ code: "FORBIDDEN", message: "Team members can create property pages only for their assigned loan-officer profile." });
        const [officer, agent] = await Promise.all([getLoanOfficerById(input.loanOfficerId), getAgentById(input.agentId)]);
        if (!officer || officer.visible !== 1 || !agent || agent.visible !== 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an available loan officer and co-branded agent." });
        }
        return createPropertyLandingPage(input);
      }),
    /** Reassigns a saved property page to any selected dashboard LO + agent pairing. */
    updatePair: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        loanOfficerId: z.number().int().positive(),
        agentId: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const [officer, agent] = await Promise.all([getLoanOfficerById(input.loanOfficerId), getAgentById(input.agentId)]);
        if (!officer || officer.visible !== 1 || !agent || agent.visible !== 1) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an available loan officer and co-branded agent." });
        }
        return updatePropertyLandingPagePair(input);
      }),
    setActive: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return updatePropertyLandingPageStatus(input);
      }),
    /** Saves an optional, owner-supplied third-party live property-page link without importing its content. */
    updateExternalListingUrl: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), externalListingUrl: optionalPublicHttpUrl }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return updatePropertyLandingPageExternalListingUrl(input);
      }),
    /** Updates owner-entered property facts and private compliance planning controls after a public page exists. */
    updateMetadata: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        propertyTaxes: z.number().finite().min(0).max(10_000_000).multipleOf(0.01).nullable(),
        units: z.string().trim().max(80).nullable(),
        hoaDues: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable(),
        homeownerInsurance: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable(),
        mortgageInsurance: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable(),
        complianceApprovalStatus: z.enum(["draft", "submitted", "approved", "changes_requested", "needs_review"]),
        contributionProgram: z.enum(["none", "fha", "va", "usda", "conventional"]),
        conventionalOccupancy: z.enum(["primary", "second_home", "investment"]),
        conventionalLtvTier: z.enum(["lte80", "ltv81_90", "gt90"]),
        programContributionLimit: z.number().finite().min(0).max(1_000_000).multipleOf(0.01).nullable(),
        maxSellerContribution: z.number().finite().min(0).max(1_000_000).multipleOf(0.01).nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return updatePropertyLandingPageMetadata(input);
      }),
    /** Refreshes only from the existing saved GeoSphere record; it never invokes a live listing provider. */
    refreshSnapshot: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return refreshPropertyLandingPage(input.id);
      }),
    /** Creates a factual draft from the saved snapshot only; dashboard review is required before it appears publicly. */
    generateAiSummary: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), tone: z.enum(["professional", "exciting"]).default("professional") }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const page = await getPropertyLandingPageById(input.id);
        if (!page?.page) throw new TRPCError({ code: "NOT_FOUND", message: "Property page not found." });
        const snapshot = parsePropertyLandingSnapshot(page.page.listingSnapshot);
        if (!snapshot) throw new TRPCError({ code: "BAD_REQUEST", message: "This saved property snapshot cannot be summarized." });
        const { data: models } = await listLLMModels();
        const model = models.find((entry) => entry.id === "gpt-5-mini")?.id ?? models.find((entry) => entry.id.startsWith("gpt-5"))?.id;
        const source = {
          address: snapshot.address,
          savedPrice: snapshot.price,
          bedrooms: snapshot.bedrooms,
          bathrooms: snapshot.bathrooms,
          squareFootage: snapshot.squareFootage,
          lotSize: snapshot.lotSize,
          acreage: snapshot.acreage,
          propertyType: snapshot.propertyType,
          manufacturedHomeType: snapshot.manufacturedHomeType,
          yearBuilt: snapshot.yearBuilt,
          units: snapshot.units,
          description: snapshot.description,
          savedStatus: snapshot.status,
          eligibilityScreening: propertyEligibilityLabel(snapshot),
          financingContext: propertyFinancingContext(snapshot),
        };
        const response = await invokeLLM({
          model,
          messages: [
            { role: "system", content: `Write a 55-90 word ${input.tone === "exciting" ? "warm and energetic" : "professional and measured"} but strictly factual property-description draft. Use only the supplied saved snapshot. Do not invent facts. Do not say the property is available, current, eligible, approved, guaranteed, live, or perfect. Do not mention loans, rates, schools, neighborhoods, investment returns, or protected audiences. If financingContext is supplied, include its qualified first-time-buyer financing message in one concise sentence without adding other financing claims. If financingContext is null, do not mention financing. Output JSON only.` },
            { role: "user", content: `Saved property snapshot:\n${JSON.stringify(source)}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "property_summary",
              strict: true,
              schema: {
                type: "object",
                properties: { summary: { type: "string", minLength: 20, maxLength: 900 } },
                required: ["summary"],
                additionalProperties: false,
              },
            },
          },
        });
        let draft: { summary?: string };
        try {
          const content = response.choices[0]?.message?.content;
          draft = JSON.parse(typeof content === "string" ? content : "{}");
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The AI draft response could not be read. Please try again." });
        }
        const summary = draft.summary?.trim();
        if (!summary) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The AI draft was empty. Please try again." });
        return { summary };
      }),
    /** Saves the dashboard-reviewed draft for optional public display, or clears it when passed null. */
    saveAiSummary: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), summary: z.string().trim().max(1200).nullable() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return updatePropertyLandingPageAiSummary({ id: input.id, aiSummary: input.summary || null });
      }),
    listAgentEmailTemplates: protectedProcedure.input(z.object({ includeArchived: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return listPropertyPageAgentEmailTemplates(input?.includeArchived ?? false);
    }),
    saveAgentEmailTemplate: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(2, "Enter a template name.").max(160),
        bodyTemplate: z.string().trim().min(20, "Write at least 20 characters for the email body.").max(6000),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        try {
          const template = await createPropertyPageAgentEmailTemplate(input);
          await recordEmailTemplateVersion({ templateScope: "property_page_agent", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, bodyTemplate: template.bodyTemplate });
          return template;
        } catch (error) {
          if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
            throw new TRPCError({ code: "CONFLICT", message: "A template with that name already exists." });
          }
          throw error;
        }
      }),
    updateAgentEmailTemplate: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160), bodyTemplate: z.string().trim().min(20).max(6000) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); const template = await updatePropertyPageAgentEmailTemplate(input); await recordEmailTemplateVersion({ templateScope: "property_page_agent", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, bodyTemplate: template.bodyTemplate }); return template; }),
    setAgentEmailTemplateArchived: protectedProcedure.input(z.object({ id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await setPropertyPageAgentEmailTemplateArchived(input); return { archived: input.archived }; }),
    deleteAgentEmailTemplate: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await deletePropertyPageAgentEmailTemplate(input.id); return { deleted: true }; }),
    listBuyerEmailTemplates: protectedProcedure.input(z.object({ includeArchived: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return input?.includeArchived ? listPropertyPageBuyerEmailTemplates(ctx.user.id, true) : listPropertyPageBuyerEmailTemplates(ctx.user.id);
    }),
    saveBuyerEmailTemplate: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(2, "Enter a template name.").max(160),
        subjectTemplate: z.string().trim().min(4, "Enter an email subject.").max(300),
        bodyTemplate: z.string().trim().min(20, "Write at least 20 characters for the email body.").max(6000),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        try {
          const template = await createPropertyPageBuyerEmailTemplate({ ownerUserId: ctx.user.id, ...input });
          await recordEmailTemplateVersion({ templateScope: "property_page_buyer", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, subjectTemplate: template.subjectTemplate, bodyTemplate: template.bodyTemplate });
          return template;
        } catch (error) {
          if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
            throw new TRPCError({ code: "CONFLICT", message: "A buyer email template with that name already exists." });
          }
          throw error;
        }
      }),
    updateBuyerEmailTemplate: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().trim().min(2, "Enter a template name.").max(160),
        subjectTemplate: z.string().trim().min(4, "Enter an email subject.").max(300),
        bodyTemplate: z.string().trim().min(20, "Write at least 20 characters for the email body.").max(6000),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const template = await updatePropertyPageBuyerEmailTemplate({ ownerUserId: ctx.user.id, ...input });
        await recordEmailTemplateVersion({ templateScope: "property_page_buyer", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, subjectTemplate: template.subjectTemplate, bodyTemplate: template.bodyTemplate });
        return template;
      }),
    setBuyerEmailTemplateArchived: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), archived: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await setPropertyPageBuyerEmailTemplateArchived({ ownerUserId: ctx.user.id, ...input });
        return { archived: input.archived };
      }),
    deleteBuyerEmailTemplate: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await deletePropertyPageBuyerEmailTemplate({ ownerUserId: ctx.user.id, id: input.id });
        return { deleted: true };
      }),
    emailPdfSummaryEngagement: protectedProcedure
      .input(z.object({ range: z.enum(PROPERTY_ACTIVITY_RANGES).default("7d") }).optional())
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return getPropertyEmailPdfSummaryEngagement(getPropertyActivitySince(input?.range ?? "7d"));
      }),
    calendarClickEngagement: protectedProcedure
      .input(z.object({ range: z.enum(PROPERTY_ACTIVITY_RANGES).default("7d") }).optional())
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return getPropertyCalendarClickEngagement(getPropertyActivitySince(input?.range ?? "7d"));
      }),
  }),

  pairingSpendTracker: router({
    /** Private owner-only dashboard data; never exposed to public pages or agent accounts. */
    list: protectedProcedure.query(async ({ ctx }) => {
      await resolveDashboardWorkspace(ctx.user);
      return listLoAgentSpendTrackers(ctx.user.id);
    }),
    createPairing: protectedProcedure
      .input(z.object({ loanOfficerId: z.number().int().positive(), agentId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await resolveDashboardWorkspace(ctx.user);
        if (workspace && input.loanOfficerId !== workspace.loanOfficerId) throw new TRPCError({ code: "FORBIDDEN", message: "Team members can create spend trackers only for their assigned loan-officer profile." });
        const [officer, agent] = await Promise.all([getLoanOfficerById(input.loanOfficerId), getAgentById(input.agentId)]);
        if (!officer) throw new TRPCError({ code: "NOT_FOUND", message: "Loan officer not found." });
        if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found." });
        return createLoAgentSpendPairing({ ownerUserId: ctx.user.id, ...input });
      }),
    addEntry: protectedProcedure
      .input(z.object({
        pairingId: z.number().int().positive(),
        spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date."),
        category: z.enum(["ad_spend", "facebook_ads", "google_ads", "event", "print", "digital", "other"]),
        description: z.string().trim().min(1, "Enter a description.").max(300),
        loanOfficerCents: z.number().int().min(0).max(100_000_000),
        agentCents: z.number().int().min(0).max(100_000_000),
      }).refine((value) => value.loanOfficerCents + value.agentCents > 0, { message: "Enter a contribution from at least one side." }))
      .mutation(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        const pairing = await getLoAgentSpendPairingForOwner(input.pairingId, ctx.user.id);
        if (!pairing) throw new TRPCError({ code: "NOT_FOUND", message: "Pairing tracker not found." });
        return addLoAgentSpendEntry({ ...input, spentOn: new Date(`${input.spentOn}T12:00:00.000Z`) });
      }),
    deleteEntry: protectedProcedure
      .input(z.object({ pairingId: z.number().int().positive(), entryId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        const pairing = await getLoAgentSpendPairingForOwner(input.pairingId, ctx.user.id);
        if (!pairing) throw new TRPCError({ code: "NOT_FOUND", message: "Pairing tracker not found." });
        await deleteLoAgentSpendEntry(input);
        return { success: true } as const;
      }),
    updateEntry: protectedProcedure
      .input(z.object({ pairingId: z.number().int().positive(), entryId: z.number().int().positive(), spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), category: z.enum(["ad_spend", "facebook_ads", "google_ads", "event", "print", "digital", "other"]), description: z.string().trim().min(1).max(300), loanOfficerCents: z.number().int().min(0).max(100_000_000), agentCents: z.number().int().min(0).max(100_000_000) }).refine((value) => value.loanOfficerCents + value.agentCents > 0, { message: "Enter a contribution from at least one side." }))
      .mutation(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        const pairing = await getLoAgentSpendPairingForOwner(input.pairingId, ctx.user.id);
        if (!pairing) throw new TRPCError({ code: "NOT_FOUND", message: "Pairing tracker not found." });
        await updateLoAgentSpendEntry({ ...input, spentOn: new Date(`${input.spentOn}T12:00:00.000Z`) });
        return { success: true } as const;
      }),
    deletePairing: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        const pairing = await getLoAgentSpendPairingForOwner(input.id, ctx.user.id);
        if (!pairing) throw new TRPCError({ code: "NOT_FOUND", message: "Pairing tracker not found." });
        await deleteLoAgentSpendPairing({ id: input.id, ownerUserId: ctx.user.id });
        return { success: true } as const;
      }),
  }),

  mortgageQuotes: router({
    /** Private owner-only saved payment scenarios; never exposed to public pages or agent accounts. */
    list: protectedProcedure
      .input(z.object({
        firstName: z.string().trim().max(120).optional(),
        lastName: z.string().trim().max(120).optional(),
        program: z.enum(["conventional", "fha", "usda", "va", "nonqm"]).optional(),
        maxPurchasePriceCents: z.number().int().min(0).max(1_000_000_000).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        return listMortgagePaymentQuotes(ctx.user.id, input);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(1, "Enter a quote name.").max(120),
        firstName: z.string().trim().max(120).optional().default(""),
        lastName: z.string().trim().max(120).optional().default(""),
        program: z.enum(["conventional", "fha", "usda", "va", "nonqm"]).optional().default("conventional"),
        purchasePriceCents: z.number().int().min(0).max(1_000_000_000),
        downPaymentPercentBasisPoints: z.number().int().min(0).max(10_000),
        annualRateBasisPoints: z.number().int().min(0).max(10_000),
        termYears: z.union([z.literal(15), z.literal(30)]),
        annualPropertyTaxCents: z.number().int().min(0).max(100_000_000),
        annualHomeInsuranceCents: z.number().int().min(0).max(100_000_000),
        monthlyFloodInsuranceCents: z.number().int().min(0).max(10_000_000).optional().default(0),
        monthlyHoaDuesCents: z.number().int().min(0).max(10_000_000),
        monthlyMortgageInsuranceCents: z.number().int().min(0).max(10_000_000),
        creditScore: z.number().int().min(0).max(1_000).optional().default(0),
        grossMonthlyIncomeCents: z.number().int().min(0).max(1_000_000_000).optional().default(0),
        monthlyConsumerDebtCents: z.number().int().min(0).max(100_000_000).optional().default(0),
        maxHousingPaymentCents: z.number().int().min(0).max(100_000_000).optional().default(0),
        availablePrincipalAndInterestCents: z.number().int().min(0).max(100_000_000).optional().default(0),
        maxPurchasePriceResultCents: z.number().int().min(0).max(1_000_000_000).optional().default(0),
        dtiBasisPoints: z.number().int().min(0).max(10_000).optional().default(5_000),
        minimumCreditScore: z.number().int().min(0).max(1_000).optional().default(680),
      }))
      .mutation(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        return createMortgagePaymentQuote({ ownerUserId: ctx.user.id, ...input });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        await deleteMortgagePaymentQuote({ id: input.id, ownerUserId: ctx.user.id });
        return { success: true } as const;
      }),
  }),

  campaignSpend: router({
    /** Private administrator-only paid-campaign entries; never exposed to public property or landing pages. */
    list: protectedProcedure.query(async ({ ctx }) => {
      await resolveDashboardWorkspace(ctx.user);
      return listCampaignSpendEntries(ctx.user.id);
    }),
    add: protectedProcedure
      .input(z.object({
        utmSource: z.string().trim().min(1, "Enter a UTM source.").max(120),
        utmMedium: z.string().trim().min(1, "Enter a UTM medium.").max(120),
        utmCampaign: z.string().trim().min(1, "Enter a UTM campaign.").max(160),
        spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date."),
        spendCents: z.number().int().min(1, "Enter a positive spend amount.").max(100_000_000),
        notes: z.string().trim().max(300).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        return createCampaignSpendEntry({
          ...input,
          ownerUserId: ctx.user.id,
          spentOn: new Date(`${input.spentOn}T12:00:00.000Z`),
          notes: input.notes || null,
        });
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        await deleteCampaignSpendEntry({ id: input.id, ownerUserId: ctx.user.id });
        return { success: true } as const;
      }),
  }),

  loanOfficer: router({
    getFeatured: publicProcedure.query(async () => (await getFeaturedLoanOfficer()) ?? null),
    /** Public: resolve a visible standalone loan-officer profile. */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string().trim().toLowerCase().min(1).max(160) }))
      .query(async ({ input }) => {
        if (!SLUG_PATTERN.test(input.slug)) return null;
        const officer = await getLoanOfficerBySlug(input.slug);
        if (!officer || officer.visible !== 1) return null;
        return officer;
      }),
    /** Public: resolve only a visible saved LO-agent partner pair. */
    getPair: publicProcedure
      .input(z.object({ loanOfficerSlug: z.string().trim().toLowerCase(), agentSlug: z.string().trim().toLowerCase() }))
      .query(async ({ input }) => {
        if (!SLUG_PATTERN.test(input.loanOfficerSlug) || !SLUG_PATTERN.test(input.agentSlug)) return null;
        const [officer, agent] = await Promise.all([
          getLoanOfficerBySlug(input.loanOfficerSlug),
          getAgentBySlug(input.agentSlug),
        ]);
        if (!officer || !agent || officer.visible !== 1 || agent.visible !== 1 || officer.agentId !== agent.id) return null;
        return { officer, agent };
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return listLoanOfficers();
    }),
    create: protectedProcedure.input(loanOfficerInputSchema).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      if (input.agentId !== null && !(await getAgentById(input.agentId))) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Selected agent not found." });
      }
      const slug = await resolveUniqueLoanOfficerSlug(input.slug, input.name);
      const id = await createLoanOfficer({ ...input, slug, visible: input.visible ? 1 : 0 });
      return { id: Number(id), slug } as const;
    }),
    update: protectedProcedure
      .input(loanOfficerInputSchema.extend({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const existing = await getLoanOfficerById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Loan officer not found." });
        if (input.agentId !== null && !(await getAgentById(input.agentId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Selected agent not found." });
        }
        const { id, visible, ...values } = input;
        const slug = await resolveUniqueLoanOfficerSlug(values.slug || existing.slug, values.name, id);
        await updateLoanOfficer(id, { ...values, slug, visible: visible ? 1 : 0 });
        return { success: true, slug } as const;
      }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await deleteLoanOfficer(input.id);
      return { success: true } as const;
    }),
    setFeatured: protectedProcedure
      .input(z.object({ id: z.number().int().positive().nullable() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        if (input.id !== null && !(await getLoanOfficerById(input.id))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Loan officer not found." });
        }
        await setFeaturedLoanOfficer(input.id);
        return { success: true } as const;
      }),
    /** Admin-only: upload an LO headshot or company logo (base64) to storage. */
    uploadImage: protectedProcedure
      .input(
        z.object({
          kind: z.enum(["headshot", "logo"]),
          mimeType: z.string(),
          dataBase64: z.string().min(1).max(MAX_IMAGE_BASE64_CHARS, "Image is too large (max ~4MB)."),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const ext = IMAGE_MIME_EXT[input.mimeType];
        if (!ext) throw new TRPCError({ code: "BAD_REQUEST", message: "Only PNG, JPEG, WebP, or GIF images are allowed." });
        const key = `loan-officer/${input.kind}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, Buffer.from(input.dataBase64, "base64"), input.mimeType);
        return { url } as const;
      }),
  }),

  agent: router({
    /** Public: the default landing page (/) shows the featured agent. */
    getFeatured: publicProcedure.query(async () => {
      const agent = await getFeaturedAgent();
      return agent ?? null;
    }),
    /** Public: co-branded /with/:slug pages look up their agent by slug. */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string().trim().toLowerCase().min(1).max(160) }))
      .query(async ({ input }) => {
        if (!SLUG_PATTERN.test(input.slug)) return null;
        const agent = await getAgentBySlug(input.slug);
        if (!agent || agent.visible !== 1) return null;
        return agent;
      }),
    /** Admin-only: full agent list for the dashboard manager. */
    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return listAgents();
    }),
    /**
     * Admin-only: per-agent lead counts — leads captured through the agent's
     * co-branded link, currently assigned leads, and referred (emailed) leads.
     */
    stats: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAgentLeadStats();
    }),
    /** Admin-only: create a new agent; slug auto-derived from name if blank. */
    create: protectedProcedure
      .input(agentProfileInputSchema.extend({ name: z.string().trim().min(1, "Agent name is required").max(160) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        if (input.syncedTopAgentId !== null) {
          const synced = await getSyncedTopAgent(ctx.user.id, input.syncedTopAgentId);
          if (!synced) throw new TRPCError({ code: "NOT_FOUND", message: "That synced agent profile is unavailable." });
        }
        const slug = await resolveUniqueSlug(input.slug, input.name);
        const id = await createAgent({
          name: input.name,
          slug,
          email: input.email,
          phone: input.phone,
          bio: input.bio,
          website: input.website,
          facebookUrl: input.facebookUrl,
          instagramUrl: input.instagramUrl,
          linkedinUrl: input.linkedinUrl,
          companyName: input.companyName,
          headshotUrl: input.headshotUrl,
          companyLogoUrl: input.companyLogoUrl,
          syncedTopAgentId: input.syncedTopAgentId,
          visible: input.visible ? 1 : 0,
        });
        if (input.syncedTopAgentId !== null) {
          await markSyncedTopAgentCreated(ctx.user.id, input.syncedTopAgentId, Number(id));
        }
        return { id, slug } as const;
      }),
    /** Admin-only: update an existing agent. */
    update: protectedProcedure
      .input(
        agentProfileInputSchema.extend({
          id: z.number().int().positive(),
          name: z.string().trim().min(1, "Agent name is required").max(160),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const existing = await getAgentById(input.id);
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found." });
        }
        const slug = await resolveUniqueSlug(input.slug || existing.slug, input.name, input.id);
        await updateAgent(input.id, {
          name: input.name,
          slug,
          email: input.email,
          phone: input.phone,
          bio: input.bio,
          website: input.website,
          facebookUrl: input.facebookUrl,
          instagramUrl: input.instagramUrl,
          linkedinUrl: input.linkedinUrl,
          companyName: input.companyName,
          headshotUrl: input.headshotUrl,
          companyLogoUrl: input.companyLogoUrl,
          syncedTopAgentId: input.syncedTopAgentId,
          visible: input.visible ? 1 : 0,
        });
        return { success: true, slug } as const;
      }),
    /** Admin-only: delete an agent (unassigns them from any leads). */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await deleteAgent(input.id);
        return { success: true } as const;
      }),
    /** Admin-only: choose which agent (or none) appears on the homepage. */
    setFeatured: protectedProcedure
      .input(z.object({ id: z.number().int().positive().nullable() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        if (input.id !== null) {
          const agent = await getAgentById(input.id);
          if (!agent) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found." });
          }
        }
        await setFeaturedAgent(input.id);
        return { success: true } as const;
      }),
    /** Admin-only: upload a headshot or company logo image (base64) to storage. */
    uploadImage: protectedProcedure
      .input(
        z.object({
          kind: z.enum(["headshot", "logo"]),
          mimeType: z.string(),
          dataBase64: z.string().min(1).max(MAX_IMAGE_BASE64_CHARS, "Image is too large (max ~4MB)."),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const ext = IMAGE_MIME_EXT[input.mimeType];
        if (!ext) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only PNG, JPEG, WebP, or GIF images are allowed.",
          });
        }
        const buffer = Buffer.from(input.dataBase64, "base64");
        const key = `agent/${input.kind}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url } as const;
      }),
  }),

  platformLeads: router({
    /** Private native Meta and Google form leads; website funnel leads remain in their existing sections. */
    list: protectedProcedure
      .input(z.object({ status: z.enum(["test", "new", "archived"]).optional() }).optional())
      .query(async ({ ctx, input }) => {
        await resolveDashboardWorkspace(ctx.user);
        return listPlatformLeads(ctx.user.id, input?.status);
      }),
    createManual: protectedProcedure
      .input(z.object({
        leadSource: z.enum(["facebook", "google_ads", "organic"]),
        fullName: z.string().trim().min(1, "A lead name is required.").max(240),
        email: z.string().trim().email("Enter a valid email address.").max(320).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional(),
        externalFormId: z.string().trim().max(80).optional(),
        externalCampaignId: z.string().trim().max(80).optional(),
        notes: z.string().trim().max(1000).optional(),
        assignedLoanOfficerId: z.number().int().positive().nullable().optional(),
        assignedAgentId: z.number().int().positive().nullable().optional(),
      }).superRefine((value, context) => {
        if (!value.email?.trim() && !value.phone?.trim()) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Enter an email address or phone number." });
        }
      }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await resolveDashboardWorkspace(ctx.user);
        const assignedLoanOfficerId = workspace?.loanOfficerId ?? input.assignedLoanOfficerId ?? null;
        if (workspace && input.assignedLoanOfficerId && input.assignedLoanOfficerId !== workspace.loanOfficerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Team members can assign platform leads only to their active loan-officer profile." });
        }
        if (assignedLoanOfficerId && !(await getLoanOfficerById(assignedLoanOfficerId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "The selected loan officer is no longer available." });
        }
        if (input.assignedAgentId && !(await getAgentById(input.assignedAgentId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "The selected co-branded agent is no longer available." });
        }
        const names = input.fullName.split(/\s+/);
        const result = await createPlatformLeadIfAbsent({
          ownerUserId: ctx.user.id,
          provider: "manual",
          externalLeadId: `manual-${nanoid(16)}`,
          ingestionMethod: "manual",
          leadSource: input.leadSource,
          status: "new",
          firstName: names[0] ?? "",
          lastName: names.slice(1).join(" "),
          fullName: input.fullName,
          email: input.email?.trim() ?? "",
          phone: input.phone?.trim() ?? "",
          consentText: null,
          externalPageId: null,
          externalFormId: input.externalFormId?.trim() || null,
          externalCampaignId: input.externalCampaignId?.trim() || null,
          externalAdSetId: null,
          externalAdId: null,
          externalCreativeId: null,
          googleClickId: null,
          assignedLoanOfficerId,
          assignedAgentId: input.assignedAgentId ?? null,
          providerSubmittedAt: null,
        });
        if (result.created && input.notes?.trim()) {
          await createPlatformLeadNote({ ownerUserId: ctx.user.id, platformLeadId: result.id, body: input.notes.trim() });
        }
        return { id: result.id, created: result.created } as const;
      }),
    updateAssignments: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), assignedLoanOfficerId: z.number().int().positive().nullable(), assignedAgentId: z.number().int().positive().nullable() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        if (input.assignedLoanOfficerId && !(await getLoanOfficerById(input.assignedLoanOfficerId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "The selected loan officer is no longer available." });
        }
        if (input.assignedAgentId && !(await getAgentById(input.assignedAgentId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "The selected co-branded agent is no longer available." });
        }
        await updatePlatformLeadAssignments({ ownerUserId: ctx.user.id, ...input });
        return { success: true } as const;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        fullName: z.string().trim().min(1, "A lead name is required.").max(240),
        email: z.string().trim().email("Enter a valid email address.").max(320).optional().or(z.literal("")),
        phone: z.string().trim().max(40).optional(),
        leadSource: z.enum(["facebook", "google_ads", "organic"]),
        externalFormId: z.string().trim().max(80).optional().or(z.literal("")),
        externalCampaignId: z.string().trim().max(80).optional().or(z.literal("")),
        followUpAt: z.coerce.date().nullable().optional(),
        followUpChannel: z.enum(["phone", "text", "email", "listings", "agent_connection", "roadmap"]).nullable().optional(),
      }).superRefine((value, context) => {
        if (!value.email?.trim() && !value.phone?.trim()) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Enter an email address or phone number." });
        }
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await updatePlatformLeadDetails({
          ownerUserId: ctx.user.id,
          id: input.id,
          fullName: input.fullName,
          email: input.email?.trim() ?? "",
          phone: input.phone?.trim() ?? "",
          leadSource: input.leadSource,
          externalFormId: input.externalFormId?.trim() || null,
          externalCampaignId: input.externalCampaignId?.trim() || null,
          followUpAt: input.followUpAt ?? null,
          followUpChannel: input.followUpChannel ?? null,
        });
        return { success: true } as const;
      }),
    progressStatuses: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        requireAdmin(ctx.user.role);
        return ensurePlatformLeadProgressStatuses(ctx.user.id);
      }),
      create: protectedProcedure
        .input(z.object({ label: z.string().trim().min(1).max(80), color: z.enum(["slate", "blue", "amber", "violet", "emerald", "rose"]) }))
        .mutation(async ({ ctx, input }) => {
          requireAdmin(ctx.user.role);
          const statusKey = slugify(input.label).slice(0, 80);
          if (!statusKey) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a status name using letters or numbers." });
          const statuses = await ensurePlatformLeadProgressStatuses(ctx.user.id);
          const sortOrder = (statuses.at(-1)?.sortOrder ?? -1) + 1;
          try {
            return await createPlatformLeadProgressStatus({ ownerUserId: ctx.user.id, statusKey, label: input.label, color: input.color, sortOrder });
          } catch (error) {
            if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "A status with that name already exists." });
            throw error;
          }
        }),
      delete: protectedProcedure
        .input(z.object({ statusKey: z.string().min(1).max(80) }))
        .mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await deletePlatformLeadProgressStatus(ctx.user.id, input.statusKey); return { success: true } as const; }),
    }),
    notes: router({
      list: protectedProcedure.input(z.object({ platformLeadId: z.number().int().positive() })).query(async ({ ctx, input }) => { requireAdmin(ctx.user.role); return listPlatformLeadNotes(ctx.user.id, input.platformLeadId); }),
      add: protectedProcedure.input(z.object({ platformLeadId: z.number().int().positive(), body: z.string().trim().min(1).max(1000) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); const id = await createPlatformLeadNote({ ownerUserId: ctx.user.id, platformLeadId: input.platformLeadId, body: input.body.trim() }); return { id } as const; }),
      summarize: protectedProcedure.input(z.object({ platformLeadId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const notes = await listPlatformLeadNotes(ctx.user.id, input.platformLeadId);
        if (notes.length === 0) return { summary: "No interaction notes have been recorded for this lead yet." } as const;
        const transcript = notes.slice().reverse().map((note) => `[${note.createdAt.toISOString()}] ${note.body}`).join("\n");
        const response = await invokeLLM({
          model: "gpt-5-mini",
          maxTokens: 350,
          messages: [
            { role: "system", content: "Summarize private mortgage-lead interaction notes. State only what the notes support. Do not infer qualifications, credit, consent, permission to text, or outcomes. Use brief chronological bullets covering outreach, stated interest, follow-up commitments, and unresolved items. End with exactly one 'Suggested next best action:' line only when it is directly supported by a documented unresolved item or stated commitment; otherwise say 'Suggested next best action: Review the notes before choosing a follow-up.' Do not claim an action was completed or recommended by the lead when it was not documented." },
            { role: "user", content: `Private interaction history:\n${transcript}` },
          ],
        });
        const content = response.choices[0]?.message.content;
        const summary = typeof content === "string" ? content.trim() : "";
        return { summary: summary || "The interaction history could not be summarized. Review the timestamped notes directly." } as const;
      }),
    }),
    outreachTemplates: router({
      list: protectedProcedure.input(z.object({ audience: z.enum(["lead", "agent"]), includeArchived: z.boolean().optional() })).query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return listPlatformLeadOutreachTemplates(ctx.user.id, input.audience, input.includeArchived ?? false);
      }),
      save: protectedProcedure.input(z.object({ audience: z.enum(["lead", "agent"]), id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(160), subjectTemplate: z.string().trim().min(2).max(300), bodyTemplate: z.string().trim().min(10).max(20000) })).mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const id = await savePlatformLeadOutreachTemplate({ ownerUserId: ctx.user.id, ...input });
        return { id } as const;
      }),
      setArchived: protectedProcedure.input(z.object({ audience: z.enum(["lead", "agent"]), id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await setPlatformLeadOutreachTemplateArchived({ ownerUserId: ctx.user.id, ...input });
        return { archived: input.archived } as const;
      }),
      delete: protectedProcedure.input(z.object({ audience: z.enum(["lead", "agent"]), ids: z.array(z.number().int().positive()).min(1).max(100) })).mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await deletePlatformLeadOutreachTemplates({ ownerUserId: ctx.user.id, ...input });
        return { deleted: input.ids.length } as const;
      }),
    }),
    setProgressStatus: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), progressStatus: z.string().min(1).max(80) }))
      .mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await setPlatformLeadProgressStatus(ctx.user.id, input.id, input.progressStatus); return { success: true } as const; }),
    setArchived: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), archived: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await setPlatformLeadArchived(ctx.user.id, input.id, input.archived);
        return { archived: input.archived } as const;
      }),
    setArchivedBulk: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(500), archived: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await setPlatformLeadsArchived(ctx.user.id, input.ids, input.archived);
        return { affected: input.ids.length, archived: input.archived } as const;
      }),
    permanentDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await deletePlatformLeads(ctx.user.id, input.ids);
        return { affected: input.ids.length } as const;
      }),
  }),

  emailTemplateAi: router({
    prompts: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        requireAdmin(ctx.user.role);
        return listEmailTemplateAiPrompts(ctx.user.id);
      }),
      create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), prompt: z.string().trim().min(4).max(800) })).mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        try {
          return await createEmailTemplateAiPrompt({ ownerUserId: ctx.user.id, ...input });
        } catch (error) {
          if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "A saved prompt with that name already exists." });
          throw error;
        }
      }),
      delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await deleteEmailTemplateAiPrompt({ ownerUserId: ctx.user.id, id: input.id });
        return { success: true } as const;
      }),
    }),
    generate: protectedProcedure
      .input(z.object({
        workflow: z.enum(["listing_agent", "property_list", "property_page_agent", "property_page_buyer", "oregon_outreach", "agent_directory", "loan_officer_directory", "platform_lead", "platform_agent"]),
        goal: z.string().trim().min(4).max(800),
        tone: z.enum(["professional", "friendly", "urgent", "warm", "concise"]).default("professional"),
        personalizationTokens: z.array(z.string().max(100)).max(8).optional(),
        maxWordCount: z.number().int().min(25).max(500).default(250),
        currentSubject: z.string().max(300).optional(),
        currentBody: z.string().max(8000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const allowedTokens: Record<typeof input.workflow, string[]> = {
          listing_agent: [], property_list: [], property_page_agent: [],
          property_page_buyer: ["{{client_name}}", "{{property_address}}", "{{property_url}}", "{{loan_officer_signature}}", "{{agent_signature}}"],
          oregon_outreach: ["{{recipient_name}}", "{{brokerage}}", "{{recipient_type}}", "{{recipient_count}}"],
          agent_directory: ["{{recipient_first_name}}", "{{recipient_name}}", "{{company_name}}", "{{recipient_role}}"],
          loan_officer_directory: ["{{recipient_first_name}}", "{{recipient_name}}", "{{company_name}}", "{{recipient_role}}"],
          platform_lead: ["{{lead_name}}", "{{lead_first_name}}", "{{agent_name}}", "{{agent_first_name}}", "{{loan_officer_name}}", "{{team_context}}"],
          platform_agent: ["{{lead_name}}", "{{lead_first_name}}", "{{agent_name}}", "{{agent_first_name}}", "{{loan_officer_name}}", "{{team_context}}"],
        };
        const requestedTokens = (input.personalizationTokens ?? []).filter((token) => allowedTokens[input.workflow].includes(token));
        const response = await invokeLLM({
          model: "gpt-5-mini",
          maxTokens: 900,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "email_template_draft",
              strict: true,
              schema: {
                type: "object",
                properties: { subject: { type: "string" }, body: { type: "string" } },
                required: ["subject", "body"],
                additionalProperties: false,
              },
            },
          },
          messages: [
            { role: "system", content: `You draft reusable mortgage-industry email templates for an internal owner. Return plain text only through the JSON schema. Write a concise subject and body for workflow ${input.workflow} in a ${input.tone} tone. The body must contain no more than ${input.maxWordCount} words. “Urgent” means clear and time-sensitive, never pressure, fear, false scarcity, or a misleading deadline. The owner must review and edit the proposal before it can be saved. Do not include a sign-off, any loan officer signature, rates, APR, payment quotes, approval or eligibility claims, legal advice, unverified property facts, urgency pressure, or fabricated testimonials. Do not claim consent, acceptance, or an outcome. Use only these merge tokens when useful: ${allowedTokens[input.workflow].join(", ") || "none"}. ${requestedTokens.length ? `Include each requested supported personalization token exactly as written in the body: ${requestedTokens.join(", ")}.` : ""} Never invent any other token.` },
            { role: "user", content: `Email goal: ${input.goal}\n\nSelected tone: ${input.tone}\n\nMaximum body length: ${input.maxWordCount} words\n\nCurrent subject (optional reference): ${input.currentSubject || "None"}\n\nCurrent body (optional reference): ${input.currentBody || "None"}` },
          ],
        });
        const content = response.choices[0]?.message.content;
        let draft: { subject?: unknown; body?: unknown };
        try { draft = JSON.parse(typeof content === "string" ? content : "{}"); } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned an unreadable template draft. Please try again." }); }
        const subject = typeof draft.subject === "string" ? draft.subject.trim().slice(0, 300) : "";
        const rawBody = typeof draft.body === "string" ? draft.body.trim().slice(0, 8000) : "";
        const body = rawBody.split(/\s+/).filter(Boolean).slice(0, input.maxWordCount).join(" ");
        if (!subject || !body) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI could not prepare a complete email draft. Please try again." });
        return { subject, body } as const;
      }),
  }),

  workflowAi: router({
    review: protectedProcedure
      .input(z.object({
        section: z.enum(["campaign-funnel", "platform-leads", "roadmap-leads", "co-marketing-agents", "loan-officers", "texting-workspace", "chat-intakes", "saved-qualifying-listings", "pairing-spend-tracker"]),
        records: z.array(z.object({ label: z.string().max(160), status: z.string().max(80), meta: z.string().max(240) })).max(10),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const response = await invokeLLM({
          model: "gpt-5-mini",
          maxTokens: 600,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "dashboard_workflow_review",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  actions: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" } }, required: ["title", "detail"], additionalProperties: false } },
                },
                required: ["headline", "actions"],
                additionalProperties: false,
              },
            },
          },
          messages: [
            { role: "system", content: "You are an internal mortgage-dashboard workday assistant. Provide 2-5 short operational next actions for the named section using only the supplied private record summaries. Do not give lending, legal, fair-housing, advertising-compliance, credit, or eligibility advice. Do not invent facts, consent, interactions, deadlines, or outcomes. Never instruct the user to send an automated message. Favor reviewing, assigning, documenting, verifying, or using an existing dashboard tool. Keep all instructions compact and actionable." },
            { role: "user", content: `Section: ${input.section}\nCurrent private record summaries (up to 10):\n${JSON.stringify(input.records)}` },
          ],
        });
        const content = response.choices[0]?.message.content;
        let parsed: { headline?: unknown; actions?: unknown } = {};
        try { parsed = JSON.parse(typeof content === "string" ? content : "{}"); } catch { /* safe fallback below */ }
        const review = {
          headline: typeof parsed.headline === "string" ? parsed.headline.slice(0, 220) : "Review the current section queue and complete the next documented action.",
          actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 5).map((action: unknown) => {
            const candidate = action as { title?: unknown; detail?: unknown };
            return { title: typeof candidate.title === "string" ? candidate.title.slice(0, 100) : "Review the record", detail: typeof candidate.detail === "string" ? candidate.detail.slice(0, 360) : "Use the section tools to verify and document the next action." };
          }) : [],
        };
        const saved = await createWorkflowAiReviewHistory({ ownerUserId: ctx.user.id, section: input.section, headline: review.headline, recordsSnapshot: JSON.stringify(input.records), actionsSnapshot: JSON.stringify(review.actions) });
        return { ...review, historyId: saved.id };
      }),
    listHistory: protectedProcedure
      .input(z.object({ section: z.enum(["campaign-funnel", "platform-leads", "roadmap-leads", "co-marketing-agents", "loan-officers", "texting-workspace", "chat-intakes", "saved-qualifying-listings", "pairing-spend-tracker"]).optional(), limit: z.number().int().min(1).max(20).optional() }).optional())
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return listWorkflowAiReviewHistory({ ownerUserId: ctx.user.id, section: input?.section, limit: input?.limit ?? 8 });
      }),
    updateOutcome: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "completed", "deferred"]), feedback: z.enum(["useful", "needs_tuning", "not_useful"]).nullable().optional(), ownerNote: z.string().trim().max(800).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return updateWorkflowAiReviewOutcome({ ...input, ownerUserId: ctx.user.id });
      }),
  }),

  backupManagement: router({
    /** Administrator-only documented backup/restoration event history. */
    list: protectedProcedure
      .input(z.object({ query: z.string().trim().max(180).optional(), startDate: z.coerce.date().optional(), endDate: z.coerce.date().optional(), limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        if (input?.startDate && input.endDate && input.startDate > input.endDate) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "The start date must be on or before the end date." });
        }
        return listBackupHistoryEvents({ ownerUserId: ctx.user.id, query: input?.query, startDate: input?.startDate, endDate: input?.endDate, limit: input?.limit ?? 80 });
      }),
    recordEvent: protectedProcedure
      .input(z.object({ eventType: z.enum(["backup_created", "restore_confirmed"]), label: z.string().trim().min(1).max(180), packageReference: z.string().trim().max(300).nullable().optional(), notes: z.string().trim().max(2000).nullable().optional(), occurredAt: z.coerce.date() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return createBackupHistoryEvent({ ...input, ownerUserId: ctx.user.id });
      }),
  }),

  adIntegrationSettings: router({
    /** Planning-only state. Native ad-platform connection and lead imports remain disabled. */
    moduleVisibility: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAdvertisingIntegrationModuleVisibility(ctx.user.id);
    }),
    setModuleVisibility: protectedProcedure
      .input(z.object({ isVisible: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return saveAdvertisingIntegrationModuleVisibility({ ownerUserId: ctx.user.id, isVisible: input.isVisible });
      }),
    saveChecklist: protectedProcedure
      .input(z.object({
        accountCreated: z.boolean(),
        complianceApproved: z.boolean(),
        formMappingReady: z.boolean(),
        secureKeyApproved: z.boolean(),
        connectionReviewReady: z.boolean(),
        tutorialWatched: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return saveAdvertisingIntegrationChecklist({ ownerUserId: ctx.user.id, checklist: input });
      }),
    remindLater: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      const checklistReminderAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return saveAdvertisingIntegrationChecklistReminder({ ownerUserId: ctx.user.id, checklistReminderAt });
    }),
    resetChecklist: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return resetAdvertisingIntegrationChecklist(ctx.user.id);
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      const settings = await listAdvertisingIntegrationSettings(ctx.user.id);
      return settings.map((setting) => ({
        ...setting,
        apiKeyConfigured: setting.provider === "meta"
          ? Boolean(process.env.META_LEAD_ADS_API_KEY)
          : Boolean(process.env.GOOGLE_ADS_API_KEY),
      }));
    }),
    save: protectedProcedure
      .input(z.object({
        provider: z.enum(["meta", "google_ads"]),
        setupStage: z.enum(["not_started", "details_saved", "compliance_pending", "approved_not_connected"]),
        accountReference: z.string().trim().max(180).nullable().optional(),
        formReference: z.string().trim().max(240).nullable().optional(),
        internalNote: z.string().trim().max(2000).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return saveAdvertisingIntegrationSetting({ ...input, ownerUserId: ctx.user.id });
      }),
  }),

  teamWorkspace: router({
    /** Mike Ford can view every assigned loan-officer workspace and its activation state. */
    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return listTeamLoanOfficerWorkspaces(ctx.user.id);
    }),
    /** An invited loan officer activates access only after signing in with the assigned email. */
    activateMyWorkspace: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user.email) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Your signed-in account needs an email address to activate a team workspace." });
      const id = await activateTeamLoanOfficerWorkspace({ memberUserId: ctx.user.id, memberEmail: ctx.user.email });
      return { id, success: true } as const;
    }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "team_member") return null;
      return getTeamLoanOfficerWorkspaceForMember(ctx.user.id);
    }),
    partnerProfile: protectedProcedure.query(async ({ ctx }) => {
      const workspace = await resolveDashboardWorkspace(ctx.user);
      if (!workspace) throw new TRPCError({ code: "FORBIDDEN", message: "No active team workspace is assigned to this account." });
      const officer = await getLoanOfficerById(workspace.loanOfficerId);
      if (!officer?.agentId) return { officer, agent: null };
      return { officer, agent: await getAgentById(officer.agentId) };
    }),
    createInvite: protectedProcedure
      .input(z.object({ loanOfficerId: z.number().int().positive(), invitedEmail: z.string().trim().toLowerCase().email() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        if (!(await getLoanOfficerById(input.loanOfficerId))) throw new TRPCError({ code: "NOT_FOUND", message: "Select a saved loan-officer profile before assigning dashboard access." });
        try {
          const id = await createTeamLoanOfficerWorkspace({ adminUserId: ctx.user.id, ...input });
          return { id } as const;
        } catch (error) {
          if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "That loan-officer profile already has a team workspace assignment." });
          throw error;
        }
      }),
    setStatus: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "active", "suspended"]) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return updateTeamLoanOfficerWorkspaceStatus({ adminUserId: ctx.user.id, ...input });
      }),
    prepare: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), prepareTemplateLibrary: z.boolean(), prepareGeoSphere: z.boolean(), prepareOregonAgents: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await prepareTeamLoanOfficerWorkspace({ adminUserId: ctx.user.id, ...input });
        return { success: true } as const;
      }),
    releaseHandoff: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), handoffNote: z.string().trim().max(1200).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await releaseTeamLoanOfficerWorkspaceHandoff({ adminUserId: ctx.user.id, ...input });
        return { success: true } as const;
      }),
    shadow: protectedProcedure
      .input(z.object({ memberUserId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const workspace = await getTeamLoanOfficerWorkspaceForAdminMember({ adminUserId: ctx.user.id, memberUserId: input.memberUserId });
        if (!workspace) throw new TRPCError({ code: "NOT_FOUND", message: "That active team workspace was not found." });
        return workspace;
      }),
    shadowSnapshot: protectedProcedure
      .input(z.object({ memberUserId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const workspace = await getTeamLoanOfficerWorkspaceForAdminMember({ adminUserId: ctx.user.id, memberUserId: input.memberUserId });
        if (!workspace) throw new TRPCError({ code: "NOT_FOUND", message: "That active team workspace was not found." });
        const [roadmapLeads, chatIntakes, platformLeads, quotes, spendEntries] = await Promise.all([
          listLeads({ loanOfficerId: workspace.loanOfficerId }),
          listChatIntakeLeads({ loanOfficerId: workspace.loanOfficerId }),
          listPlatformLeads(input.memberUserId),
          listMortgagePaymentQuotes(input.memberUserId),
          listCampaignSpendEntries(input.memberUserId),
        ]);
        return { workspace, roadmapLeads, chatIntakes, platformLeads, quotes, spendEntries };
      }),
    performance: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return getAdminTeamPerformance(ctx.user.id);
    }),
    activityFeed: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return getAdminTeamActivityFeed({ adminUserId: ctx.user.id, limit: input?.limit ?? 24 });
      }),
  }),

  teamTemplates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") return listTeamTemplateLibrary({ adminUserId: ctx.user.id, includePrivate: true });
      if (ctx.user.role !== "team_member") throw new TRPCError({ code: "FORBIDDEN", message: "Team template access has not been assigned to this account." });
      const workspace = await getTeamLoanOfficerWorkspaceForMember(ctx.user.id);
      if (!workspace) throw new TRPCError({ code: "FORBIDDEN", message: "Your team workspace is not active." });
      return listTeamTemplateLibrary({ adminUserId: workspace.adminUserId, includePrivate: false });
    }),
    create: protectedProcedure
      .input(z.object({ channel: z.enum(["email", "text"]), name: z.string().trim().min(1).max(160), subjectTemplate: z.string().trim().max(300).nullable().optional(), bodyTemplate: z.string().trim().min(1).max(6000), availability: z.enum(["private", "team_read_only"]), sourceTemplateScope: z.string().trim().max(80).nullable().optional(), sourceTemplateId: z.number().int().positive().nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        try {
          const id = await createTeamTemplateLibraryEntry({ adminUserId: ctx.user.id, ...input });
          return { id } as const;
        } catch (error) {
          if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "A team library item already uses that name and channel." });
          throw error;
        }
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(160), subjectTemplate: z.string().trim().max(300).nullable().optional(), bodyTemplate: z.string().trim().min(1).max(6000), availability: z.enum(["private", "team_read_only"]) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        await updateTeamTemplateLibraryEntry({ adminUserId: ctx.user.id, ...input });
        return { success: true } as const;
      }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await deleteTeamTemplateLibraryEntry({ adminUserId: ctx.user.id, id: input.id });
      return { success: true } as const;
    }),
    submissions: protectedProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role === "admin") return listTeamTemplateSubmissionsForAdmin({ adminUserId: ctx.user.id, status: input?.status });
        const workspace = await resolveDashboardWorkspace(ctx.user);
        if (!workspace) throw new TRPCError({ code: "FORBIDDEN", message: "Your team workspace is not active." });
        return listTeamTemplateSubmissionsForMember(ctx.user.id);
      }),
    submit: protectedProcedure
      .input(z.object({ channel: z.enum(["email", "text"]), name: z.string().trim().min(1).max(160), subjectTemplate: z.string().trim().max(300).nullable().optional(), bodyTemplate: z.string().trim().min(1).max(6000) }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await resolveDashboardWorkspace(ctx.user);
        if (!workspace) throw new TRPCError({ code: "FORBIDDEN", message: "Your team workspace is not active." });
        const id = await createTeamTemplateSubmission({ adminUserId: workspace.adminUserId, memberUserId: ctx.user.id, loanOfficerId: workspace.loanOfficerId, ...input });
        return { id } as const;
      }),
    reviewSubmission: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reviewerNote: z.string().trim().max(1200).nullable().optional(), availability: z.enum(["private", "team_read_only"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const submissions = await listTeamTemplateSubmissionsForAdmin({ adminUserId: ctx.user.id });
        const submission = submissions.find((item) => item.id === input.id);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Template submission was not found." });
        let approvedLibraryTemplateId: number | null = null;
        if (input.decision === "approved") {
          try {
            approvedLibraryTemplateId = await createTeamTemplateLibraryEntry({ adminUserId: ctx.user.id, channel: submission.channel, name: submission.name, subjectTemplate: submission.subjectTemplate, bodyTemplate: submission.bodyTemplate, availability: input.availability ?? "team_read_only", sourceTemplateScope: "team_submission", sourceTemplateId: submission.id });
          } catch (error) {
            if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "A team library item already uses this name and channel. Rename or reject this submission." });
            throw error;
          }
        }
        await reviewTeamTemplateSubmission({ adminUserId: ctx.user.id, id: input.id, status: input.decision, reviewerNote: input.reviewerNote, approvedLibraryTemplateId });
        return { success: true, approvedLibraryTemplateId } as const;
      }),
  }),

  agentSync: router({
    /** Admin-only, owner-scoped copy of the authorized state source records. */
    list: protectedProcedure
      .input(z.object({ state: z.literal("Oregon").optional() }).optional())
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return listSyncedTopAgents(ctx.user.id, input?.state ?? "Oregon");
      }),
    outreachTemplates: protectedProcedure.input(z.object({ includeArchived: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      return listSyncedAgentOutreachTemplates(ctx.user.id, input?.includeArchived ?? false);
    }),
    createOutreachTemplate: protectedProcedure
      .input(syncedAgentOutreachTemplateInputSchema)
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        try {
          const template = await createSyncedAgentOutreachTemplate({ ownerUserId: ctx.user.id, ...input });
          await recordEmailTemplateVersion({ templateScope: "oregon_outreach", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, subjectTemplate: template.subjectTemplate, bodyTemplate: template.bodyTemplate });
          return template;
        } catch (error) {
          if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
            throw new TRPCError({ code: "CONFLICT", message: "A saved Oregon outreach template already has that name." });
          }
          throw error;
        }
      }),
    updateOutreachTemplate: protectedProcedure.input(syncedAgentOutreachTemplateInputSchema.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); const { id, ...values } = input; const template = await updateSyncedAgentOutreachTemplate({ ownerUserId: ctx.user.id, id, ...values }); await recordEmailTemplateVersion({ templateScope: "oregon_outreach", templateId: template.id, ownerUserId: ctx.user.id, name: template.name, subjectTemplate: template.subjectTemplate, bodyTemplate: template.bodyTemplate }); return template; }),
    setOutreachTemplateArchived: protectedProcedure.input(z.object({ id: z.number().int().positive(), archived: z.boolean() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await setSyncedAgentOutreachTemplateArchived({ ownerUserId: ctx.user.id, ...input }); return { archived: input.archived }; }),
    deleteOutreachTemplate: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user.role); await deleteSyncedAgentOutreachTemplate({ ownerUserId: ctx.user.id, id: input.id }); return { deleted: true }; }),
    buildOutreachDraft: protectedProcedure
      .input(z.object({
        syncedProfileIds: z.array(z.number().int().positive()).min(1, "Select at least one Oregon profile."),
        templateId: z.number().int().positive().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const requestedIds = Array.from(new Set(input.syncedProfileIds));
        const profiles = await listSyncedTopAgents(ctx.user.id, "Oregon");
        const selected = profiles.filter((profile) => requestedIds.includes(profile.id));
        if (selected.length !== requestedIds.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "One or more selected Oregon profiles are no longer available." });
        }
        const template = input.templateId
          ? (await listSyncedAgentOutreachTemplates(ctx.user.id)).find((item) => item.id === input.templateId)
          : null;
        if (input.templateId && !template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "That Oregon outreach template is unavailable." });
        }
        const missingEmailProfiles = selected.filter((profile) => !profile.email?.trim());
        const draft = buildSyncedAgentOutreachDraft({
          recipients: selected
            .filter((profile) => profile.email?.trim())
            .map((profile) => {
              let detail: Record<string, unknown> = {};
              try { detail = JSON.parse(profile.profileData) as Record<string, unknown>; } catch { /* source detail stays optional */ }
              return {
                fullName: profile.fullName,
                email: profile.email!,
                brokerage: profile.brokerage,
                recordType: detail.recordType === "principal_broker" ? "principal_broker" as const : "agent" as const,
                principalBrokerTitle: typeof detail.principalBrokerTitle === "string" ? detail.principalBrokerTitle : null,
              };
            }),
          template,
        });
        return { ...draft, selectedCount: selected.length, skippedNoEmailCount: missingEmailProfiles.length };
      }),
    rankHistory: protectedProcedure
      .input(z.object({ syncedTopAgentId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return listSyncedTopAgentRankHistory(ctx.user.id, input.syncedTopAgentId);
      }),
    reviewQueue: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return listSyncedTopAgentReviews(ctx.user.id);
    }),
    resolveReview: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const result = await resolveSyncedTopAgentReview(ctx.user.id, input.id, input.decision);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "This source update is no longer awaiting review." });
        return result;
      }),
    /** Admin-only live pull from the read-only Oregon directory export endpoint. */
    syncOregon: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return refreshOregonTopAgentsForOwner(ctx.user.id);
    }),
    /** Versioned refresh path used by the current dashboard bundle after production endpoint repair. */
    syncOregonRefresh: protectedProcedure.mutation(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return refreshOregonTopAgentsForOwner(ctx.user.id);
    }),
  }),
});

/** Human-readable one-liner(s) about the calculators a lead used, or null. */
function summarizeLeadScenario(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      buydown?: { purchasePrice: number; downPayment: number; noteRate: number; year1MonthlySavings?: number; year2MonthlySavings?: number; totalSubsidy?: number };
      costOfWaiting?: { purchasePrice: number; monthlyRent: number; waitYears: number; costOfWaiting?: number };
      purchasePrice?: number; // legacy bare-buydown shape
      downPayment?: number;
      noteRate?: number;
      year1MonthlySavings?: number;
      year2MonthlySavings?: number;
      totalSubsidy?: number;
    };
    const lines: string[] = [];
    const bd = parsed.buydown ?? (parsed.purchasePrice !== undefined ? parsed : undefined);
    if (bd && bd.purchasePrice !== undefined) {
      const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;
      const savings = [
        typeof bd.year1MonthlySavings === "number" ? `Year 1 monthly savings: ${money(bd.year1MonthlySavings)}` : null,
        typeof bd.year2MonthlySavings === "number" ? `Year 2 monthly savings: ${money(bd.year2MonthlySavings)}` : null,
        typeof bd.totalSubsidy === "number"
          ? `Total seller-paid buydown interest subsidy: ${money(bd.totalSubsidy)} (${((bd.totalSubsidy / Math.max(bd.purchasePrice, 1)) * 100).toFixed(2)}% of sales price)`
          : null,
      ].filter((detail): detail is string => detail !== null);
      lines.push(`- 2-1 buydown scenario: ${money(bd.purchasePrice)} purchase, ${money(bd.downPayment ?? 0)} down, ${bd.noteRate}% note rate${savings.length ? `\n  - ${savings.join("\n  - ")}` : ""}`);
    }
    if (parsed.costOfWaiting) {
      const c = parsed.costOfWaiting;
      const result = typeof c.costOfWaiting === "number"
        ? `, resulting in $${Math.round(c.costOfWaiting).toLocaleString("en-US")} cost of waiting.`
        : ".";
      lines.push(`- Rent vs. buy scenario: $${Math.round(c.purchasePrice).toLocaleString("en-US")} home vs $${Math.round(c.monthlyRent).toLocaleString("en-US")}/mo rent, ${c.waitYears} yr(s) of waiting compared${result}`);
    }
    return lines.length > 0 ? lines.join("\n") : null;
  } catch {
    return null;
  }
}

/** Contact-first automatic notification that shares the exact calculator detail used in referral drafts. */
export function buildRoadmapNotificationContent({
  firstName,
  phone,
  email,
  agentName,
  scenario,
}: {
  firstName: string;
  phone: string | null | undefined;
  email: string;
  agentName?: string;
  scenario: string | null;
}) {
  const scenarioSummary = summarizeLeadScenario(scenario);
  return [
    `Lead name: ${firstName}`,
    `Lead phone: ${phone || "Not provided"}`,
    `Lead email: ${email}`,
    "",
    "New Roadmap lead",
    `${firstName} just requested the First-Time Homebuyer Roadmap via the landing page.${agentName ? ` This lead came in through ${agentName}'s co-branded page.` : ""}`,
    "",
    "What they explored on the site:",
    scenarioSummary ?? "- No calculator scenario was completed.",
    "",
    "Follow up with the Roadmap email and your nurture sequence.",
  ].join("\n");
}

/** Prefilled mailto: link so the owner can send manually when email isn't configured. */
function buildMailtoFallback(
  agentEmail: string,
  lead: { firstName: string; email: string; phone: string; source: string; createdAt: Date },
  agentName: string,
  scenarioSummary: string | null
) {
  const { subject, text } = buildReferralEmail({
    agentName,
    agentEmail,
    leadFirstName: lead.firstName,
    leadEmail: lead.email,
    leadPhone: lead.phone,
    leadSource: lead.source,
    submittedAt: lead.createdAt,
    scenarioSummary,
    ownerName: "Mike Ford",
  });
  return `mailto:${agentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

export type AppRouter = typeof appRouter;
