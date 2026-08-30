import { and, asc, desc, eq, getTableColumns, gte, inArray, isNotNull, isNull, like, lte, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  agentProfile,
  chatIntakeLead,
  chatTranscript,
  geosphereListing,
  geosphereSavedPull,
  geosphereSyncSetting,
  listingAgentEmailTemplate,
  propertyLandingPage,
  propertyPageActivity,
  propertyEngagementSetting,
  programContributionLimit,
  propertyEmailTemplate,
  propertyPageAgentEmailTemplate,
  propertyPageBuyerEmailTemplate,
  directoryOutreachEmailTemplate,
  directoryOutreachDraft,
  directoryFilterPreset,
  platformLead,
  platformLeadNote,
  platformLeadProgressStatus,
  platformLeadOutreachTemplate,
  emailTemplateAiPrompt,
  emailTemplateUsage,
  emailTemplateVersion,
  syncedAgentOutreachTemplate,
  campaignSpendEntry,
  loAgentSpendEntry,
  loAgentSpendPairing,
  mortgagePaymentQuote,
  backupHistoryEvent,
  advertisingIntegrationSetting,
  advertisingIntegrationModuleSetting,
  workflowAiReviewHistory,
  dashboardLayoutPreference,
  teamLoanOfficerWorkspace,
  teamTemplateLibrary,
  teamTemplateSubmission,
  leads,
  loanOfficer,
  syncedTopAgent,
  syncedTopAgentRankSnapshot,
  syncedTopAgentReview,
  textMessage,
  textMessageAttachment,
  textMessageRecipient,
  textChainAttachment,
  textChainEvent,
  users,
  type InsertAgentProfile,
  type InsertChatIntakeLead,
  type InsertLoanOfficer,
  type InsertLead,
  type InsertPlatformLead,
  type InsertGeoSphereListing,
  type InsertSyncedTopAgent,
} from "../drizzle/schema";
import { buildPropertyLandingSnapshot, parsePropertyLandingSnapshot, slugifyPropertyAddress } from "../shared/propertyLandingPage";
import {
  DEFAULT_PROGRAM_CONTRIBUTION_LIMIT_BPS,
  PROGRAM_CONTRIBUTION_LIMIT_KEYS,
  normalizeProgramContributionLimitValues,
  type ProgramContributionLimitValues,
} from "../shared/programContributionLimits";
import { ENV } from "./_core/env";
import { shouldApplyTwilioDeliveryStatus } from "./twilio";

export const EMAIL_TEMPLATE_USAGE_SCOPES = ["listing_agent", "property_list", "property_page_agent", "property_page_buyer", "oregon_outreach", "agent_directory", "loan_officer_directory"] as const;
export type EmailTemplateUsageScope = (typeof EMAIL_TEMPLATE_USAGE_SCOPES)[number];
export type EmailTemplateVersionScope = EmailTemplateUsageScope;

export type PlatformLeadStatus = "test" | "new" | "archived";
export const PLATFORM_LEAD_STATUS_COLORS = ["slate", "blue", "amber", "violet", "emerald", "rose"] as const;
export type PlatformLeadStatusColor = (typeof PLATFORM_LEAD_STATUS_COLORS)[number];
const DEFAULT_PLATFORM_LEAD_PROGRESS_STATUSES = [
  { statusKey: "new", label: "New", color: "slate" as const, sortOrder: 0 },
  { statusKey: "contacted", label: "Contacted", color: "blue" as const, sortOrder: 1 },
  { statusKey: "qualified", label: "Qualified", color: "emerald" as const, sortOrder: 2 },
];

export type PlatformLeadInput = Omit<InsertPlatformLead, "id" | "receivedAt" | "createdAt">;

/** Resolves the authenticated dashboard owner's stable private record for inbound provider leads. */
export async function getDashboardOwnerUserId() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.openId, ENV.ownerOpenId)).limit(1);
  const owner = rows[0];
  if (!owner) throw new Error("The dashboard owner must sign in before native platform lead capture can be activated.");
  return owner.id;
}

/**
 * Writes an incoming native platform lead once. Provider retries safely return
 * the existing record because every provider/external lead ID pair is unique.
 */
export async function createPlatformLeadIfAbsent(input: PlatformLeadInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select({ id: platformLead.id, status: platformLead.status })
    .from(platformLead)
    .where(and(eq(platformLead.provider, input.provider), eq(platformLead.externalLeadId, input.externalLeadId)))
    .limit(1);
  if (existing[0]) return { id: existing[0].id, status: existing[0].status, created: false } as const;
  try {
    const result = await db.insert(platformLead).values(input);
    return { id: Number(result[0].insertId), status: input.status, created: true } as const;
  } catch (error) {
    const duplicate = await db
      .select({ id: platformLead.id, status: platformLead.status })
      .from(platformLead)
      .where(and(eq(platformLead.provider, input.provider), eq(platformLead.externalLeadId, input.externalLeadId)))
      .limit(1);
    if (duplicate[0]) return { id: duplicate[0].id, status: duplicate[0].status, created: false } as const;
    throw error;
  }
}

export async function listPlatformLeads(ownerUserId: number, status?: PlatformLeadStatus) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(platformLead.ownerUserId, ownerUserId)];
  if (status) conditions.push(eq(platformLead.status, status));
  return db.select().from(platformLead).where(and(...conditions)).orderBy(desc(platformLead.receivedAt));
}

export async function ensurePlatformLeadProgressStatuses(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(platformLeadProgressStatus).where(eq(platformLeadProgressStatus.ownerUserId, ownerUserId));
  const existingKeys = new Set(existing.map((status) => status.statusKey));
  const missing = DEFAULT_PLATFORM_LEAD_PROGRESS_STATUSES.filter((status) => !existingKeys.has(status.statusKey));
  if (missing.length) await db.insert(platformLeadProgressStatus).values(missing.map((status) => ({ ownerUserId, ...status })));
  return db.select().from(platformLeadProgressStatus).where(eq(platformLeadProgressStatus.ownerUserId, ownerUserId)).orderBy(asc(platformLeadProgressStatus.sortOrder), asc(platformLeadProgressStatus.label));
}

export async function createPlatformLeadProgressStatus(input: { ownerUserId: number; statusKey: string; label: string; color: PlatformLeadStatusColor; sortOrder: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(platformLeadProgressStatus).values(input);
  const rows = await db.select().from(platformLeadProgressStatus).where(and(eq(platformLeadProgressStatus.ownerUserId, input.ownerUserId), eq(platformLeadProgressStatus.statusKey, input.statusKey))).limit(1);
  return rows[0];
}

export async function deletePlatformLeadProgressStatus(ownerUserId: number, statusKey: string) {
  if (["new", "contacted", "qualified"].includes(statusKey)) throw new Error("Default progress statuses cannot be permanently removed.");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(platformLead).set({ progressStatus: "new" }).where(and(eq(platformLead.ownerUserId, ownerUserId), eq(platformLead.progressStatus, statusKey)));
  await db.delete(platformLeadProgressStatus).where(and(eq(platformLeadProgressStatus.ownerUserId, ownerUserId), eq(platformLeadProgressStatus.statusKey, statusKey)));
}

export async function listPlatformLeadNotes(ownerUserId: number, platformLeadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(platformLeadNote).where(and(eq(platformLeadNote.ownerUserId, ownerUserId), eq(platformLeadNote.platformLeadId, platformLeadId))).orderBy(desc(platformLeadNote.createdAt), desc(platformLeadNote.id));
}

export async function createPlatformLeadNote(input: { ownerUserId: number; platformLeadId: number; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(platformLeadNote).values(input);
  return Number(result[0].insertId);
}

export async function setPlatformLeadProgressStatus(ownerUserId: number, id: number, progressStatus: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const available = await db.select({ statusKey: platformLeadProgressStatus.statusKey }).from(platformLeadProgressStatus).where(and(eq(platformLeadProgressStatus.ownerUserId, ownerUserId), eq(platformLeadProgressStatus.statusKey, progressStatus))).limit(1);
  if (!available[0]) throw new Error("The selected progress status is not available.");
  await db.update(platformLead).set({ progressStatus }).where(and(eq(platformLead.id, id), eq(platformLead.ownerUserId, ownerUserId)));
}

export async function setPlatformLeadArchived(ownerUserId: number, id: number, archived: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(platformLead)
    .set({ status: archived ? "archived" : "new" })
    .where(and(eq(platformLead.id, id), eq(platformLead.ownerUserId, ownerUserId)));
}

export async function setPlatformLeadsArchived(ownerUserId: number, ids: number[], archived: boolean) {
  if (ids.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(platformLead)
    .set({ status: archived ? "archived" : "new" })
    .where(and(eq(platformLead.ownerUserId, ownerUserId), inArray(platformLead.id, ids)));
}

export async function updatePlatformLeadDetails(input: {
  ownerUserId: number;
  id: number;
  fullName: string;
  email: string;
  phone: string;
  leadSource: "facebook" | "google_ads" | "organic";
  externalFormId: string | null;
  externalCampaignId: string | null;
  followUpAt: Date | null;
  followUpChannel: "phone" | "text" | "email" | "listings" | "agent_connection" | "roadmap" | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const names = input.fullName.trim().split(/\s+/);
  await db
    .update(platformLead)
    .set({
      fullName: input.fullName.trim(),
      firstName: names[0] ?? "",
      lastName: names.slice(1).join(" "),
      email: input.email.trim(),
      phone: input.phone.trim(),
      leadSource: input.leadSource,
      externalFormId: input.externalFormId,
      externalCampaignId: input.externalCampaignId,
      followUpAt: input.followUpAt,
      followUpChannel: input.followUpChannel,
      followUpCompletedAt: null,
    })
    .where(and(eq(platformLead.id, input.id), eq(platformLead.ownerUserId, input.ownerUserId)));
}

export async function deletePlatformLeads(ownerUserId: number, ids: number[]) {
  if (ids.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(platformLead).where(and(eq(platformLead.ownerUserId, ownerUserId), inArray(platformLead.id, ids)));
}

export async function updatePlatformLeadAssignments(input: { ownerUserId: number; id: number; assignedLoanOfficerId: number | null; assignedAgentId: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(platformLead)
    .set({ assignedLoanOfficerId: input.assignedLoanOfficerId, assignedAgentId: input.assignedAgentId })
    .where(and(eq(platformLead.id, input.id), eq(platformLead.ownerUserId, input.ownerUserId)));
}

export async function listPlatformLeadOutreachTemplates(ownerUserId: number, audience: "lead" | "agent", includeArchived = false) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const conditions = [eq(platformLeadOutreachTemplate.ownerUserId, ownerUserId), eq(platformLeadOutreachTemplate.audience, audience)];
  if (!includeArchived) conditions.push(isNull(platformLeadOutreachTemplate.archivedAt));
  return db.select().from(platformLeadOutreachTemplate).where(and(...conditions)).orderBy(asc(platformLeadOutreachTemplate.name));
}

export async function savePlatformLeadOutreachTemplate(input: { ownerUserId: number; audience: "lead" | "agent"; id?: number; name: string; subjectTemplate: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.id) {
    await db.update(platformLeadOutreachTemplate).set({ name: input.name, subjectTemplate: input.subjectTemplate, bodyTemplate: input.bodyTemplate, archivedAt: null }).where(and(eq(platformLeadOutreachTemplate.id, input.id), eq(platformLeadOutreachTemplate.ownerUserId, input.ownerUserId), eq(platformLeadOutreachTemplate.audience, input.audience)));
    return input.id;
  }
  const result = await db.insert(platformLeadOutreachTemplate).values({ ownerUserId: input.ownerUserId, audience: input.audience, name: input.name, subjectTemplate: input.subjectTemplate, bodyTemplate: input.bodyTemplate });
  return Number(result[0].insertId);
}

export async function setPlatformLeadOutreachTemplateArchived(input: { ownerUserId: number; audience: "lead" | "agent"; id: number; archived: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(platformLeadOutreachTemplate).set({ archivedAt: input.archived ? new Date() : null }).where(and(eq(platformLeadOutreachTemplate.id, input.id), eq(platformLeadOutreachTemplate.ownerUserId, input.ownerUserId), eq(platformLeadOutreachTemplate.audience, input.audience)));
}

export async function deletePlatformLeadOutreachTemplates(input: { ownerUserId: number; audience: "lead" | "agent"; ids: number[] }) {
  if (!input.ids.length) return;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(platformLeadOutreachTemplate).where(and(eq(platformLeadOutreachTemplate.ownerUserId, input.ownerUserId), eq(platformLeadOutreachTemplate.audience, input.audience), inArray(platformLeadOutreachTemplate.id, input.ids)));
}

/** Private saved prompts for the owner's AI-assisted template drafting workflow. */
export async function listEmailTemplateAiPrompts(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(emailTemplateAiPrompt).where(eq(emailTemplateAiPrompt.ownerUserId, ownerUserId)).orderBy(asc(emailTemplateAiPrompt.name));
}

export async function createEmailTemplateAiPrompt(input: { ownerUserId: number; name: string; prompt: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(emailTemplateAiPrompt).values(input);
  const rows = await db.select().from(emailTemplateAiPrompt).where(and(eq(emailTemplateAiPrompt.id, Number(result.insertId)), eq(emailTemplateAiPrompt.ownerUserId, input.ownerUserId))).limit(1);
  return rows[0]!;
}

export async function deleteEmailTemplateAiPrompt(input: { ownerUserId: number; id: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(emailTemplateAiPrompt).where(and(eq(emailTemplateAiPrompt.id, input.id), eq(emailTemplateAiPrompt.ownerUserId, input.ownerUserId)));
}

let _db: ReturnType<typeof drizzle> | null = null;

/** Records a draft-opening event without retaining recipient addresses or message contents. */
export async function recordEmailTemplateUsage(input: { templateScope: EmailTemplateUsageScope; templateId: number; ownerUserId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(emailTemplateUsage).values({
    templateScope: input.templateScope,
    templateId: input.templateId,
    ownerUserId: input.ownerUserId ?? null,
  });
}

export async function getEmailTemplateUsageCounts(input: { templateScope: EmailTemplateUsageScope; ownerUserId?: number | null }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(emailTemplateUsage.templateScope, input.templateScope)];
  if (input.ownerUserId !== undefined) {
    conditions.push(input.ownerUserId === null ? isNull(emailTemplateUsage.ownerUserId) : eq(emailTemplateUsage.ownerUserId, input.ownerUserId));
  }
  const rows = await db
    .select({ templateId: emailTemplateUsage.templateId, usageCount: sql<number>`count(*)` })
    .from(emailTemplateUsage)
    .where(and(...conditions))
    .groupBy(emailTemplateUsage.templateId);
  return rows.map((row) => ({ templateId: row.templateId, usageCount: Number(row.usageCount) }));
}

/** Creates a complete immutable snapshot after a custom template is created, edited, or restored. */
export async function recordEmailTemplateVersion(input: {
  templateScope: EmailTemplateVersionScope;
  templateId: number;
  ownerUserId: number;
  name: string;
  subjectTemplate?: string | null;
  bodyTemplate: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ versionNumber: emailTemplateVersion.versionNumber })
    .from(emailTemplateVersion)
    .where(and(eq(emailTemplateVersion.templateScope, input.templateScope), eq(emailTemplateVersion.templateId, input.templateId), eq(emailTemplateVersion.ownerUserId, input.ownerUserId)))
    .orderBy(desc(emailTemplateVersion.versionNumber))
    .limit(1);
  const versionNumber = (rows[0]?.versionNumber ?? 0) + 1;
  await db.insert(emailTemplateVersion).values({ ...input, subjectTemplate: input.subjectTemplate ?? null, versionNumber });
  return versionNumber;
}

export async function listEmailTemplateVersions(input: { templateScope: EmailTemplateVersionScope; templateId: number; ownerUserId: number }) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(emailTemplateVersion)
    .where(and(eq(emailTemplateVersion.templateScope, input.templateScope), eq(emailTemplateVersion.templateId, input.templateId), eq(emailTemplateVersion.ownerUserId, input.ownerUserId)))
    .orderBy(desc(emailTemplateVersion.versionNumber));
}

export async function getEmailTemplateVersion(input: { id: number; ownerUserId: number }) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(emailTemplateVersion).where(and(eq(emailTemplateVersion.id, input.id), eq(emailTemplateVersion.ownerUserId, input.ownerUserId))).limit(1);
  return rows[0];
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  return result[0];
}

export async function setUserDashboardRole(userId: number, role: "user" | "team_member") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// Owner-controlled team loan-officer workspaces

export async function listTeamLoanOfficerWorkspaces(adminUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select({
      ...getTableColumns(teamLoanOfficerWorkspace),
      loanOfficerName: loanOfficer.name,
      loanOfficerEmail: loanOfficer.email,
      loanOfficerSlug: loanOfficer.slug,
      memberName: users.name,
      memberEmail: users.email,
    })
    .from(teamLoanOfficerWorkspace)
    .innerJoin(loanOfficer, eq(teamLoanOfficerWorkspace.loanOfficerId, loanOfficer.id))
    .leftJoin(users, eq(teamLoanOfficerWorkspace.memberUserId, users.id))
    .where(eq(teamLoanOfficerWorkspace.adminUserId, adminUserId))
    .orderBy(asc(loanOfficer.name));
}

export async function createTeamLoanOfficerWorkspace(input: { adminUserId: number; loanOfficerId: number; invitedEmail: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const invitedEmail = input.invitedEmail.trim().toLowerCase();
  const existingUser = await getUserByEmail(invitedEmail);
  const result = await db.insert(teamLoanOfficerWorkspace).values({
    adminUserId: input.adminUserId,
    loanOfficerId: input.loanOfficerId,
    invitedEmail,
    memberUserId: existingUser?.id ?? null,
    status: "pending",
  });
  return Number(result[0].insertId);
}

export async function activateTeamLoanOfficerWorkspace(input: { memberUserId: number; memberEmail: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const email = input.memberEmail.trim().toLowerCase();
  const rows = await db.select().from(teamLoanOfficerWorkspace).where(eq(teamLoanOfficerWorkspace.invitedEmail, email)).orderBy(desc(teamLoanOfficerWorkspace.updatedAt)).limit(1);
  const workspace = rows[0];
  if (!workspace) throw new Error("No team dashboard invitation matches this signed-in email.");
  if (workspace.status === "suspended") throw new Error("This team dashboard access has been suspended by the administrator.");
  if (workspace.setupStatus !== "handed_off") throw new Error("Mike Ford has not released this prepared dashboard workspace for handoff yet.");
  await db.update(teamLoanOfficerWorkspace).set({ memberUserId: input.memberUserId, status: "active" }).where(eq(teamLoanOfficerWorkspace.id, workspace.id));
  await setUserDashboardRole(input.memberUserId, "team_member");
  return workspace.id;
}

export async function updateTeamLoanOfficerWorkspaceStatus(input: { adminUserId: number; id: number; status: "pending" | "active" | "suspended" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(teamLoanOfficerWorkspace).where(and(eq(teamLoanOfficerWorkspace.id, input.id), eq(teamLoanOfficerWorkspace.adminUserId, input.adminUserId))).limit(1);
  const workspace = rows[0];
  if (!workspace) throw new Error("Team workspace was not found.");
  if (input.status === "active" && workspace.setupStatus !== "handed_off") throw new Error("Prepare and release this dashboard workspace before allowing downstream access.");
  await db.update(teamLoanOfficerWorkspace).set({ status: input.status }).where(eq(teamLoanOfficerWorkspace.id, workspace.id));
  if (workspace.memberUserId) await setUserDashboardRole(workspace.memberUserId, input.status === "active" ? "team_member" : "user");
  return { ...workspace, status: input.status };
}

export async function prepareTeamLoanOfficerWorkspace(input: { adminUserId: number; id: number; prepareTemplateLibrary: boolean; prepareGeoSphere: boolean; prepareOregonAgents: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(teamLoanOfficerWorkspace).where(and(eq(teamLoanOfficerWorkspace.id, input.id), eq(teamLoanOfficerWorkspace.adminUserId, input.adminUserId))).limit(1);
  const workspace = rows[0];
  if (!workspace) throw new Error("Team workspace was not found.");
  if (workspace.status === "active") throw new Error("Suspend the active workspace before changing its pre-handoff setup.");
  const now = new Date();
  await db.update(teamLoanOfficerWorkspace).set({
    setupStatus: "prepared",
    templateLibraryPreparedAt: input.prepareTemplateLibrary ? now : workspace.templateLibraryPreparedAt,
    geospherePreparedAt: input.prepareGeoSphere ? now : workspace.geospherePreparedAt,
    oregonAgentPreparedAt: input.prepareOregonAgents ? now : workspace.oregonAgentPreparedAt,
  }).where(eq(teamLoanOfficerWorkspace.id, workspace.id));
}

export async function releaseTeamLoanOfficerWorkspaceHandoff(input: { adminUserId: number; id: number; handoffNote?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(teamLoanOfficerWorkspace).where(and(eq(teamLoanOfficerWorkspace.id, input.id), eq(teamLoanOfficerWorkspace.adminUserId, input.adminUserId))).limit(1);
  const workspace = rows[0];
  if (!workspace) throw new Error("Team workspace was not found.");
  if (workspace.status === "active") throw new Error("This workspace is already active. Suspend it before preparing a new handoff.");
  if (workspace.setupStatus !== "prepared") throw new Error("Mark the workspace preparation complete before releasing handoff.");
  await db.update(teamLoanOfficerWorkspace).set({ setupStatus: "handed_off", handoffReleasedAt: new Date(), handoffNote: input.handoffNote ?? null }).where(eq(teamLoanOfficerWorkspace.id, workspace.id));
}

export async function getTeamLoanOfficerWorkspaceForMember(memberUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ ...getTableColumns(teamLoanOfficerWorkspace), loanOfficerName: loanOfficer.name, loanOfficerSlug: loanOfficer.slug })
    .from(teamLoanOfficerWorkspace)
    .innerJoin(loanOfficer, eq(teamLoanOfficerWorkspace.loanOfficerId, loanOfficer.id))
    .where(and(eq(teamLoanOfficerWorkspace.memberUserId, memberUserId), eq(teamLoanOfficerWorkspace.status, "active")))
    .limit(1);
  return rows[0];
}

export async function getTeamLoanOfficerWorkspaceForAdminMember(input: { adminUserId: number; memberUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ ...getTableColumns(teamLoanOfficerWorkspace), loanOfficerName: loanOfficer.name, loanOfficerSlug: loanOfficer.slug, member: users })
    .from(teamLoanOfficerWorkspace)
    .innerJoin(loanOfficer, eq(teamLoanOfficerWorkspace.loanOfficerId, loanOfficer.id))
    .innerJoin(users, eq(teamLoanOfficerWorkspace.memberUserId, users.id))
    .where(and(eq(teamLoanOfficerWorkspace.adminUserId, input.adminUserId), eq(teamLoanOfficerWorkspace.memberUserId, input.memberUserId), eq(teamLoanOfficerWorkspace.status, "active")))
    .limit(1);
  return rows[0];
}

// ---------------------------------------------------------------------------
// Administrator-controlled team template library

export async function listTeamTemplateLibrary(input: { adminUserId: number; includePrivate: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(teamTemplateLibrary).where(input.includePrivate ? eq(teamTemplateLibrary.adminUserId, input.adminUserId) : and(eq(teamTemplateLibrary.adminUserId, input.adminUserId), eq(teamTemplateLibrary.availability, "team_read_only"))).orderBy(asc(teamTemplateLibrary.channel), asc(teamTemplateLibrary.name));
}

export async function createTeamTemplateLibraryEntry(input: { adminUserId: number; channel: "email" | "text"; name: string; subjectTemplate?: string | null; bodyTemplate: string; availability: "private" | "team_read_only"; sourceTemplateScope?: string | null; sourceTemplateId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teamTemplateLibrary).values(input);
  return Number(result[0].insertId);
}

export async function updateTeamTemplateLibraryEntry(input: { adminUserId: number; id: number; name: string; subjectTemplate?: string | null; bodyTemplate: string; availability: "private" | "team_read_only" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teamTemplateLibrary).set({ name: input.name, subjectTemplate: input.subjectTemplate ?? null, bodyTemplate: input.bodyTemplate, availability: input.availability }).where(and(eq(teamTemplateLibrary.id, input.id), eq(teamTemplateLibrary.adminUserId, input.adminUserId)));
}

export async function deleteTeamTemplateLibraryEntry(input: { adminUserId: number; id: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teamTemplateLibrary).where(and(eq(teamTemplateLibrary.id, input.id), eq(teamTemplateLibrary.adminUserId, input.adminUserId)));
}

export async function createTeamTemplateSubmission(input: { adminUserId: number; memberUserId: number; loanOfficerId: number; channel: "email" | "text"; name: string; subjectTemplate?: string | null; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(teamTemplateSubmission).values(input);
  return Number(result[0].insertId);
}

export async function listTeamTemplateSubmissionsForAdmin(input: { adminUserId: number; status?: "pending" | "approved" | "rejected" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(teamTemplateSubmission.adminUserId, input.adminUserId)];
  if (input.status) conditions.push(eq(teamTemplateSubmission.status, input.status));
  return db
    .select({ ...getTableColumns(teamTemplateSubmission), loanOfficerName: loanOfficer.name, memberName: users.name, memberEmail: users.email })
    .from(teamTemplateSubmission)
    .innerJoin(loanOfficer, eq(teamTemplateSubmission.loanOfficerId, loanOfficer.id))
    .innerJoin(users, eq(teamTemplateSubmission.memberUserId, users.id))
    .where(and(...conditions))
    .orderBy(desc(teamTemplateSubmission.createdAt));
}

export async function listTeamTemplateSubmissionsForMember(memberUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(teamTemplateSubmission).where(eq(teamTemplateSubmission.memberUserId, memberUserId)).orderBy(desc(teamTemplateSubmission.createdAt));
}

export async function reviewTeamTemplateSubmission(input: { adminUserId: number; id: number; status: "approved" | "rejected"; reviewerNote?: string | null; approvedLibraryTemplateId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(teamTemplateSubmission).where(and(eq(teamTemplateSubmission.id, input.id), eq(teamTemplateSubmission.adminUserId, input.adminUserId))).limit(1);
  const submission = rows[0];
  if (!submission) throw new Error("Template submission was not found.");
  if (submission.status !== "pending") throw new Error("Only pending template submissions can be reviewed.");
  await db.update(teamTemplateSubmission).set({ status: input.status, reviewerNote: input.reviewerNote ?? null, reviewedAt: new Date(), approvedLibraryTemplateId: input.approvedLibraryTemplateId ?? null }).where(eq(teamTemplateSubmission.id, input.id));
  return submission;
}

export async function getAdminTeamPerformance(adminUserId: number) {
  const activeWorkspaces = (await listTeamLoanOfficerWorkspaces(adminUserId)).filter((workspace) => workspace.status === "active" && workspace.memberUserId !== null);
  return Promise.all(activeWorkspaces.map(async (workspace) => {
    const [roadmapLeads, chatIntakes, platformLeads, quotes] = await Promise.all([
      listLeads({ loanOfficerId: workspace.loanOfficerId }),
      listChatIntakeLeads({ loanOfficerId: workspace.loanOfficerId }),
      listPlatformLeads(workspace.memberUserId!),
      listMortgagePaymentQuotes(workspace.memberUserId!),
    ]);
    const capturedLeadCount = roadmapLeads.length + chatIntakes.filter((chat) => chat.status === "qualified").length + platformLeads.length;
    const convertedLeadCount = roadmapLeads.filter((lead) => lead.status === "booked").length + platformLeads.filter((lead) => lead.progressStatus === "qualified").length;
    return {
      memberUserId: workspace.memberUserId!,
      loanOfficerId: workspace.loanOfficerId,
      loanOfficerName: workspace.loanOfficerName,
      capturedLeadCount,
      convertedLeadCount,
      conversionRateBps: capturedLeadCount ? Math.round((convertedLeadCount / capturedLeadCount) * 10_000) : 0,
      savedQuoteCount: quotes.length,
    };
  }));
}

export async function getAdminTeamActivityFeed(input: { adminUserId: number; limit: number }) {
  const activeWorkspaces = (await listTeamLoanOfficerWorkspaces(input.adminUserId)).filter((workspace) => workspace.status === "active" && workspace.memberUserId !== null);
  const eventGroups = await Promise.all(activeWorkspaces.map(async (workspace) => {
    const [roadmapLeads, chatIntakes, platformLeads, quotes] = await Promise.all([
      listLeads({ loanOfficerId: workspace.loanOfficerId }),
      listChatIntakeLeads({ loanOfficerId: workspace.loanOfficerId }),
      listPlatformLeads(workspace.memberUserId!),
      listMortgagePaymentQuotes(workspace.memberUserId!),
    ]);
    return [
      ...roadmapLeads.map((lead) => ({ id: `roadmap-${lead.id}`, type: "roadmap_lead" as const, loanOfficerName: workspace.loanOfficerName, label: lead.firstName || "New Roadmap lead", occurredAt: lead.createdAt })),
      ...chatIntakes.filter((chat) => chat.status === "qualified").map((chat) => ({ id: `chat-${chat.id}`, type: "chat_intake" as const, loanOfficerName: workspace.loanOfficerName, label: chat.fullName || "Qualified Mortgage Chat intake", occurredAt: chat.updatedAt })),
      ...platformLeads.map((lead) => ({ id: `platform-${lead.id}`, type: "platform_lead" as const, loanOfficerName: workspace.loanOfficerName, label: lead.fullName || "New platform lead", occurredAt: lead.receivedAt })),
      ...quotes.map((quote) => ({ id: `quote-${quote.id}`, type: "saved_quote" as const, loanOfficerName: workspace.loanOfficerName, label: quote.name, occurredAt: quote.createdAt })),
    ];
  }));
  return eventGroups.flat().sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime()).slice(0, input.limit);
}

export async function insertLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db.insert(leads).values(lead);
}

export async function listLeads(options: { activitySince?: Date | null; loanOfficerId?: number } = {}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const activityWindow = options.activitySince
    ? sql`and ${propertyPageActivity.createdAt} >= ${options.activitySince}`
    : sql``;
  return db
    .select({
      ...getTableColumns(leads),
      loanOfficerName: loanOfficer.name,
      loanOfficerSlug: loanOfficer.slug,
      agentName: agentProfile.name,
      agentSlug: agentProfile.slug,
      propertyPageAddress: propertyLandingPage.address,
      propertyPageSlug: propertyLandingPage.slug,
      propertyPageListingSnapshot: propertyLandingPage.listingSnapshot,
      propertyPageActivityCount: sql<number>`coalesce((select count(*) from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} ${activityWindow}), 0)`.mapWith(Number),
      propertyPageLatestActivityType: sql<string | null>`(select ${propertyPageActivity.eventType} from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} ${activityWindow} order by ${propertyPageActivity.createdAt} desc, ${propertyPageActivity.id} desc limit 1)`,
      propertyPageLatestActivityAt: sql<Date | null>`(select ${propertyPageActivity.createdAt} from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} ${activityWindow} order by ${propertyPageActivity.createdAt} desc, ${propertyPageActivity.id} desc limit 1)`,
    })
    .from(leads)
    .leftJoin(loanOfficer, eq(leads.loanOfficerId, loanOfficer.id))
    .leftJoin(agentProfile, eq(leads.agentId, agentProfile.id))
    .leftJoin(propertyLandingPage, eq(leads.propertyPageId, propertyLandingPage.id))
    .where(options.loanOfficerId ? eq(leads.loanOfficerId, options.loanOfficerId) : undefined)
    .orderBy(leads.createdAt);
}

export async function updateLeadStatus(
  id: number,
  status: "new" | "contacted" | "booked",
  loanOfficerId?: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db.update(leads).set({ status }).where(loanOfficerId ? and(eq(leads.id, id), eq(leads.loanOfficerId, loanOfficerId)) : eq(leads.id, id));
}

export async function updateLeadNotes(id: number, notes: string, loanOfficerId?: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db.update(leads).set({ notes, notesUpdatedAt: new Date() }).where(loanOfficerId ? and(eq(leads.id, id), eq(leads.loanOfficerId, loanOfficerId)) : eq(leads.id, id));
}

/** Assign (or clear) the co-marketing agent on a lead. */
export async function updateLeadAgent(id: number, agentId: number | null) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  // Manual dashboard assignment; clearing the agent also clears the source.
  return db
    .update(leads)
    .set({ agentId, agentSource: agentId === null ? null : "manual" })
    .where(eq(leads.id, id));
}

/** Record that the lead was referred to its assigned agent by email. */
export async function markLeadSentToAgent(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db.update(leads).set({ sentToAgentAt: new Date() }).where(eq(leads.id, id));
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export type AgentLeadStats = {
  agentId: number;
  /** Leads that came in through the agent's /with/:slug co-branded link. */
  linkLeads: number;
  /** Leads currently assigned to the agent (any source). */
  assignedLeads: number;
  /** Assigned leads that were referred to the agent by email. */
  referredLeads: number;
};

/** Per-agent lead counts, grouped in a single query. */
export async function getAgentLeadStats(): Promise<AgentLeadStats[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const rows = await db
    .select({
      agentId: leads.agentId,
      linkLeads: sql<number>`SUM(CASE WHEN ${leads.agentSource} = 'link' THEN 1 ELSE 0 END)`,
      assignedLeads: sql<number>`COUNT(*)`,
      referredLeads: sql<number>`SUM(CASE WHEN ${leads.sentToAgentAt} IS NOT NULL THEN 1 ELSE 0 END)`,
    })
    .from(leads)
    .where(isNotNull(leads.agentId))
    .groupBy(leads.agentId);
  return rows.map((r) => ({
    agentId: r.agentId as number,
    linkLeads: Number(r.linkLeads),
    assignedLeads: Number(r.assignedLeads),
    referredLeads: Number(r.referredLeads),
  }));
}

// ---------------------------------------------------------------------------
// Co-marketing agents (multi-agent)
// ---------------------------------------------------------------------------

export async function listAgents() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db.select().from(agentProfile).orderBy(agentProfile.name);
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const rows = await db.select().from(agentProfile).where(eq(agentProfile.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function getAgentBySlug(slug: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const rows = await db
    .select()
    .from(agentProfile)
    .where(eq(agentProfile.slug, slug))
    .limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

/** The agent shown on the default landing page (/): featured + visible. */
export async function getFeaturedAgent() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const rows = await db
    .select()
    .from(agentProfile)
    .where(and(eq(agentProfile.featured, 1), eq(agentProfile.visible, 1)))
    .limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

/** True when another agent (excluding `excludeId`) already uses this slug. */
export async function slugTaken(slug: string, excludeId?: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const rows = await db
    .select({ id: agentProfile.id })
    .from(agentProfile)
    .where(
      excludeId !== undefined
        ? and(eq(agentProfile.slug, slug), ne(agentProfile.id, excludeId))
        : eq(agentProfile.slug, slug)
    )
    .limit(1);
  return rows.length > 0;
}

export async function createAgent(
  values: Omit<InsertAgentProfile, "id" | "createdAt" | "updatedAt">
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  const [result] = await db.insert(agentProfile).values(values);
  return result.insertId;
}

export async function updateAgent(
  id: number,
  values: Partial<Omit<InsertAgentProfile, "id" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db.update(agentProfile).set(values).where(eq(agentProfile.id, id));
}

export type SyncedTopAgentProfileInput = {
  sourceAgentId: number;
  state: string;
  fullName: string;
  brokerage: string | null;
  cityArea: string | null;
  phone: string | null;
  email: string | null;
  websiteBioUrl: string | null;
  zillowUrl: string | null;
  headshotUrl: string | null;
  sourceRank: number | null;
  rankTotal?: number | null;
  profileData: string;
  sourceUpdatedAt: Date | null;
};

/** Owner-scoped upsert for the authorized state agent directory sync. */
export async function upsertSyncedTopAgents(ownerUserId: number, profiles: SyncedTopAgentProfileInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const movedAgents: Array<{ fullName: string; brokerage: string | null; fromRank: number; toRank: number; rankTotal: number | null }> = [];
  for (const profile of profiles) {
    const existingRows = await db
      .select()
      .from(syncedTopAgent)
      .where(and(
        eq(syncedTopAgent.ownerUserId, ownerUserId),
        eq(syncedTopAgent.sourceKey, "oregon-agent-leads"),
        eq(syncedTopAgent.sourceAgentId, profile.sourceAgentId)
      ))
      .limit(1);
    const existing = existingRows[0];
    const rankTotal = profile.rankTotal ?? getRankTotal(profile.profileData);
    if (
      existing &&
      existing.sourceRank !== null &&
      profile.sourceRank !== null &&
      existing.sourceRank !== profile.sourceRank
    ) {
      movedAgents.push({
        fullName: profile.fullName,
        brokerage: profile.brokerage,
        fromRank: existing.sourceRank,
        toRank: profile.sourceRank,
        rankTotal,
      });
    }
    const requiresReview = Boolean(existing?.createdAgentId && existing.profileData !== profile.profileData);
    const values: Omit<InsertSyncedTopAgent, "id" | "createdAt" | "updatedAt"> = {
      ownerUserId,
      sourceKey: "oregon-agent-leads",
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
      sourceRank: profile.sourceRank,
      previousSourceRank: existing && existing.sourceRank !== profile.sourceRank
        ? existing.sourceRank
        : (existing?.previousSourceRank ?? null),
      profileData: profile.profileData,
      sourceUpdatedAt: profile.sourceUpdatedAt,
      hasPendingReview: requiresReview ? 1 : (existing?.hasPendingReview ?? 0),
      syncedAt: new Date(),
    };
    if (requiresReview && existing) {
      const changedFields = JSON.stringify(getChangedSourceFields(existing.profileData, profile.profileData));
      const pendingRows = await db
        .select()
        .from(syncedTopAgentReview)
        .where(and(
          eq(syncedTopAgentReview.ownerUserId, ownerUserId),
          eq(syncedTopAgentReview.syncedTopAgentId, existing.id),
          eq(syncedTopAgentReview.status, "pending")
        ))
        .limit(1);
      if (pendingRows[0]) {
        await db.update(syncedTopAgentReview).set({
          proposedProfileData: profile.profileData,
          changedFields,
        }).where(eq(syncedTopAgentReview.id, pendingRows[0].id));
      } else {
        await db.insert(syncedTopAgentReview).values({
          ownerUserId,
          syncedTopAgentId: existing.id,
          agentId: existing.createdAgentId!,
          previousProfileData: existing.profileData,
          proposedProfileData: profile.profileData,
          changedFields,
          status: "pending",
        });
      }
    }
    await db.insert(syncedTopAgent).values(values).onDuplicateKeyUpdate({
      set: {
        state: values.state,
        fullName: values.fullName,
        brokerage: values.brokerage,
        cityArea: values.cityArea,
        phone: values.phone,
        email: values.email,
        websiteBioUrl: values.websiteBioUrl,
        zillowUrl: values.zillowUrl,
        headshotUrl: values.headshotUrl,
        sourceRank: values.sourceRank,
        previousSourceRank: values.previousSourceRank,
        profileData: values.profileData,
        sourceUpdatedAt: values.sourceUpdatedAt,
        hasPendingReview: values.hasPendingReview,
        syncedAt: values.syncedAt,
      },
    });
    const syncedRows = await db
      .select({ id: syncedTopAgent.id })
      .from(syncedTopAgent)
      .where(and(
        eq(syncedTopAgent.ownerUserId, ownerUserId),
        eq(syncedTopAgent.sourceKey, "oregon-agent-leads"),
        eq(syncedTopAgent.sourceAgentId, profile.sourceAgentId)
      ))
      .limit(1);
    if (syncedRows[0]) {
      await db.insert(syncedTopAgentRankSnapshot).values({
        ownerUserId,
        syncedTopAgentId: syncedRows[0].id,
        sourceRank: profile.sourceRank,
        rankTotal,
      });
    }
  }
  return { count: profiles.length, movedAgents };
}

function getRankTotal(profileData: string): number | null {
  const source = parseSourceProfile(profileData);
  const value = source.rankTotal;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function getChangedSourceFields(previousData: string, proposedData: string): string[] {
  try {
    const previous = JSON.parse(previousData) as Record<string, unknown>;
    const proposed = JSON.parse(proposedData) as Record<string, unknown>;
    return Array.from(new Set([...Object.keys(previous), ...Object.keys(proposed)]))
      .filter((field) => JSON.stringify(previous[field] ?? null) !== JSON.stringify(proposed[field] ?? null));
  } catch {
    return ["source profile"];
  }
}

export async function listSyncedTopAgents(ownerUserId: number, state?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(syncedTopAgent)
    .where(state ? and(eq(syncedTopAgent.ownerUserId, ownerUserId), eq(syncedTopAgent.state, state)) : eq(syncedTopAgent.ownerUserId, ownerUserId))
    .orderBy(syncedTopAgent.sourceRank, syncedTopAgent.fullName);
}

/** Private, reusable subject and body templates for outreach to the synced Oregon directory. */
export async function listSyncedAgentOutreachTemplates(ownerUserId: number, includeArchived = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(syncedAgentOutreachTemplate)
    .where(and(eq(syncedAgentOutreachTemplate.ownerUserId, ownerUserId), includeArchived ? undefined : isNull(syncedAgentOutreachTemplate.archivedAt)))
    .orderBy(asc(syncedAgentOutreachTemplate.name));
}

/** Saves a reusable private Oregon outreach template for its dashboard owner. */
export async function createSyncedAgentOutreachTemplate(input: {
  ownerUserId: number;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(syncedAgentOutreachTemplate).values(input);
  const rows = await db
    .select()
    .from(syncedAgentOutreachTemplate)
    .where(and(
      eq(syncedAgentOutreachTemplate.id, Number(result.insertId)),
      eq(syncedAgentOutreachTemplate.ownerUserId, input.ownerUserId)
    ))
    .limit(1);
  return rows[0]!;
}

export async function updateSyncedAgentOutreachTemplate(input: { ownerUserId: number; id: number; name: string; subjectTemplate: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(syncedAgentOutreachTemplate).set({ name: input.name, subjectTemplate: input.subjectTemplate, bodyTemplate: input.bodyTemplate, updatedAt: new Date() }).where(and(eq(syncedAgentOutreachTemplate.id, input.id), eq(syncedAgentOutreachTemplate.ownerUserId, input.ownerUserId)));
  if (!result[0].affectedRows) throw new Error("Outreach template not found.");
  const rows = await db.select().from(syncedAgentOutreachTemplate).where(and(eq(syncedAgentOutreachTemplate.id, input.id), eq(syncedAgentOutreachTemplate.ownerUserId, input.ownerUserId))).limit(1);
  return rows[0]!;
}

export async function setSyncedAgentOutreachTemplateArchived(input: { ownerUserId: number; id: number; archived: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(syncedAgentOutreachTemplate).set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() }).where(and(eq(syncedAgentOutreachTemplate.id, input.id), eq(syncedAgentOutreachTemplate.ownerUserId, input.ownerUserId)));
  if (!result[0].affectedRows) throw new Error("Outreach template not found.");
}

export async function deleteSyncedAgentOutreachTemplate(input: { ownerUserId: number; id: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(syncedAgentOutreachTemplate).where(and(eq(syncedAgentOutreachTemplate.id, input.id), eq(syncedAgentOutreachTemplate.ownerUserId, input.ownerUserId)));
  if (!result[0].affectedRows) throw new Error("Outreach template not found.");
}

export async function getSyncedTopAgent(ownerUserId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(syncedTopAgent)
    .where(and(eq(syncedTopAgent.ownerUserId, ownerUserId), eq(syncedTopAgent.id, id)))
    .limit(1);
  return rows[0];
}

/** Private source-rank trend for one selected synced profile, newest first. */
export async function listSyncedTopAgentRankHistory(ownerUserId: number, syncedTopAgentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(syncedTopAgentRankSnapshot)
    .where(and(
      eq(syncedTopAgentRankSnapshot.ownerUserId, ownerUserId),
      eq(syncedTopAgentRankSnapshot.syncedTopAgentId, syncedTopAgentId)
    ))
    .orderBy(desc(syncedTopAgentRankSnapshot.capturedAt))
    .limit(24);
}

export async function markSyncedTopAgentCreated(ownerUserId: number, syncedTopAgentId: number, createdAgentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(syncedTopAgent)
    .set({ createdAgentId })
    .where(and(eq(syncedTopAgent.ownerUserId, ownerUserId), eq(syncedTopAgent.id, syncedTopAgentId)));
}

export async function listSyncedTopAgentReviews(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select({
      id: syncedTopAgentReview.id,
      syncedTopAgentId: syncedTopAgentReview.syncedTopAgentId,
      agentId: syncedTopAgentReview.agentId,
      previousProfileData: syncedTopAgentReview.previousProfileData,
      proposedProfileData: syncedTopAgentReview.proposedProfileData,
      changedFields: syncedTopAgentReview.changedFields,
      createdAt: syncedTopAgentReview.createdAt,
      fullName: syncedTopAgent.fullName,
      brokerage: syncedTopAgent.brokerage,
      headshotUrl: syncedTopAgent.headshotUrl,
      agentName: agentProfile.name,
    })
    .from(syncedTopAgentReview)
    .innerJoin(syncedTopAgent, eq(syncedTopAgentReview.syncedTopAgentId, syncedTopAgent.id))
    .innerJoin(agentProfile, eq(syncedTopAgentReview.agentId, agentProfile.id))
    .where(and(eq(syncedTopAgentReview.ownerUserId, ownerUserId), eq(syncedTopAgentReview.status, "pending")))
    .orderBy(syncedTopAgentReview.createdAt);
}

export async function resolveSyncedTopAgentReview(ownerUserId: number, reviewId: number, decision: "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ review: syncedTopAgentReview, profile: syncedTopAgent, agent: agentProfile })
    .from(syncedTopAgentReview)
    .innerJoin(syncedTopAgent, eq(syncedTopAgentReview.syncedTopAgentId, syncedTopAgent.id))
    .innerJoin(agentProfile, eq(syncedTopAgentReview.agentId, agentProfile.id))
    .where(and(
      eq(syncedTopAgentReview.ownerUserId, ownerUserId),
      eq(syncedTopAgentReview.id, reviewId),
      eq(syncedTopAgentReview.status, "pending")
    ))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  if (decision === "approved") {
    const source = parseSourceProfile(row.profile.profileData);
    await db.update(agentProfile).set({
      name: row.profile.fullName,
      email: row.profile.email ?? row.agent.email,
      phone: row.profile.phone ?? row.agent.phone,
      website: row.profile.websiteBioUrl ?? row.agent.website,
      companyName: row.profile.brokerage ?? row.agent.companyName,
      headshotUrl: row.profile.headshotUrl ?? row.agent.headshotUrl,
      bio: buildSyncedSourceBio(row.profile, source),
    }).where(eq(agentProfile.id, row.agent.id));
  }
  await db.update(syncedTopAgentReview).set({ status: decision, reviewedAt: new Date() }).where(eq(syncedTopAgentReview.id, reviewId));
  await db.update(syncedTopAgent).set({ hasPendingReview: 0 }).where(and(eq(syncedTopAgent.id, row.profile.id), eq(syncedTopAgent.ownerUserId, ownerUserId)));
  return { agentId: row.agent.id, decision };
}

function parseSourceProfile(profileData: string): Record<string, unknown> {
  try { return JSON.parse(profileData) as Record<string, unknown>; } catch { return {}; }
}

function buildSyncedSourceBio(profile: { brokerage: string | null; cityArea: string | null; sourceRank: number | null; zillowUrl: string | null }, source: Record<string, unknown>) {
  return [
    profile.brokerage ? `Brokerage: ${profile.brokerage}` : null,
    profile.cityArea ? `Service area: ${profile.cityArea}` : null,
    typeof profile.sourceRank === "number" ? `Oregon Top Agent source rank: #${profile.sourceRank}` : null,
    profile.zillowUrl ? `Zillow profile: ${profile.zillowUrl}` : null,
    typeof source.notes === "string" && source.notes.trim() ? source.notes.trim() : null,
  ].filter((value): value is string => Boolean(value)).join("\n\n");
}

export async function deleteAgent(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  // Unassign this agent from any leads and loan-officer pairings so rows never
  // point at a deleted partner.
  await db.update(leads).set({ agentId: null }).where(eq(leads.agentId, id));
  await db.update(loanOfficer).set({ agentId: null }).where(eq(loanOfficer.agentId, id));
  return db.delete(agentProfile).where(eq(agentProfile.id, id));
}

/** Make one agent featured on the homepage and unfeature all others. */
export async function setFeaturedAgent(id: number | null) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.update(agentProfile).set({ featured: 0 }).where(ne(agentProfile.featured, 0));
  if (id !== null) {
    await db.update(agentProfile).set({ featured: 1 }).where(eq(agentProfile.id, id));
  }
}

// ---------------------------------------------------------------------------
// Mortgage Intake Assistant
// ---------------------------------------------------------------------------

export async function getChatLeadBySession(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(chatIntakeLead)
    .where(eq(chatIntakeLead.sessionId, sessionId))
    .limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function getChatLeadById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(chatIntakeLead).where(eq(chatIntakeLead.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function createChatLead(values: InsertChatIntakeLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(chatIntakeLead).values(values);
  return result.insertId;
}

export async function updateChatLead(
  id: number,
  values: Partial<Omit<InsertChatIntakeLead, "id" | "createdAt" | "updatedAt" | "sessionId">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(chatIntakeLead).set(values).where(eq(chatIntakeLead.id, id));
}

/** Records every admin-triggered recipient email retry, whether it ultimately sends or needs follow-up. */
export async function recordChatIntakeResendAttempt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(chatIntakeLead)
    .set({ resendCount: sql`${chatIntakeLead.resendCount} + 1`, lastResentAt: new Date() })
    .where(eq(chatIntakeLead.id, id));
}

export async function addChatTranscript(
  chatLeadId: number,
  role: "assistant" | "user" | "system",
  content: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(chatTranscript).values({ chatLeadId, role, content });
}

export async function listChatIntakeLeads(options: { activitySince?: Date | null; loanOfficerId?: number } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const activityWindow = options.activitySince
    ? sql`and ${propertyPageActivity.createdAt} >= ${options.activitySince}`
    : sql``;
  const rows = await db
    .select({
      lead: chatIntakeLead,
      loanOfficerName: loanOfficer.name,
      loanOfficerSlug: loanOfficer.slug,
      agentName: agentProfile.name,
      agentSlug: agentProfile.slug,
      propertyPageAddress: propertyLandingPage.address,
      propertyPageSlug: propertyLandingPage.slug,
      propertyPageListingSnapshot: propertyLandingPage.listingSnapshot,
      propertyPageActivityCount: sql<number>`coalesce((select count(*) from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} ${activityWindow}), 0)`.mapWith(Number),
      propertyPageLatestActivityType: sql<string | null>`(select ${propertyPageActivity.eventType} from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} ${activityWindow} order by ${propertyPageActivity.createdAt} desc, ${propertyPageActivity.id} desc limit 1)`,
      propertyPageLatestActivityAt: sql<Date | null>`(select ${propertyPageActivity.createdAt} from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} ${activityWindow} order by ${propertyPageActivity.createdAt} desc, ${propertyPageActivity.id} desc limit 1)`,
    })
    .from(chatIntakeLead)
    .leftJoin(loanOfficer, eq(chatIntakeLead.loanOfficerId, loanOfficer.id))
    .leftJoin(agentProfile, eq(chatIntakeLead.agentId, agentProfile.id))
    .leftJoin(propertyLandingPage, eq(chatIntakeLead.propertyPageId, propertyLandingPage.id))
    .where(options.loanOfficerId ? eq(chatIntakeLead.loanOfficerId, options.loanOfficerId) : undefined)
    .orderBy(desc(chatIntakeLead.updatedAt));

  return rows.map(({ lead, loanOfficerName, loanOfficerSlug, agentName, agentSlug, propertyPageAddress, propertyPageSlug, propertyPageListingSnapshot, propertyPageActivityCount, propertyPageLatestActivityType, propertyPageLatestActivityAt }) => ({
    ...lead,
    loanOfficerName: loanOfficerName ?? null,
    loanOfficerSlug: loanOfficerSlug ?? null,
    agentName: agentName ?? null,
    agentSlug: agentSlug ?? null,
    propertyPageAddress: propertyPageAddress ?? null,
    propertyPageSlug: propertyPageSlug ?? null,
    propertyPageListingSnapshot: propertyPageListingSnapshot ?? null,
    propertyPageActivityCount: propertyPageActivityCount ?? 0,
    propertyPageLatestActivityType: propertyPageLatestActivityType ?? null,
    propertyPageLatestActivityAt: propertyPageLatestActivityAt ?? null,
    isCoBranded: Boolean(lead.loanOfficerId && lead.agentId),
  }));
}

export type TextReadyRecipient = {
  sourceType: "roadmap" | "chat";
  sourceLeadId: number;
  name: string;
  phone: string;
  email: string | null;
  consentedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  scenario: string | null;
  loanOfficerName: string | null;
  loanOfficerSlug: string | null;
  agentId: number | null;
  agentName: string | null;
  agentSlug: string | null;
  agentSource: "link" | "manual" | null;
  isCoBranded: boolean;
};

/**
 * Returns only leads with an affirmative recorded SMS consent and a stored
 * phone number. The router performs final normalized phone validation before a
 * recipient may be saved to a message draft.
 */
export async function listTextReadyRecipients(): Promise<TextReadyRecipient[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [roadmapRows, chatRows] = await Promise.all([
    db
      .select({
        sourceLeadId: leads.id,
        name: leads.firstName,
        phone: leads.phone,
        email: leads.email,
        createdAt: leads.createdAt,
        scenario: leads.scenario,
        status: leads.status,
        agentId: leads.agentId,
        agentSource: leads.agentSource,
        loanOfficerName: loanOfficer.name,
        loanOfficerSlug: loanOfficer.slug,
        agentName: agentProfile.name,
        agentSlug: agentProfile.slug,
      })
      .from(leads)
      .leftJoin(loanOfficer, eq(leads.loanOfficerId, loanOfficer.id))
      .leftJoin(agentProfile, eq(leads.agentId, agentProfile.id))
      .where(and(eq(leads.smsConsent, 1), ne(leads.phone, ""))),
    db
      .select({
        sourceLeadId: chatIntakeLead.id,
        name: chatIntakeLead.fullName,
        phone: chatIntakeLead.phone,
        email: chatIntakeLead.email,
        consentedAt: chatIntakeLead.smsConsentAt,
        createdAt: chatIntakeLead.createdAt,
        updatedAt: chatIntakeLead.updatedAt,
        status: chatIntakeLead.status,
        agentId: chatIntakeLead.agentId,
        annualIncome: chatIntakeLead.annualIncome,
        lowDownPaymentHomeSearch: chatIntakeLead.lowDownPaymentHomeSearch,
        searchAreaType: chatIntakeLead.searchAreaType,
        targetArea: chatIntakeLead.targetArea,
        loanOfficerName: loanOfficer.name,
        loanOfficerSlug: loanOfficer.slug,
        agentName: agentProfile.name,
        agentSlug: agentProfile.slug,
      })
      .from(chatIntakeLead)
      .leftJoin(loanOfficer, eq(chatIntakeLead.loanOfficerId, loanOfficer.id))
      .leftJoin(agentProfile, eq(chatIntakeLead.agentId, agentProfile.id))
      .where(and(eq(chatIntakeLead.smsConsent, 1), isNotNull(chatIntakeLead.phone))),
  ]);

  return [
    ...roadmapRows.map((lead) => ({
      sourceType: "roadmap" as const,
      sourceLeadId: lead.sourceLeadId,
      name: lead.name,
      phone: lead.phone,
        email: lead.email,
        consentedAt: lead.createdAt,
        createdAt: lead.createdAt,
        updatedAt: lead.createdAt,
        status: lead.status,
        scenario: lead.scenario,
        annualIncome: null,
        lowDownPaymentHomeSearch: null,
        searchAreaType: null,
        targetArea: null,
        loanOfficerName: lead.loanOfficerName ?? null,
        loanOfficerSlug: lead.loanOfficerSlug ?? null,
        agentId: lead.agentId ?? null,
        agentName: lead.agentName ?? null,
        agentSlug: lead.agentSlug ?? null,
        agentSource: lead.agentSource ?? null,
        isCoBranded: lead.agentSource === "link" && Boolean(lead.agentId && lead.loanOfficerSlug),
      })),
    ...chatRows
      .filter((lead) => Boolean(lead.phone))
      .map((lead) => ({
        sourceType: "chat" as const,
        sourceLeadId: lead.sourceLeadId,
        name: lead.name || "Chat intake lead",
        phone: lead.phone || "",
        email: lead.email,
        consentedAt: lead.consentedAt,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        status: lead.status,
        scenario: null,
        annualIncome: lead.annualIncome,
        lowDownPaymentHomeSearch: lead.lowDownPaymentHomeSearch,
        searchAreaType: lead.searchAreaType,
        targetArea: lead.targetArea,
        loanOfficerName: lead.loanOfficerName ?? null,
        loanOfficerSlug: lead.loanOfficerSlug ?? null,
        agentId: lead.agentId ?? null,
        agentName: lead.agentName ?? null,
        agentSlug: lead.agentSlug ?? null,
        agentSource: null,
        isCoBranded: Boolean(lead.agentId && lead.loanOfficerSlug),
      })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

type TextDraftRecipientInput = Pick<TextReadyRecipient, "sourceType" | "sourceLeadId" | "name" | "phone">;
type TextDraftAttachmentInput = {
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

/** Saves a dashboard message draft. No provider delivery occurs in this helper. */
export async function createTextMessageDraft(input: {
  body: string;
  createdByUserId: number;
  recipients: TextDraftRecipientInput[];
  attachments: TextDraftAttachmentInput[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(textMessage).values({
    body: input.body,
    createdByUserId: input.createdByUserId,
    providerMode: "provider_setup_required",
  });
  const textMessageId = Number(result.insertId);
  await db.insert(textMessageRecipient).values(
    input.recipients.map((recipient) => ({
      textMessageId,
      sourceType: recipient.sourceType,
      sourceLeadId: recipient.sourceLeadId,
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      deliveryStatus: "provider_setup_required" as const,
      deliveryDetail: "An SMS/MMS provider has not been configured. This draft was not sent.",
    }))
  );
  if (input.attachments.length > 0) {
    await db.insert(textMessageAttachment).values(
      input.attachments.map((attachment) => ({ textMessageId, ...attachment }))
    );
  }
  return textMessageId;
}

export type TwilioDeliveryStatus = "queued" | "sent" | "delivered" | "failed" | "undelivered";

export type TwilioTextRecipient = TextDraftRecipientInput & { id: number };

/**
 * Persists a single dashboard-confirmed send request before any provider call.
 * Each recipient remains independently auditable and can therefore receive a
 * separate Twilio message ID and carrier delivery outcome.
 */
export async function createTextMessageForTwilioDelivery(input: {
  body: string;
  createdByUserId: number;
  recipients: TextDraftRecipientInput[];
  attachments: TextDraftAttachmentInput[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [messageResult] = await db.insert(textMessage).values({
    body: input.body,
    createdByUserId: input.createdByUserId,
    providerMode: "queued",
    providerName: "twilio",
  });
  const textMessageId = Number(messageResult.insertId);
  const recipients: TwilioTextRecipient[] = [];
  for (const recipient of input.recipients) {
    const [recipientResult] = await db.insert(textMessageRecipient).values({
      textMessageId,
      sourceType: recipient.sourceType,
      sourceLeadId: recipient.sourceLeadId,
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      deliveryStatus: "queued",
      deliveryDetail: "Queued for owner-confirmed Twilio delivery.",
    });
    recipients.push({ ...recipient, id: Number(recipientResult.insertId) });
  }
  if (input.attachments.length > 0) {
    await db.insert(textMessageAttachment).values(
      input.attachments.map((attachment) => ({ textMessageId, ...attachment }))
    );
  }
  return { textMessageId, recipients };
}

/** Updates the independently tracked result for one outbound provider request. */
export async function updateTextMessageRecipientDelivery(input: {
  textMessageRecipientId: number;
  deliveryStatus: TwilioDeliveryStatus;
  deliveryDetail: string;
  providerMessageId?: string | null;
  sentAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(textMessageRecipient).set({
    deliveryStatus: input.deliveryStatus,
    deliveryDetail: input.deliveryDetail,
    ...(input.providerMessageId !== undefined ? { providerMessageId: input.providerMessageId } : {}),
    ...(input.sentAt !== undefined ? { sentAt: input.sentAt } : {}),
  }).where(eq(textMessageRecipient.id, input.textMessageRecipientId));
}

/** Summarizes a multi-recipient send without claiming every carrier outcome is identical. */
export async function updateTextMessageProviderMode(input: {
  textMessageId: number;
  providerMode: "queued" | "sent" | "delivered" | "failed" | "undelivered";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(textMessage).set({ providerMode: input.providerMode, providerName: "twilio" }).where(eq(textMessage.id, input.textMessageId));
}

/**
 * Applies a verified Twilio status callback once. Duplicate callbacks that
 * repeat the current state do not create duplicate visible message entries.
 */
export async function applyTwilioDeliveryStatusCallback(input: {
  providerMessageId: string;
  deliveryStatus: TwilioDeliveryStatus;
  deliveryDetail: string;
  occurredAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const recipient = (await db.select().from(textMessageRecipient).where(eq(textMessageRecipient.providerMessageId, input.providerMessageId)).limit(1))[0];
  if (!recipient) return { found: false as const, duplicate: false as const };

  const existingEvent = (await db.select().from(textChainEvent).where(and(
    eq(textChainEvent.textMessageRecipientId, recipient.id),
    eq(textChainEvent.providerName, "twilio"),
    eq(textChainEvent.providerMessageId, input.providerMessageId),
  )).orderBy(desc(textChainEvent.occurredAt)).limit(1))[0];

  if (existingEvent?.eventStatus === input.deliveryStatus && recipient.deliveryStatus === input.deliveryStatus) {
    return { found: true as const, duplicate: true as const, textMessageRecipientId: recipient.id };
  }

  if (!shouldApplyTwilioDeliveryStatus(recipient.deliveryStatus, input.deliveryStatus)) {
    return { found: true as const, duplicate: true as const, textMessageRecipientId: recipient.id };
  }

  const occurredAt = input.occurredAt ?? new Date();
  await db.update(textMessageRecipient).set({
    deliveryStatus: input.deliveryStatus,
    deliveryDetail: input.deliveryDetail,
    sentAt: recipient.sentAt ?? occurredAt,
  }).where(eq(textMessageRecipient.id, recipient.id));

  if (existingEvent) {
    await db.update(textChainEvent).set({ eventStatus: input.deliveryStatus, occurredAt }).where(eq(textChainEvent.id, existingEvent.id));
  } else {
    const message = (await db.select().from(textMessage).where(eq(textMessage.id, recipient.textMessageId)).limit(1))[0];
    if (!message) throw new Error("Text message not found for Twilio callback");
    let eventResult: { insertId: number | bigint };
    try {
      [eventResult] = await db.insert(textChainEvent).values({
        sourceType: recipient.sourceType,
        sourceLeadId: recipient.sourceLeadId,
        direction: "outgoing",
        body: message.body,
        eventStatus: input.deliveryStatus,
        senderLabel: "Mike Ford",
        providerName: "twilio",
        providerMessageId: input.providerMessageId,
        textMessageId: message.id,
        textMessageRecipientId: recipient.id,
        occurredAt,
      });
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ER_DUP_ENTRY")) throw error;
      const racedEvent = (await db.select().from(textChainEvent).where(eq(textChainEvent.textMessageRecipientId, recipient.id)).limit(1))[0];
      if (racedEvent && shouldApplyTwilioDeliveryStatus(racedEvent.eventStatus, input.deliveryStatus)) {
        await db.update(textChainEvent).set({ eventStatus: input.deliveryStatus, occurredAt }).where(eq(textChainEvent.id, racedEvent.id));
      }
      return { found: true as const, duplicate: true as const, textMessageRecipientId: recipient.id };
    }
    const attachments = await db.select().from(textMessageAttachment).where(eq(textMessageAttachment.textMessageId, message.id));
    if (attachments.length) {
      await db.insert(textChainAttachment).values(attachments.map((attachment) => ({
        textChainEventId: Number(eventResult.insertId),
        storageKey: attachment.storageKey,
        url: attachment.url,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      })));
    }
  }

  return { found: true as const, duplicate: false as const, textMessageRecipientId: recipient.id };
}

/** Lists saved messaging drafts together with their independent recipients and attachments. */
export async function listTextMessageDrafts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [messages, recipients, attachments] = await Promise.all([
    db.select().from(textMessage).orderBy(desc(textMessage.createdAt)),
    db.select().from(textMessageRecipient).orderBy(desc(textMessageRecipient.createdAt)),
    db.select().from(textMessageAttachment).orderBy(desc(textMessageAttachment.createdAt)),
  ]);
  return messages.map((message) => ({
    ...message,
    recipients: recipients.filter((recipient) => recipient.textMessageId === message.id),
    attachments: attachments.filter((attachment) => attachment.textMessageId === message.id),
  }));
}

export type TextChainAttachmentRow = {
  id: number;
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type TextChainEntry = {
  id: string;
  direction: "incoming" | "outgoing";
  body: string;
  status: string;
  senderLabel: string;
  occurredAt: Date;
  attachments: TextChainAttachmentRow[];
  providerName: string | null;
};

/**
 * Returns one lead's complete visible message history. Existing saved drafts
 * are represented as outgoing provider-setup entries, then verified provider
 * delivery events are merged in chronological order.
 */
export async function listTextChainByLead(input: { sourceType: "roadmap" | "chat"; sourceLeadId: number }): Promise<TextChainEntry[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [messages, recipients, draftAttachments, events, eventAttachments] = await Promise.all([
    db.select().from(textMessage),
    db.select().from(textMessageRecipient).where(and(eq(textMessageRecipient.sourceType, input.sourceType), eq(textMessageRecipient.sourceLeadId, input.sourceLeadId))),
    db.select().from(textMessageAttachment),
    db.select().from(textChainEvent).where(and(eq(textChainEvent.sourceType, input.sourceType), eq(textChainEvent.sourceLeadId, input.sourceLeadId))),
    db.select().from(textChainAttachment),
  ]);

  const eventRecipientIds = new Set(events.map((event) => event.textMessageRecipientId).filter((id): id is number => id !== null));
  const draftEntries = recipients
    .filter((recipient) => !eventRecipientIds.has(recipient.id))
    .flatMap((recipient) => {
      const message = messages.find((candidate) => candidate.id === recipient.textMessageId);
      if (!message) return [];
      return [{
        id: `draft-${recipient.id}`,
        direction: "outgoing" as const,
        body: message.body,
        status: recipient.deliveryStatus,
        senderLabel: "Mike Ford",
        occurredAt: recipient.sentAt ?? recipient.createdAt,
        attachments: draftAttachments
          .filter((attachment) => attachment.textMessageId === message.id)
          .map((attachment) => ({
            id: attachment.id,
            storageKey: attachment.storageKey,
            url: attachment.url,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
          })),
        providerName: message.providerName,
      }];
    });
  const providerEntries = events.map((event) => ({
    id: `event-${event.id}`,
    direction: event.direction,
    body: event.body,
    status: event.eventStatus,
    senderLabel: event.senderLabel || (event.direction === "outgoing" ? "Mike Ford" : "Lead"),
    occurredAt: event.occurredAt,
    attachments: eventAttachments
      .filter((attachment) => attachment.textChainEventId === event.id)
      .map((attachment) => ({
        id: attachment.id,
        storageKey: attachment.storageKey,
        url: attachment.url,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      })),
    providerName: event.providerName,
  }));

  return [...draftEntries, ...providerEntries].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

/** Provider integration hook for audited inbound and outbound SMS/MMS synchronization. */
export async function recordTextChainEvent(input: {
  sourceType: "roadmap" | "chat";
  sourceLeadId: number;
  direction: "incoming" | "outgoing";
  body: string;
  eventStatus: "queued" | "sent" | "delivered" | "failed" | "undelivered" | "received" | "opted_out";
  senderLabel?: string | null;
  providerName?: string | null;
  providerMessageId?: string | null;
  textMessageId?: number | null;
  textMessageRecipientId?: number | null;
  occurredAt?: Date;
  attachments?: Array<Omit<TextChainAttachmentRow, "id">>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (input.providerName === "twilio" && input.textMessageRecipientId !== null && input.textMessageRecipientId !== undefined) {
    const existing = (await db.select().from(textChainEvent).where(eq(textChainEvent.textMessageRecipientId, input.textMessageRecipientId)).limit(1))[0];
    if (existing) {
      if (shouldApplyTwilioDeliveryStatus(existing.eventStatus, input.eventStatus as TwilioDeliveryStatus)) {
        await db.update(textChainEvent).set({ eventStatus: input.eventStatus, occurredAt: input.occurredAt ?? new Date() }).where(eq(textChainEvent.id, existing.id));
      }
      return existing.id;
    }
  }
  let result: { insertId: number | bigint };
  try {
    [result] = await db.insert(textChainEvent).values({
      sourceType: input.sourceType,
      sourceLeadId: input.sourceLeadId,
      direction: input.direction,
      body: input.body,
      eventStatus: input.eventStatus,
      senderLabel: input.senderLabel ?? null,
      providerName: input.providerName ?? null,
      providerMessageId: input.providerMessageId ?? null,
      textMessageId: input.textMessageId ?? null,
      textMessageRecipientId: input.textMessageRecipientId ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    });
  } catch (error) {
    if (!(input.providerName === "twilio" && input.textMessageRecipientId !== null && input.textMessageRecipientId !== undefined && typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ER_DUP_ENTRY")) throw error;
    const existing = (await db.select().from(textChainEvent).where(eq(textChainEvent.textMessageRecipientId, input.textMessageRecipientId)).limit(1))[0];
    if (!existing) throw error;
    if (shouldApplyTwilioDeliveryStatus(existing.eventStatus, input.eventStatus as TwilioDeliveryStatus)) {
      await db.update(textChainEvent).set({ eventStatus: input.eventStatus, occurredAt: input.occurredAt ?? new Date() }).where(eq(textChainEvent.id, existing.id));
    }
    return existing.id;
  }
  const textChainEventId = Number(result.insertId);
  if (input.attachments?.length) {
    await db.insert(textChainAttachment).values(input.attachments.map((attachment) => ({ textChainEventId, ...attachment })));
  }
  return textChainEventId;
}

export async function getChatTranscriptByLeadId(chatLeadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(chatTranscript).where(eq(chatTranscript.chatLeadId, chatLeadId)).orderBy(chatTranscript.createdAt);
}

export async function getFeaturedLoanOfficer() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(loanOfficer)
    .where(and(eq(loanOfficer.featured, 1), eq(loanOfficer.visible, 1)))
    .limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function listLoanOfficers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(loanOfficer).orderBy(loanOfficer.name);
}

export async function getLoanOfficerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(loanOfficer).where(eq(loanOfficer.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

/** Public URL lookup for an LO's individual and paired co-marketing pages. */
export async function getLoanOfficerBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(loanOfficer).where(eq(loanOfficer.slug, slug)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

/** True when another loan officer already uses this public slug. */
export async function loanOfficerSlugTaken(slug: string, excludeId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ id: loanOfficer.id })
    .from(loanOfficer)
    .where(
      excludeId !== undefined
        ? and(eq(loanOfficer.slug, slug), ne(loanOfficer.id, excludeId))
        : eq(loanOfficer.slug, slug)
    )
    .limit(1);
  return rows.length > 0;
}

export async function createLoanOfficer(
  values: Omit<InsertLoanOfficer, "id" | "createdAt" | "updatedAt">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(loanOfficer).values(values);
  return result.insertId;
}

export async function updateLoanOfficer(
  id: number,
  values: Partial<Omit<InsertLoanOfficer, "id" | "createdAt" | "updatedAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(loanOfficer).set(values).where(eq(loanOfficer.id, id));
}

export async function deleteLoanOfficer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(chatIntakeLead).set({ loanOfficerId: null }).where(eq(chatIntakeLead.loanOfficerId, id));
  await db.update(leads).set({ loanOfficerId: null }).where(eq(leads.loanOfficerId, id));
  return db.delete(loanOfficer).where(eq(loanOfficer.id, id));
}

export async function setFeaturedLoanOfficer(id: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(loanOfficer).set({ featured: 0 }).where(ne(loanOfficer.featured, 0));
  if (id !== null) {
    await db.update(loanOfficer).set({ featured: 1 }).where(eq(loanOfficer.id, id));
  }
}

// ---------------------------------------------------------------------------
// Private LO + agent pairing spend tracker

export async function listLoAgentSpendTrackers(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const pairings = await db
    .select()
    .from(loAgentSpendPairing)
    .where(eq(loAgentSpendPairing.ownerUserId, ownerUserId))
    .orderBy(desc(loAgentSpendPairing.updatedAt));
  if (pairings.length === 0) return [];
  const pairingIds = pairings.map((pairing) => pairing.id);
  const entries = await db
    .select()
    .from(loAgentSpendEntry)
    .where(inArray(loAgentSpendEntry.pairingId, pairingIds))
    .orderBy(desc(loAgentSpendEntry.spentOn), desc(loAgentSpendEntry.id));
  return pairings.map((pairing) => ({ ...pairing, entries: entries.filter((entry) => entry.pairingId === pairing.id) }));
}

export async function getLoAgentSpendPairingForOwner(id: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(loAgentSpendPairing)
    .where(and(eq(loAgentSpendPairing.id, id), eq(loAgentSpendPairing.ownerUserId, ownerUserId)))
    .limit(1);
  return rows[0];
}

export async function createLoAgentSpendPairing(input: { ownerUserId: number; loanOfficerId: number; agentId: number }) {
  const existing = await getDb().then(async (db) => {
    if (!db) throw new Error("Database not available");
    return db.select().from(loAgentSpendPairing).where(and(
      eq(loAgentSpendPairing.ownerUserId, input.ownerUserId),
      eq(loAgentSpendPairing.loanOfficerId, input.loanOfficerId),
      eq(loAgentSpendPairing.agentId, input.agentId),
    )).limit(1);
  });
  if (existing[0]) return existing[0];
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(loAgentSpendPairing).values(input);
  const created = await getLoAgentSpendPairingForOwner(Number(result.insertId), input.ownerUserId);
  if (!created) throw new Error("Couldn't create pairing tracker.");
  return created;
}

export async function addLoAgentSpendEntry(input: {
  pairingId: number;
  spentOn: Date;
  category: "ad_spend" | "facebook_ads" | "google_ads" | "event" | "print" | "digital" | "other";
  description: string;
  loanOfficerCents: number;
  agentCents: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(loAgentSpendEntry).values(input);
  await db.update(loAgentSpendPairing).set({ updatedAt: new Date() }).where(eq(loAgentSpendPairing.id, input.pairingId));
  const rows = await db.select().from(loAgentSpendEntry).where(eq(loAgentSpendEntry.id, Number(result.insertId))).limit(1);
  if (!rows[0]) throw new Error("Couldn't create spend entry.");
  return rows[0];
}

export async function deleteLoAgentSpendEntry(input: { pairingId: number; entryId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(loAgentSpendEntry).where(and(eq(loAgentSpendEntry.id, input.entryId), eq(loAgentSpendEntry.pairingId, input.pairingId)));
  await db.update(loAgentSpendPairing).set({ updatedAt: new Date() }).where(eq(loAgentSpendPairing.id, input.pairingId));
}

export async function updateLoAgentSpendEntry(input: {
  pairingId: number;
  entryId: number;
  spentOn: Date;
  category: "ad_spend" | "facebook_ads" | "google_ads" | "event" | "print" | "digital" | "other";
  description: string;
  loanOfficerCents: number;
  agentCents: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(loAgentSpendEntry).set({ spentOn: input.spentOn, category: input.category, description: input.description, loanOfficerCents: input.loanOfficerCents, agentCents: input.agentCents }).where(and(eq(loAgentSpendEntry.id, input.entryId), eq(loAgentSpendEntry.pairingId, input.pairingId)));
  await db.update(loAgentSpendPairing).set({ updatedAt: new Date() }).where(eq(loAgentSpendPairing.id, input.pairingId));
}

export async function deleteLoAgentSpendPairing(input: { id: number; ownerUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(loAgentSpendEntry).where(eq(loAgentSpendEntry.pairingId, input.id));
  await db.delete(loAgentSpendPairing).where(and(eq(loAgentSpendPairing.id, input.id), eq(loAgentSpendPairing.ownerUserId, input.ownerUserId)));
}

// ---------------------------------------------------------------------------
// Private saved mortgage payment quotes

export async function listMortgagePaymentQuotes(ownerUserId: number, filters?: { firstName?: string; lastName?: string; program?: "conventional" | "fha" | "usda" | "va" | "nonqm"; maxPurchasePriceCents?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(mortgagePaymentQuote.ownerUserId, ownerUserId)];
  if (filters?.firstName?.trim()) conditions.push(like(mortgagePaymentQuote.firstName, `%${filters.firstName.trim()}%`));
  if (filters?.lastName?.trim()) conditions.push(like(mortgagePaymentQuote.lastName, `%${filters.lastName.trim()}%`));
  if (filters?.program) conditions.push(eq(mortgagePaymentQuote.program, filters.program));
  if (filters?.maxPurchasePriceCents !== undefined) conditions.push(lte(mortgagePaymentQuote.maxPurchasePriceResultCents, filters.maxPurchasePriceCents));
  return db.select().from(mortgagePaymentQuote).where(and(...conditions)).orderBy(desc(mortgagePaymentQuote.createdAt), desc(mortgagePaymentQuote.id));
}

export async function createMortgagePaymentQuote(input: {
  ownerUserId: number;
  name: string;
  firstName?: string;
  lastName?: string;
  program?: "conventional" | "fha" | "usda" | "va" | "nonqm";
  purchasePriceCents: number;
  downPaymentPercentBasisPoints: number;
  annualRateBasisPoints: number;
  termYears: number;
  annualPropertyTaxCents: number;
  annualHomeInsuranceCents: number;
  monthlyFloodInsuranceCents?: number;
  monthlyHoaDuesCents: number;
  monthlyMortgageInsuranceCents: number;
  creditScore?: number;
  grossMonthlyIncomeCents?: number;
  monthlyConsumerDebtCents?: number;
  maxHousingPaymentCents?: number;
  availablePrincipalAndInterestCents?: number;
  maxPurchasePriceResultCents?: number;
  dtiBasisPoints?: number;
  minimumCreditScore?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(mortgagePaymentQuote).values({
    ownerUserId: input.ownerUserId,
    name: input.name,
    firstName: input.firstName ?? "",
    lastName: input.lastName ?? "",
    program: input.program ?? "conventional",
    purchasePriceCents: input.purchasePriceCents,
    downPaymentPercentBasisPoints: input.downPaymentPercentBasisPoints,
    annualRateBasisPoints: input.annualRateBasisPoints,
    termYears: input.termYears,
    annualPropertyTaxCents: input.annualPropertyTaxCents,
    annualHomeInsuranceCents: input.annualHomeInsuranceCents,
    monthlyFloodInsuranceCents: input.monthlyFloodInsuranceCents ?? 0,
    monthlyHoaDuesCents: input.monthlyHoaDuesCents,
    monthlyMortgageInsuranceCents: input.monthlyMortgageInsuranceCents,
    creditScore: input.creditScore ?? 0,
    grossMonthlyIncomeCents: input.grossMonthlyIncomeCents ?? 0,
    monthlyConsumerDebtCents: input.monthlyConsumerDebtCents ?? 0,
    maxHousingPaymentCents: input.maxHousingPaymentCents ?? 0,
    availablePrincipalAndInterestCents: input.availablePrincipalAndInterestCents ?? 0,
    maxPurchasePriceResultCents: input.maxPurchasePriceResultCents ?? 0,
    dtiBasisPoints: input.dtiBasisPoints ?? 5000,
    minimumCreditScore: input.minimumCreditScore ?? 680,
  });
  const rows = await db.select().from(mortgagePaymentQuote).where(eq(mortgagePaymentQuote.id, Number(result.insertId))).limit(1);
  if (!rows[0]) throw new Error("Couldn't save mortgage payment quote.");
  return rows[0];
}

export async function updateMortgagePaymentQuoteName(input: { id: number; ownerUserId: number; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(mortgagePaymentQuote).set({ name: input.name.trim() }).where(and(eq(mortgagePaymentQuote.id, input.id), eq(mortgagePaymentQuote.ownerUserId, input.ownerUserId)));
  const rows = await db.select().from(mortgagePaymentQuote).where(and(eq(mortgagePaymentQuote.id, input.id), eq(mortgagePaymentQuote.ownerUserId, input.ownerUserId))).limit(1);
  if (!rows[0]) throw new Error("Saved mortgage quote not found.");
  return rows[0];
}

export async function deleteMortgagePaymentQuote(input: { id: number; ownerUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(mortgagePaymentQuote).where(and(eq(mortgagePaymentQuote.id, input.id), eq(mortgagePaymentQuote.ownerUserId, input.ownerUserId)));
}

// ---------------------------------------------------------------------------
// Private AI workflow-review history and owner feedback

export async function createWorkflowAiReviewHistory(input: {
  ownerUserId: number;
  section: string;
  headline: string;
  recordsSnapshot: string;
  actionsSnapshot: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(workflowAiReviewHistory).values(input);
  const rows = await db.select().from(workflowAiReviewHistory).where(eq(workflowAiReviewHistory.id, Number(result.insertId))).limit(1);
  if (!rows[0]) throw new Error("Couldn't save workflow review history.");
  return rows[0];
}

export async function listWorkflowAiReviewHistory(input: { ownerUserId: number; section?: string; limit: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const where = input.section ? and(eq(workflowAiReviewHistory.ownerUserId, input.ownerUserId), eq(workflowAiReviewHistory.section, input.section)) : eq(workflowAiReviewHistory.ownerUserId, input.ownerUserId);
  return db.select().from(workflowAiReviewHistory).where(where).orderBy(desc(workflowAiReviewHistory.createdAt), desc(workflowAiReviewHistory.id)).limit(input.limit);
}

export async function updateWorkflowAiReviewOutcome(input: {
  id: number;
  ownerUserId: number;
  status: "open" | "completed" | "deferred";
  feedback?: "useful" | "needs_tuning" | "not_useful" | null;
  ownerNote?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workflowAiReviewHistory).set({ status: input.status, feedback: input.feedback ?? null, ownerNote: input.ownerNote ?? null }).where(and(eq(workflowAiReviewHistory.id, input.id), eq(workflowAiReviewHistory.ownerUserId, input.ownerUserId)));
  const rows = await db.select().from(workflowAiReviewHistory).where(and(eq(workflowAiReviewHistory.id, input.id), eq(workflowAiReviewHistory.ownerUserId, input.ownerUserId))).limit(1);
  if (!rows[0]) throw new Error("Workflow review history was not found.");
  return rows[0];
}

// ---------------------------------------------------------------------------
// Private command-center layout preferences

export async function getDashboardLayoutPreference(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(dashboardLayoutPreference).where(eq(dashboardLayoutPreference.ownerUserId, ownerUserId)).limit(1);
  return rows[0] ?? null;
}

export async function saveDashboardLayoutPreference(input: { ownerUserId: number; commandCenterWidgetOrder: string; optimizerEnabled?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = input.optimizerEnabled === undefined ? await getDashboardLayoutPreference(input.ownerUserId) : null;
  const optimizerEnabled = input.optimizerEnabled ?? existing?.optimizerEnabled ?? false;
  await db.insert(dashboardLayoutPreference).values({ ...input, optimizerEnabled }).onDuplicateKeyUpdate({ set: { commandCenterWidgetOrder: input.commandCenterWidgetOrder, optimizerEnabled } });
  return getDashboardLayoutPreference(input.ownerUserId);
}

export async function resetDashboardLayoutPreference(ownerUserId: number, defaultOrder: string) {
  const existing = await getDashboardLayoutPreference(ownerUserId);
  return saveDashboardLayoutPreference({ ownerUserId, commandCenterWidgetOrder: defaultOrder, optimizerEnabled: existing?.optimizerEnabled ?? false });
}

// ---------------------------------------------------------------------------
// Private administrator backup readiness and documented history
// ---------------------------------------------------------------------------

export type BackupHistoryEventType = "backup_created" | "restore_confirmed";

export async function listBackupHistoryEvents(input: {
  ownerUserId: number;
  query?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(backupHistoryEvent.ownerUserId, input.ownerUserId)];
  if (input.startDate) conditions.push(gte(backupHistoryEvent.occurredAt, input.startDate));
  if (input.endDate) conditions.push(lte(backupHistoryEvent.occurredAt, input.endDate));
  const query = input.query?.trim();
  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(
      like(backupHistoryEvent.label, pattern),
      like(backupHistoryEvent.packageReference, pattern),
      like(backupHistoryEvent.notes, pattern),
    )!);
  }

  return db
    .select()
    .from(backupHistoryEvent)
    .where(and(...conditions))
    .orderBy(desc(backupHistoryEvent.occurredAt), desc(backupHistoryEvent.id))
    .limit(input.limit ?? 100);
}

export async function createBackupHistoryEvent(input: {
  ownerUserId: number;
  eventType: BackupHistoryEventType;
  label: string;
  packageReference?: string | null;
  notes?: string | null;
  occurredAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(backupHistoryEvent).values(input);
  const rows = await db.select().from(backupHistoryEvent).where(and(
    eq(backupHistoryEvent.id, Number(result.insertId)),
    eq(backupHistoryEvent.ownerUserId, input.ownerUserId),
  )).limit(1);
  if (!rows[0]) throw new Error("Could not record backup history event.");
  return rows[0];
}

// ---------------------------------------------------------------------------
// Administrator-only deferred advertising integration planning
// ---------------------------------------------------------------------------

export type AdvertisingIntegrationProvider = "meta" | "google_ads";
export type AdvertisingIntegrationStage = "not_started" | "details_saved" | "compliance_pending" | "approved_not_connected";

export async function listAdvertisingIntegrationSettings(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(advertisingIntegrationSetting).where(eq(advertisingIntegrationSetting.ownerUserId, ownerUserId)).orderBy(asc(advertisingIntegrationSetting.provider));
}

export async function saveAdvertisingIntegrationSetting(input: {
  ownerUserId: number;
  provider: AdvertisingIntegrationProvider;
  setupStage: AdvertisingIntegrationStage;
  accountReference?: string | null;
  formReference?: string | null;
  internalNote?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(advertisingIntegrationSetting).values(input).onDuplicateKeyUpdate({
    set: {
      setupStage: input.setupStage,
      accountReference: input.accountReference ?? null,
      formReference: input.formReference ?? null,
      internalNote: input.internalNote ?? null,
      updatedAt: new Date(),
    },
  });
  const rows = await db.select().from(advertisingIntegrationSetting).where(and(
    eq(advertisingIntegrationSetting.ownerUserId, input.ownerUserId),
    eq(advertisingIntegrationSetting.provider, input.provider),
  )).limit(1);
  if (!rows[0]) throw new Error("Could not save advertising integration planning settings.");
  return rows[0];
}

export async function getAdvertisingIntegrationModuleVisibility(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(advertisingIntegrationModuleSetting).where(eq(advertisingIntegrationModuleSetting.ownerUserId, ownerUserId)).limit(1);
  return {
    isVisible: rows[0]?.isVisible !== 0,
    checklist: parseAdvertisingChecklist(rows[0]?.checklistState),
    checklistReminderAt: rows[0]?.checklistReminderAt ?? null,
  };
}

export async function saveAdvertisingIntegrationModuleVisibility(input: { ownerUserId: number; isVisible: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(advertisingIntegrationModuleSetting).values({ ownerUserId: input.ownerUserId, isVisible: input.isVisible ? 1 : 0 }).onDuplicateKeyUpdate({
    set: { isVisible: input.isVisible ? 1 : 0, updatedAt: new Date() },
  });
  return { isVisible: input.isVisible };
}

export const ADVERTISING_CHECKLIST_KEYS = ["accountCreated", "complianceApproved", "formMappingReady", "secureKeyApproved", "connectionReviewReady"] as const;
export type AdvertisingChecklistKey = (typeof ADVERTISING_CHECKLIST_KEYS)[number];
export type AdvertisingChecklist = Record<AdvertisingChecklistKey, boolean>;

function parseAdvertisingChecklist(raw: string | null | undefined): AdvertisingChecklist {
  const defaults: AdvertisingChecklist = { accountCreated: false, complianceApproved: false, formMappingReady: false, secureKeyApproved: false, connectionReviewReady: false };
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<AdvertisingChecklistKey, unknown>>;
    return ADVERTISING_CHECKLIST_KEYS.reduce((result, key) => ({ ...result, [key]: parsed[key] === true }), defaults);
  } catch {
    return defaults;
  }
}

export async function saveAdvertisingIntegrationChecklist(input: { ownerUserId: number; checklist: AdvertisingChecklist }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const checklist = parseAdvertisingChecklist(JSON.stringify(input.checklist));
  await db.insert(advertisingIntegrationModuleSetting).values({ ownerUserId: input.ownerUserId, isVisible: 1, checklistState: JSON.stringify(checklist) }).onDuplicateKeyUpdate({
    set: { checklistState: JSON.stringify(checklist), updatedAt: new Date() },
  });
  return { checklist };
}

export async function saveAdvertisingIntegrationChecklistReminder(input: { ownerUserId: number; checklistReminderAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db.select().from(advertisingIntegrationModuleSetting).where(eq(advertisingIntegrationModuleSetting.ownerUserId, input.ownerUserId)).limit(1);
  await db.insert(advertisingIntegrationModuleSetting).values({
    ownerUserId: input.ownerUserId,
    isVisible: current[0]?.isVisible ?? 1,
    checklistState: current[0]?.checklistState ?? null,
    checklistReminderAt: input.checklistReminderAt,
  }).onDuplicateKeyUpdate({
    set: { checklistReminderAt: input.checklistReminderAt, updatedAt: new Date() },
  });
  return { checklistReminderAt: input.checklistReminderAt };
}

/** Clears only the private readiness checklist and deferral timestamp; it never changes provider planning or connection state. */
export async function resetAdvertisingIntegrationChecklist(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await db.select().from(advertisingIntegrationModuleSetting).where(eq(advertisingIntegrationModuleSetting.ownerUserId, ownerUserId)).limit(1);
  await db.insert(advertisingIntegrationModuleSetting).values({
    ownerUserId,
    isVisible: current[0]?.isVisible ?? 1,
    checklistState: null,
    checklistReminderAt: null,
  }).onDuplicateKeyUpdate({
    set: { checklistState: null, checklistReminderAt: null, updatedAt: new Date() },
  });
  return getAdvertisingIntegrationModuleVisibility(ownerUserId);
}

// ---------------------------------------------------------------------------
// Private campaign spend reporting
// ---------------------------------------------------------------------------

export async function listCampaignSpendEntries(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(campaignSpendEntry)
    .where(eq(campaignSpendEntry.ownerUserId, ownerUserId))
    .orderBy(desc(campaignSpendEntry.spentOn), desc(campaignSpendEntry.id));
}

export async function createCampaignSpendEntry(input: {
  ownerUserId: number;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  spentOn: Date;
  spendCents: number;
  notes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(campaignSpendEntry).values({ ...input, notes: input.notes ?? null });
  const rows = await db.select().from(campaignSpendEntry).where(eq(campaignSpendEntry.id, Number(result.insertId))).limit(1);
  if (!rows[0]) throw new Error("Couldn't save campaign spend.");
  return rows[0];
}

export async function deleteCampaignSpendEntry(input: { id: number; ownerUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(campaignSpendEntry).where(and(eq(campaignSpendEntry.id, input.id), eq(campaignSpendEntry.ownerUserId, input.ownerUserId)));
}

// ---------------------------------------------------------------------------
// GeoSphere saved listings
// ---------------------------------------------------------------------------

export type GeoSpherePullWrite = {
  sourceSnapshotId: string;
  cacheKey: string;
  areaLabel: string;
  city: string | null;
  county: string | null;
  zipCode: string | null;
  state: string | null;
  sourceSavedAt: Date | null;
  listingCount: number;
  lmiCount: number;
  usdaCount: number;
  lmiUsdaCount: number;
  listings: Array<Omit<InsertGeoSphereListing, "id" | "createdAt" | "updatedAt" | "savedPullId">>;
};

/** Creates or updates one immutable GeoSphere source snapshot and its listings. */
export async function upsertGeoSphereSavedPull(input: GeoSpherePullWrite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: geosphereSavedPull.id })
      .from(geosphereSavedPull)
      .where(eq(geosphereSavedPull.sourceSnapshotId, input.sourceSnapshotId))
      .limit(1);

    const pullValues = {
      cacheKey: input.cacheKey,
      areaLabel: input.areaLabel,
      city: input.city,
      county: input.county,
      zipCode: input.zipCode,
      state: input.state,
      sourceSavedAt: input.sourceSavedAt,
      listingCount: input.listingCount,
      lmiCount: input.lmiCount,
      usdaCount: input.usdaCount,
      lmiUsdaCount: input.lmiUsdaCount,
    };

    let savedPullId = existing[0]?.id;
    if (savedPullId) {
      await tx.update(geosphereSavedPull).set(pullValues).where(eq(geosphereSavedPull.id, savedPullId));
    } else {
      const [result] = await tx
        .insert(geosphereSavedPull)
        .values({ sourceSnapshotId: input.sourceSnapshotId, ...pullValues });
      savedPullId = Number(result.insertId);
    }

    if (input.listings.length > 0) {
      await tx
        .insert(geosphereListing)
        .values(input.listings.map((listing) => ({ ...listing, savedPullId: savedPullId! })))
        .onDuplicateKeyUpdate({
          set: {
            externalListingId: sql`VALUES(${geosphereListing.externalListingId})`,
            address: sql`VALUES(${geosphereListing.address})`,
            price: sql`VALUES(${geosphereListing.price})`,
            bedrooms: sql`VALUES(${geosphereListing.bedrooms})`,
            bathrooms: sql`VALUES(${geosphereListing.bathrooms})`,
            squareFootage: sql`VALUES(${geosphereListing.squareFootage})`,
            propertyType: sql`VALUES(${geosphereListing.propertyType})`,
            latitude: sql`VALUES(${geosphereListing.latitude})`,
            longitude: sql`VALUES(${geosphereListing.longitude})`,
            isLmi: sql`VALUES(${geosphereListing.isLmi})`,
            isUsda: sql`VALUES(${geosphereListing.isUsda})`,
            sourceData: sql`VALUES(${geosphereListing.sourceData})`,
          },
        });
    }

    return savedPullId!;
  });
}

export async function listGeoSphereSavedPulls() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(geosphereSavedPull).orderBy(desc(geosphereSavedPull.sourceSavedAt), desc(geosphereSavedPull.importedAt));
}

export async function listGeoSphereListings(
  savedPullId: number,
  overlay: "all" | "lmi" | "usda" | "lmiUsda"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const filters = [eq(geosphereListing.savedPullId, savedPullId)];
  if (overlay === "lmi") filters.push(eq(geosphereListing.isLmi, 1));
  if (overlay === "usda") filters.push(eq(geosphereListing.isUsda, 1));
  if (overlay === "lmiUsda") filters.push(eq(geosphereListing.isLmi, 1), eq(geosphereListing.isUsda, 1));
  return db
    .select()
    .from(geosphereListing)
    .where(and(...filters))
    .orderBy(desc(geosphereListing.price), geosphereListing.address);
}

/** Creates or refreshes a public property page from one saved GeoSphere listing snapshot. */
export async function createPropertyLandingPage(input: {
  geosphereListingId: number;
  loanOfficerId: number;
  agentId: number;
  externalListingUrl?: string;
  propertyTaxes?: number | null;
  units?: string | null;
  hoaDues?: number | null;
  homeownerInsurance?: number | null;
  mortgageInsurance?: number | null;
  complianceApprovalStatus?: "draft" | "submitted" | "approved" | "changes_requested" | "needs_review";
  contributionProgram?: "none" | "fha" | "va" | "usda" | "conventional";
  conventionalOccupancy?: "primary" | "second_home" | "investment";
  conventionalLtvTier?: "lte80" | "ltv81_90" | "gt90";
  programContributionLimit?: number | null;
  maxSellerContribution?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ listing: geosphereListing, sourceSavedAt: geosphereSavedPull.sourceSavedAt })
    .from(geosphereListing)
    .leftJoin(geosphereSavedPull, eq(geosphereListing.savedPullId, geosphereSavedPull.id))
    .where(eq(geosphereListing.id, input.geosphereListingId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error("The saved listing is no longer available.");
  const importedSnapshot = buildPropertyLandingSnapshot(row.listing, row.sourceSavedAt);
  const existing = await db
    .select()
    .from(propertyLandingPage)
    .where(eq(propertyLandingPage.geosphereListingId, input.geosphereListingId))
    .limit(1);
  const existingSnapshot = existing[0] ? parsePropertyLandingSnapshot(existing[0].listingSnapshot) : null;
  const snapshotDraft = {
    ...importedSnapshot,
    propertyTaxes: input.propertyTaxes ?? existingSnapshot?.propertyTaxes ?? importedSnapshot.propertyTaxes,
    units: input.units ?? existingSnapshot?.units ?? importedSnapshot.units,
    hoaDues: input.hoaDues ?? existingSnapshot?.hoaDues ?? importedSnapshot.hoaDues,
    homeownerInsurance: input.homeownerInsurance ?? existingSnapshot?.homeownerInsurance ?? importedSnapshot.homeownerInsurance,
    mortgageInsurance: input.mortgageInsurance ?? existingSnapshot?.mortgageInsurance ?? importedSnapshot.mortgageInsurance,
    complianceApprovalStatus: input.complianceApprovalStatus ?? existingSnapshot?.complianceApprovalStatus ?? importedSnapshot.complianceApprovalStatus,
    contributionProgram: input.contributionProgram ?? existingSnapshot?.contributionProgram ?? importedSnapshot.contributionProgram,
    conventionalOccupancy: input.conventionalOccupancy ?? existingSnapshot?.conventionalOccupancy ?? importedSnapshot.conventionalOccupancy,
    conventionalLtvTier: input.conventionalLtvTier ?? existingSnapshot?.conventionalLtvTier ?? importedSnapshot.conventionalLtvTier,
    programContributionLimit: input.programContributionLimit ?? existingSnapshot?.programContributionLimit ?? importedSnapshot.programContributionLimit,
    maxSellerContribution: input.maxSellerContribution ?? existingSnapshot?.maxSellerContribution ?? importedSnapshot.maxSellerContribution,
  };
  const contributionExceedsScreen = snapshotDraft.programContributionLimit !== null
    && snapshotDraft.maxSellerContribution !== null
    && snapshotDraft.maxSellerContribution > snapshotDraft.programContributionLimit;
  const snapshot = {
    ...snapshotDraft,
    complianceApprovalStatus: contributionExceedsScreen ? "needs_review" as const : snapshotDraft.complianceApprovalStatus,
  };
  if (existing[0]) {
    await db
      .update(propertyLandingPage)
      .set({
        loanOfficerId: input.loanOfficerId,
        agentId: input.agentId,
        address: snapshot.address,
        listingSnapshot: JSON.stringify(snapshot),
        externalListingUrl: input.externalListingUrl ?? existing[0].externalListingUrl,
        sourceSavedAt: row.sourceSavedAt ?? null,
        isActive: 1,
      })
      .where(eq(propertyLandingPage.id, existing[0].id));
    return { ...existing[0], loanOfficerId: input.loanOfficerId, agentId: input.agentId, address: snapshot.address, listingSnapshot: JSON.stringify(snapshot), externalListingUrl: input.externalListingUrl ?? existing[0].externalListingUrl, sourceSavedAt: row.sourceSavedAt ?? null, isActive: 1 };
  }
  const slug = `${slugifyPropertyAddress(snapshot.address)}-${input.geosphereListingId}`;
  const [result] = await db.insert(propertyLandingPage).values({
    slug,
    geosphereListingId: input.geosphereListingId,
    savedPullId: row.listing.savedPullId,
    loanOfficerId: input.loanOfficerId,
    agentId: input.agentId,
    address: snapshot.address,
    listingSnapshot: JSON.stringify(snapshot),
    externalListingUrl: input.externalListingUrl ?? "",
    sourceSavedAt: row.sourceSavedAt ?? null,
    isActive: 1,
  });
  const created = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, Number(result.insertId))).limit(1);
  return created[0]!;
}

export async function listPropertyLandingPages(loanOfficerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select({
      ...getTableColumns(propertyLandingPage),
      loanOfficerName: loanOfficer.name,
      loanOfficerSlug: loanOfficer.slug,
      agentName: agentProfile.name,
      agentSlug: agentProfile.slug,
    })
    .from(propertyLandingPage)
    .leftJoin(loanOfficer, eq(propertyLandingPage.loanOfficerId, loanOfficer.id))
    .leftJoin(agentProfile, eq(propertyLandingPage.agentId, agentProfile.id))
    .where(loanOfficerId ? eq(propertyLandingPage.loanOfficerId, loanOfficerId) : undefined)
    .orderBy(desc(propertyLandingPage.updatedAt));
}

export async function updatePropertyLandingPagePair(input: { id: number; loanOfficerId: number; agentId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(propertyLandingPage).set({ loanOfficerId: input.loanOfficerId, agentId: input.agentId }).where(eq(propertyLandingPage.id, input.id));
  const rows = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, input.id)).limit(1);
  if (!rows[0]) throw new Error("Property page not found.");
  return rows[0];
}

export async function updatePropertyLandingPageStatus(input: { id: number; isActive: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(propertyLandingPage).set({ isActive: input.isActive ? 1 : 0 }).where(eq(propertyLandingPage.id, input.id));
  const rows = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, input.id)).limit(1);
  if (!rows[0]) throw new Error("Property page not found.");
  return rows[0];
}

/** Saves an owner-supplied external property-page link; no third-party listing content is collected. */
export async function updatePropertyLandingPageExternalListingUrl(input: { id: number; externalListingUrl: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(propertyLandingPage).set({ externalListingUrl: input.externalListingUrl }).where(eq(propertyLandingPage.id, input.id));
  const rows = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, input.id)).limit(1);
  if (!rows[0]) throw new Error("Property page not found.");
  return rows[0];
}

/** Updates owner-entered property facts without mutating the underlying saved GeoSphere listing record. */
export async function updatePropertyLandingPageMetadata(input: {
  id: number;
  propertyTaxes: number | null;
  units: string | null;
  hoaDues: number | null;
  homeownerInsurance: number | null;
  mortgageInsurance: number | null;
  complianceApprovalStatus: "draft" | "submitted" | "approved" | "changes_requested" | "needs_review";
  contributionProgram: "none" | "fha" | "va" | "usda" | "conventional";
  conventionalOccupancy: "primary" | "second_home" | "investment";
  conventionalLtvTier: "lte80" | "ltv81_90" | "gt90";
  programContributionLimit: number | null;
  maxSellerContribution: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, input.id)).limit(1);
  const page = rows[0];
  if (!page) throw new Error("Property page not found.");
  const snapshot = parsePropertyLandingSnapshot(page.listingSnapshot);
  if (!snapshot) throw new Error("The saved property snapshot is unavailable.");
  const updatedSnapshotDraft = {
    ...snapshot,
    propertyTaxes: input.propertyTaxes,
    units: input.units?.trim() || null,
    hoaDues: input.hoaDues,
    homeownerInsurance: input.homeownerInsurance,
    mortgageInsurance: input.mortgageInsurance,
    complianceApprovalStatus: input.complianceApprovalStatus,
    contributionProgram: input.contributionProgram,
    conventionalOccupancy: input.conventionalOccupancy,
    conventionalLtvTier: input.conventionalLtvTier,
    programContributionLimit: input.programContributionLimit,
    maxSellerContribution: input.maxSellerContribution,
  };
  const contributionExceedsScreen = updatedSnapshotDraft.programContributionLimit !== null
    && updatedSnapshotDraft.maxSellerContribution !== null
    && updatedSnapshotDraft.maxSellerContribution > updatedSnapshotDraft.programContributionLimit;
  const updatedSnapshot = {
    ...updatedSnapshotDraft,
    complianceApprovalStatus: contributionExceedsScreen ? "needs_review" as const : updatedSnapshotDraft.complianceApprovalStatus,
  };
  await db.update(propertyLandingPage).set({ listingSnapshot: JSON.stringify(updatedSnapshot) }).where(eq(propertyLandingPage.id, input.id));
  const updated = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, input.id)).limit(1);
  return updated[0]!;
}

/** Rebuilds the public snapshot from the latest saved GeoSphere record; it never calls a live listing provider. */
export async function refreshPropertyLandingPage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, id)).limit(1);
  const page = rows[0];
  if (!page) throw new Error("Property page not found.");
  if (!page.loanOfficerId || !page.agentId) throw new Error("Assign a loan officer and co-branded agent before refreshing this property page.");
  return createPropertyLandingPage({
    geosphereListingId: page.geosphereListingId,
    loanOfficerId: page.loanOfficerId,
    agentId: page.agentId,
  });
}

export async function getPropertyLandingPageBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ page: propertyLandingPage, loanOfficer, agent: agentProfile })
    .from(propertyLandingPage)
    .leftJoin(loanOfficer, eq(propertyLandingPage.loanOfficerId, loanOfficer.id))
    .leftJoin(agentProfile, eq(propertyLandingPage.agentId, agentProfile.id))
    .where(and(eq(propertyLandingPage.slug, slug), eq(propertyLandingPage.isActive, 1)))
    .limit(1);
  return rows[0];
}

export async function getPropertyLandingPageById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ page: propertyLandingPage, loanOfficer, agent: agentProfile })
    .from(propertyLandingPage)
    .leftJoin(loanOfficer, eq(propertyLandingPage.loanOfficerId, loanOfficer.id))
    .leftJoin(agentProfile, eq(propertyLandingPage.agentId, agentProfile.id))
    .where(eq(propertyLandingPage.id, id))
    .limit(1);
  return rows[0];
}

export type PropertyPageActivityType = "page_view" | "buydown_calculator" | "cost_of_waiting_calculator" | "roadmap_request" | "chat_started" | "chat_completed" | "homes_list_request" | "buyer_agent_request" | "social_share" | "print_export" | "email_pdf_summary" | "calendar_click";

/** Stores only page-level interaction metadata; visitor contact data remains in protected lead tables. */
export async function recordPropertyPageActivity(input: { propertyLandingPageId: number; eventType: PropertyPageActivityType; detail?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(propertyPageActivity).values({
    propertyLandingPageId: input.propertyLandingPageId,
    eventType: input.eventType,
    detail: input.detail?.slice(0, 500) || null,
  });
  const rows = await db.select().from(propertyPageActivity).where(eq(propertyPageActivity.id, Number(result.insertId))).limit(1);
  return rows[0]!;
}

export async function listPropertyPageActivity(propertyLandingPageId: number, activitySince?: Date | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(propertyPageActivity)
    .where(and(
      eq(propertyPageActivity.propertyLandingPageId, propertyLandingPageId),
      activitySince ? gte(propertyPageActivity.createdAt, activitySince) : undefined,
    ))
    .orderBy(desc(propertyPageActivity.createdAt), desc(propertyPageActivity.id))
    .limit(100);
}

/** Owner-facing weekly ranking of active saved property pages by privacy-minimized page activity. */
export async function listWeeklyPropertyPageEngagement(limit = 5) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const currentWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const priorWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const weeklyActivityCount = sql<number>`coalesce((select count(*) from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} and ${propertyPageActivity.createdAt} >= ${currentWeekStart}), 0)`.mapWith(Number);
  const weeklyCapturedLeadCount = sql<number>`coalesce((select count(*) from ${leads} where ${leads.propertyPageId} = ${propertyLandingPage.id} and ${leads.createdAt} >= ${currentWeekStart}), 0) + coalesce((select count(*) from ${chatIntakeLead} where ${chatIntakeLead.propertyPageId} = ${propertyLandingPage.id} and ${chatIntakeLead.completedAt} is not null and ${chatIntakeLead.completedAt} >= ${currentWeekStart}), 0)`.mapWith(Number);
  const weeklyEmailPdfSummaryCount = sql<number>`coalesce((select count(*) from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} and ${propertyPageActivity.eventType} = 'email_pdf_summary' and ${propertyPageActivity.createdAt} >= ${currentWeekStart}), 0)`.mapWith(Number);
  const weeklyCalendarClickCount = sql<number>`coalesce((select count(*) from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} and ${propertyPageActivity.eventType} = 'calendar_click' and ${propertyPageActivity.createdAt} >= ${currentWeekStart}), 0)`.mapWith(Number);
  const priorWeekActivityCount = sql<number>`coalesce((select count(*) from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} and ${propertyPageActivity.createdAt} >= ${priorWeekStart} and ${propertyPageActivity.createdAt} < ${currentWeekStart}), 0)`.mapWith(Number);
  const latestActivityType = sql<string | null>`(select ${propertyPageActivity.eventType} from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} and ${propertyPageActivity.createdAt} >= ${currentWeekStart} order by ${propertyPageActivity.createdAt} desc, ${propertyPageActivity.id} desc limit 1)`;
  const latestActivityAt = sql<Date | null>`(select ${propertyPageActivity.createdAt} from ${propertyPageActivity} where ${propertyPageActivity.propertyLandingPageId} = ${propertyLandingPage.id} and ${propertyPageActivity.createdAt} >= ${currentWeekStart} order by ${propertyPageActivity.createdAt} desc, ${propertyPageActivity.id} desc limit 1)`;

  return db
    .select({
      id: propertyLandingPage.id,
      address: propertyLandingPage.address,
      slug: propertyLandingPage.slug,
      agentId: propertyLandingPage.agentId,
      agentName: agentProfile.name,
      weeklyActivityCount,
      weeklyCapturedLeadCount,
      weeklyEmailPdfSummaryCount,
      weeklyCalendarClickCount,
      priorWeekActivityCount,
      latestActivityType,
      latestActivityAt,
    })
    .from(propertyLandingPage)
    .leftJoin(agentProfile, eq(propertyLandingPage.agentId, agentProfile.id))
    .where(eq(propertyLandingPage.isActive, 1))
    .orderBy(desc(weeklyActivityCount), asc(propertyLandingPage.address))
    .limit(Math.min(Math.max(limit, 1), 10));
}

export async function getPropertyEngagementSetting(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(propertyEngagementSetting).where(eq(propertyEngagementSetting.ownerUserId, ownerUserId)).limit(1);
  return rows[0] ?? null;
}

export async function savePropertyEngagementThreshold(input: { ownerUserId: number; highActivityThreshold: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(propertyEngagementSetting).values(input).onDuplicateKeyUpdate({
    set: { highActivityThreshold: input.highActivityThreshold, updatedAt: new Date() },
  });
  const rows = await db.select().from(propertyEngagementSetting).where(eq(propertyEngagementSetting.ownerUserId, input.ownerUserId)).limit(1);
  return rows[0]!;
}

export type PropertyEngagementPreferences = {
  ownerUserId: number;
  highActivityThreshold: number;
  weeklySort: "activity" | "conversion";
  minimumActivity: number;
};

/** Saves the private owner preference set used by the weekly property-engagement widget. */
export async function savePropertyEngagementPreferences(input: PropertyEngagementPreferences) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(propertyEngagementSetting).values(input).onDuplicateKeyUpdate({
    set: {
      highActivityThreshold: input.highActivityThreshold,
      weeklySort: input.weeklySort,
      minimumActivity: input.minimumActivity,
      updatedAt: new Date(),
    },
  });
  const rows = await db.select().from(propertyEngagementSetting).where(eq(propertyEngagementSetting.ownerUserId, input.ownerUserId)).limit(1);
  return rows[0]!;
}

/** Returns every private program screen, merging stored values with reviewable defaults. */
export async function getProgramContributionLimits(ownerUserId: number): Promise<ProgramContributionLimitValues> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(programContributionLimit).where(eq(programContributionLimit.ownerUserId, ownerUserId));
  const stored = Object.fromEntries(rows.map((row) => [row.programKey, {
    percentBps: row.percentBps,
    dollarCap: row.dollarCapCents === null ? null : row.dollarCapCents / 100,
  }]));
  return normalizeProgramContributionLimitValues(stored);
}

/** Saves the private sales-price percentage and optional USD ceiling for each supported program screen. */
export async function saveProgramContributionLimits(input: { ownerUserId: number; limits: ProgramContributionLimitValues }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    for (const programKey of PROGRAM_CONTRIBUTION_LIMIT_KEYS) {
      const limit = input.limits[programKey];
      await tx.insert(programContributionLimit).values({
        ownerUserId: input.ownerUserId,
        programKey,
        percentBps: limit.percentBps,
        dollarCapCents: limit.dollarCap === null ? null : Math.round(limit.dollarCap * 100),
      }).onDuplicateKeyUpdate({
        set: {
          percentBps: limit.percentBps,
          dollarCapCents: limit.dollarCap === null ? null : Math.round(limit.dollarCap * 100),
          updatedAt: new Date(),
        },
      });
    }
  });
  return getProgramContributionLimits(input.ownerUserId);
}

export async function updatePropertyLandingPageAiSummary(input: { id: number; aiSummary: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(propertyLandingPage).set({ aiSummary: input.aiSummary, aiSummaryUpdatedAt: input.aiSummary ? new Date() : null }).where(eq(propertyLandingPage.id, input.id));
  const rows = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, input.id)).limit(1);
  if (!rows[0]) throw new Error("Property page not found.");
  return rows[0];
}

export async function listPropertyPageAgentEmailTemplates(includeArchived = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(propertyPageAgentEmailTemplate).where(includeArchived ? undefined : isNull(propertyPageAgentEmailTemplate.archivedAt)).orderBy(asc(propertyPageAgentEmailTemplate.name));
}

export async function createPropertyPageAgentEmailTemplate(input: { name: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(propertyPageAgentEmailTemplate).values(input);
  const rows = await db.select().from(propertyPageAgentEmailTemplate).where(eq(propertyPageAgentEmailTemplate.id, Number(result.insertId))).limit(1);
  return rows[0]!;
}

export async function updatePropertyPageAgentEmailTemplate(input: { id: number; name: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(propertyPageAgentEmailTemplate).set({ name: input.name, bodyTemplate: input.bodyTemplate, updatedAt: new Date() }).where(eq(propertyPageAgentEmailTemplate.id, input.id));
  if (!result[0].affectedRows) throw new Error("Property-page agent template not found.");
  const rows = await db.select().from(propertyPageAgentEmailTemplate).where(eq(propertyPageAgentEmailTemplate.id, input.id)).limit(1);
  return rows[0]!;
}

export async function setPropertyPageAgentEmailTemplateArchived(input: { id: number; archived: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(propertyPageAgentEmailTemplate).set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() }).where(eq(propertyPageAgentEmailTemplate.id, input.id));
  if (!result[0].affectedRows) throw new Error("Property-page agent template not found.");
}

export async function deletePropertyPageAgentEmailTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(propertyPageAgentEmailTemplate).where(eq(propertyPageAgentEmailTemplate.id, id));
  if (!result[0].affectedRows) throw new Error("Property-page agent template not found.");
}

/** Private dashboard templates for client-facing buyer calculation summary emails. */
export async function listPropertyPageBuyerEmailTemplates(ownerUserId: number, includeArchived = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(propertyPageBuyerEmailTemplate).where(and(eq(propertyPageBuyerEmailTemplate.ownerUserId, ownerUserId), includeArchived ? undefined : isNull(propertyPageBuyerEmailTemplate.archivedAt))).orderBy(asc(propertyPageBuyerEmailTemplate.name));
}

export async function createPropertyPageBuyerEmailTemplate(input: { ownerUserId: number; name: string; subjectTemplate: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(propertyPageBuyerEmailTemplate).values(input);
  const rows = await db.select().from(propertyPageBuyerEmailTemplate).where(eq(propertyPageBuyerEmailTemplate.id, Number(result.insertId))).limit(1);
  return rows[0]!;
}

export async function updatePropertyPageBuyerEmailTemplate(input: { ownerUserId: number; id: number; name: string; subjectTemplate: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(propertyPageBuyerEmailTemplate).set({ name: input.name, subjectTemplate: input.subjectTemplate, bodyTemplate: input.bodyTemplate, updatedAt: new Date() }).where(and(eq(propertyPageBuyerEmailTemplate.id, input.id), eq(propertyPageBuyerEmailTemplate.ownerUserId, input.ownerUserId)));
  if (!result[0].affectedRows) throw new Error("Buyer email template not found.");
  const rows = await db.select().from(propertyPageBuyerEmailTemplate).where(eq(propertyPageBuyerEmailTemplate.id, input.id)).limit(1);
  return rows[0]!;
}

export async function setPropertyPageBuyerEmailTemplateArchived(input: { ownerUserId: number; id: number; archived: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(propertyPageBuyerEmailTemplate).set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() }).where(and(eq(propertyPageBuyerEmailTemplate.id, input.id), eq(propertyPageBuyerEmailTemplate.ownerUserId, input.ownerUserId)));
  if (!result[0].affectedRows) throw new Error("Buyer email template not found.");
}

export async function deletePropertyPageBuyerEmailTemplate(input: { ownerUserId: number; id: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(propertyPageBuyerEmailTemplate).where(and(eq(propertyPageBuyerEmailTemplate.id, input.id), eq(propertyPageBuyerEmailTemplate.ownerUserId, input.ownerUserId)));
  if (!result[0].affectedRows) throw new Error("Buyer email template not found.");
}

/** Private reusable outreach templates for existing co-branded agents and loan officers. */
export async function listDirectoryOutreachEmailTemplates(input: { ownerUserId: number; audience: "agent" | "loan_officer"; includeArchived?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(directoryOutreachEmailTemplate).where(and(eq(directoryOutreachEmailTemplate.ownerUserId, input.ownerUserId), eq(directoryOutreachEmailTemplate.audience, input.audience), input.includeArchived ? undefined : isNull(directoryOutreachEmailTemplate.archivedAt))).orderBy(asc(directoryOutreachEmailTemplate.name));
}

export async function createDirectoryOutreachEmailTemplate(input: { ownerUserId: number; audience: "agent" | "loan_officer"; name: string; subjectTemplate: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(directoryOutreachEmailTemplate).values(input);
  const rows = await db.select().from(directoryOutreachEmailTemplate).where(and(eq(directoryOutreachEmailTemplate.id, Number(result.insertId)), eq(directoryOutreachEmailTemplate.ownerUserId, input.ownerUserId))).limit(1);
  return rows[0]!;
}

export async function updateDirectoryOutreachEmailTemplate(input: { ownerUserId: number; audience: "agent" | "loan_officer"; id: number; name: string; subjectTemplate: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(directoryOutreachEmailTemplate).set({ name: input.name, subjectTemplate: input.subjectTemplate, bodyTemplate: input.bodyTemplate, updatedAt: new Date() }).where(and(eq(directoryOutreachEmailTemplate.id, input.id), eq(directoryOutreachEmailTemplate.ownerUserId, input.ownerUserId), eq(directoryOutreachEmailTemplate.audience, input.audience)));
  if (!result[0].affectedRows) throw new Error("Directory outreach template not found.");
  const rows = await db.select().from(directoryOutreachEmailTemplate).where(and(eq(directoryOutreachEmailTemplate.id, input.id), eq(directoryOutreachEmailTemplate.ownerUserId, input.ownerUserId))).limit(1);
  return rows[0]!;
}

export async function setDirectoryOutreachEmailTemplateArchived(input: { ownerUserId: number; audience: "agent" | "loan_officer"; id: number; archived: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(directoryOutreachEmailTemplate).set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() }).where(and(eq(directoryOutreachEmailTemplate.id, input.id), eq(directoryOutreachEmailTemplate.ownerUserId, input.ownerUserId), eq(directoryOutreachEmailTemplate.audience, input.audience)));
  if (!result[0].affectedRows) throw new Error("Directory outreach template not found.");
}

export async function deleteDirectoryOutreachEmailTemplate(input: { ownerUserId: number; audience: "agent" | "loan_officer"; id: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(directoryOutreachEmailTemplate).where(and(eq(directoryOutreachEmailTemplate.id, input.id), eq(directoryOutreachEmailTemplate.ownerUserId, input.ownerUserId), eq(directoryOutreachEmailTemplate.audience, input.audience)));
  if (!result[0].affectedRows) throw new Error("Directory outreach template not found.");
}

export async function recordDirectoryOutreachDrafts(input: { ownerUserId: number; audience: "agent" | "loan_officer"; templateId?: number | null; recipients: Array<{ recipientId: number; recipientName: string }> }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!input.recipients.length) return;
  await db.insert(directoryOutreachDraft).values(input.recipients.map((recipient) => ({ ownerUserId: input.ownerUserId, audience: input.audience, templateId: input.templateId ?? null, ...recipient })));
}

export async function getDirectoryOutreachLastDrafts(input: { ownerUserId: number; audience: "agent" | "loan_officer" }) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ recipientId: directoryOutreachDraft.recipientId, lastDraftedAt: sql<Date>`max(${directoryOutreachDraft.createdAt})` }).from(directoryOutreachDraft).where(and(eq(directoryOutreachDraft.ownerUserId, input.ownerUserId), eq(directoryOutreachDraft.audience, input.audience))).groupBy(directoryOutreachDraft.recipientId);
  return rows.map((row) => ({ recipientId: row.recipientId, lastDraftedAt: row.lastDraftedAt }));
}

export async function listDirectoryFilterPresets(input: { ownerUserId: number; audience: "agent" | "loan_officer" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(directoryFilterPreset).where(and(eq(directoryFilterPreset.ownerUserId, input.ownerUserId), eq(directoryFilterPreset.audience, input.audience))).orderBy(asc(directoryFilterPreset.name));
}

export async function createDirectoryFilterPreset(input: { ownerUserId: number; audience: "agent" | "loan_officer"; name: string; searchQuery: string; sortOrder: "last_name" | "recent"; principalBrokerOnly?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(directoryFilterPreset).values({ ownerUserId: input.ownerUserId, audience: input.audience, name: input.name, searchQuery: input.searchQuery, sortOrder: input.sortOrder, principalBrokerOnly: input.principalBrokerOnly ? 1 : 0 });
  const rows = await db.select().from(directoryFilterPreset).where(and(eq(directoryFilterPreset.id, Number(result.insertId)), eq(directoryFilterPreset.ownerUserId, input.ownerUserId))).limit(1);
  return rows[0]!;
}

export async function deleteDirectoryFilterPreset(input: { ownerUserId: number; audience: "agent" | "loan_officer"; id: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(directoryFilterPreset).where(and(eq(directoryFilterPreset.id, input.id), eq(directoryFilterPreset.ownerUserId, input.ownerUserId), eq(directoryFilterPreset.audience, input.audience)));
  if (!result[0].affectedRows) throw new Error("Directory filter preset not found.");
}

/** Aggregates privacy-minimized Email PDF draft activity and post-draft captured leads by saved property page. */
export async function getPropertyEmailPdfSummaryEngagement(since: Date | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const emailCondition = since
    ? and(eq(propertyPageActivity.eventType, "email_pdf_summary"), gte(propertyPageActivity.createdAt, since))
    : eq(propertyPageActivity.eventType, "email_pdf_summary");
  const [pages, emailEvents, roadmapLeads, chatLeads] = await Promise.all([
    db.select({ id: propertyLandingPage.id, address: propertyLandingPage.address, slug: propertyLandingPage.slug }).from(propertyLandingPage).where(eq(propertyLandingPage.isActive, 1)),
    db.select({ propertyLandingPageId: propertyPageActivity.propertyLandingPageId, createdAt: propertyPageActivity.createdAt }).from(propertyPageActivity).where(emailCondition),
    db.select({ propertyPageId: leads.propertyPageId, createdAt: leads.createdAt }).from(leads).where(isNotNull(leads.propertyPageId)),
    db.select({ propertyPageId: chatIntakeLead.propertyPageId, completedAt: chatIntakeLead.completedAt }).from(chatIntakeLead).where(and(isNotNull(chatIntakeLead.propertyPageId), isNotNull(chatIntakeLead.completedAt))),
  ]);
  const eventsByPage = new Map<number, Date[]>();
  emailEvents.forEach((event) => {
    const events = eventsByPage.get(event.propertyLandingPageId) ?? [];
    events.push(event.createdAt);
    eventsByPage.set(event.propertyLandingPageId, events);
  });
  const leadsByPage = new Map<number, Date[]>();
  roadmapLeads.forEach((lead) => {
    if (!lead.propertyPageId) return;
    const rows = leadsByPage.get(lead.propertyPageId) ?? [];
    rows.push(lead.createdAt);
    leadsByPage.set(lead.propertyPageId, rows);
  });
  chatLeads.forEach((lead) => {
    if (!lead.propertyPageId || !lead.completedAt) return;
    const rows = leadsByPage.get(lead.propertyPageId) ?? [];
    rows.push(lead.completedAt);
    leadsByPage.set(lead.propertyPageId, rows);
  });
  const propertyPages = pages.map((page) => {
    const clicks = eventsByPage.get(page.id) ?? [];
    const firstClickAt = clicks.length ? new Date(Math.min(...clicks.map((value) => value.getTime()))) : null;
    const capturedLeadsAfterEmail = firstClickAt ? (leadsByPage.get(page.id) ?? []).filter((createdAt) => createdAt >= firstClickAt!).length : 0;
    return { ...page, emailPdfSummaryClicks: clicks.length, capturedLeadsAfterEmail };
  }).filter((page) => page.emailPdfSummaryClicks > 0).sort((left, right) => right.emailPdfSummaryClicks - left.emailPdfSummaryClicks || right.capturedLeadsAfterEmail - left.capturedLeadsAfterEmail || left.address.localeCompare(right.address));
  const emailPdfSummaryClicks = propertyPages.reduce((total, page) => total + page.emailPdfSummaryClicks, 0);
  const capturedLeadsAfterEmail = propertyPages.reduce((total, page) => total + page.capturedLeadsAfterEmail, 0);
  return { emailPdfSummaryClicks, capturedLeadsAfterEmail, propertyPages };
}

/** Aggregates privacy-minimized public calendar-button clicks by active saved property page. */
export async function getPropertyCalendarClickEngagement(since: Date | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const calendarCondition = since
    ? and(eq(propertyPageActivity.eventType, "calendar_click"), gte(propertyPageActivity.createdAt, since))
    : eq(propertyPageActivity.eventType, "calendar_click");
  const [pages, clickEvents] = await Promise.all([
    db.select({ id: propertyLandingPage.id, address: propertyLandingPage.address, slug: propertyLandingPage.slug }).from(propertyLandingPage).where(eq(propertyLandingPage.isActive, 1)),
    db.select({ propertyLandingPageId: propertyPageActivity.propertyLandingPageId }).from(propertyPageActivity).where(calendarCondition),
  ]);
  const clicksByPage = new Map<number, number>();
  clickEvents.forEach((event) => clicksByPage.set(event.propertyLandingPageId, (clicksByPage.get(event.propertyLandingPageId) ?? 0) + 1));
  const propertyPages = pages
    .map((page) => ({ ...page, calendarClicks: clicksByPage.get(page.id) ?? 0 }))
    .filter((page) => page.calendarClicks > 0)
    .sort((left, right) => right.calendarClicks - left.calendarClicks || left.address.localeCompare(right.address));
  return { calendarClicks: propertyPages.reduce((total, page) => total + page.calendarClicks, 0), propertyPages };
}

/**
 * Records that a dashboard user opened a listing-agent outreach mail draft.
 * The browser mail client performs the actual delivery, so this is presented as
 * dashboard-recorded outreach activity rather than delivery confirmation.
 */
export async function recordGeoSphereListingEmailActivity(input: {
  listingIds: number[];
  templateName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const sentAt = new Date();
  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: geosphereListing.id, emailResendCount: geosphereListing.emailResendCount, lastEmailSentAt: geosphereListing.lastEmailSentAt })
      .from(geosphereListing)
      .where(inArray(geosphereListing.id, input.listingIds));
    if (rows.length !== input.listingIds.length) {
      throw new Error("One or more selected saved listings are no longer available.");
    }
    await Promise.all(rows.map((row) => tx
      .update(geosphereListing)
      .set({
        lastEmailSentAt: sentAt,
        lastEmailTemplateName: input.templateName,
        emailResendCount: row.lastEmailSentAt ? row.emailResendCount + 1 : row.emailResendCount,
      })
      .where(eq(geosphereListing.id, row.id))
    ));
    return rows.map((row) => ({
      id: row.id,
      sentAt,
      wasResend: Boolean(row.lastEmailSentAt),
      emailResendCount: row.lastEmailSentAt ? row.emailResendCount + 1 : row.emailResendCount,
      templateName: input.templateName,
    }));
  });
  return result;
}

/** Reusable listing-agent outreach copy, with built-ins displayed before saved custom templates. */
export async function listListingAgentEmailTemplates(includeArchived = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(listingAgentEmailTemplate)
    .where(includeArchived ? undefined : isNull(listingAgentEmailTemplate.archivedAt))
    .orderBy(desc(listingAgentEmailTemplate.isBuiltIn), asc(listingAgentEmailTemplate.name));
}

/** Saves a reusable, dashboard-only custom listing-agent outreach body. */
export async function createListingAgentEmailTemplate(input: { name: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(listingAgentEmailTemplate).values({
    name: input.name,
    bodyTemplate: input.bodyTemplate,
    isBuiltIn: 0,
  });
  const rows = await db
    .select()
    .from(listingAgentEmailTemplate)
    .where(eq(listingAgentEmailTemplate.id, Number(result.insertId)))
    .limit(1);
  return rows[0]!;
}

export async function updateListingAgentEmailTemplate(input: { id: number; name: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(listingAgentEmailTemplate).set({ name: input.name, bodyTemplate: input.bodyTemplate, updatedAt: new Date() }).where(and(eq(listingAgentEmailTemplate.id, input.id), eq(listingAgentEmailTemplate.isBuiltIn, 0)));
  if (!result[0].affectedRows) throw new Error("Custom listing-agent template not found.");
  const rows = await db.select().from(listingAgentEmailTemplate).where(eq(listingAgentEmailTemplate.id, input.id)).limit(1);
  return rows[0]!;
}

export async function setListingAgentEmailTemplateArchived(input: { id: number; archived: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(listingAgentEmailTemplate).set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() }).where(and(eq(listingAgentEmailTemplate.id, input.id), eq(listingAgentEmailTemplate.isBuiltIn, 0)));
  if (!result[0].affectedRows) throw new Error("Custom listing-agent template not found.");
}

export async function deleteListingAgentEmailTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(listingAgentEmailTemplate).where(and(eq(listingAgentEmailTemplate.id, id), eq(listingAgentEmailTemplate.isBuiltIn, 0)));
  if (!result[0].affectedRows) throw new Error("Custom listing-agent template not found.");
}

/** Reusable buyer-facing property-list email introductions, ordered alphabetically for the dashboard selector. */
export async function listPropertyEmailTemplates(includeArchived = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(propertyEmailTemplate).where(includeArchived ? undefined : isNull(propertyEmailTemplate.archivedAt)).orderBy(asc(propertyEmailTemplate.name));
}

/** Saves a dashboard-only custom property-email introduction; automatic listing and signature sections remain separate. */
export async function createPropertyEmailTemplate(input: { name: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(propertyEmailTemplate).values(input);
  const rows = await db
    .select()
    .from(propertyEmailTemplate)
    .where(eq(propertyEmailTemplate.id, Number(result.insertId)))
    .limit(1);
  return rows[0]!;
}

export async function updatePropertyEmailTemplate(input: { id: number; name: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(propertyEmailTemplate).set({ name: input.name, bodyTemplate: input.bodyTemplate, updatedAt: new Date() }).where(eq(propertyEmailTemplate.id, input.id));
  if (!result[0].affectedRows) throw new Error("Property email template not found.");
  const rows = await db.select().from(propertyEmailTemplate).where(eq(propertyEmailTemplate.id, input.id)).limit(1);
  return rows[0]!;
}

export async function setPropertyEmailTemplateArchived(input: { id: number; archived: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(propertyEmailTemplate).set({ archivedAt: input.archived ? new Date() : null, updatedAt: new Date() }).where(eq(propertyEmailTemplate.id, input.id));
  if (!result[0].affectedRows) throw new Error("Property email template not found.");
}

export async function deletePropertyEmailTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(propertyEmailTemplate).where(eq(propertyEmailTemplate.id, id));
  if (!result[0].affectedRows) throw new Error("Property email template not found.");
}

const GEOSPHERE_SYNC_SETTING_ID = "geosphere-saved-listings";

export async function ensureGeoSphereSyncSetting() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(geosphereSyncSetting)
    .values({ id: GEOSPHERE_SYNC_SETTING_ID })
    .onDuplicateKeyUpdate({ set: { id: GEOSPHERE_SYNC_SETTING_ID } });
  return getGeoSphereSyncSetting();
}

export async function getGeoSphereSyncSetting() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(geosphereSyncSetting).where(eq(geosphereSyncSetting.id, GEOSPHERE_SYNC_SETTING_ID)).limit(1);
  return rows[0];
}

export async function getGeoSphereSyncSettingByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(geosphereSyncSetting)
    .where(eq(geosphereSyncSetting.scheduleCronTaskUid, taskUid))
    .limit(1);
  return rows[0];
}

export async function updateGeoSphereSyncSetting(values: Partial<typeof geosphereSyncSetting.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await ensureGeoSphereSyncSetting();
  return db.update(geosphereSyncSetting).set(values).where(eq(geosphereSyncSetting.id, GEOSPHERE_SYNC_SETTING_ID));
}
