import { and, asc, desc, eq, getTableColumns, inArray, isNotNull, ne, sql } from "drizzle-orm";
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
  propertyEmailTemplate,
  propertyPageAgentEmailTemplate,
  leads,
  loanOfficer,
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
  type InsertGeoSphereListing,
} from "../drizzle/schema";
import { buildPropertyLandingSnapshot, slugifyPropertyAddress } from "../shared/propertyLandingPage";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

export async function insertLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db.insert(leads).values(lead);
}

export async function listLeads() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db
    .select({
      ...getTableColumns(leads),
      loanOfficerName: loanOfficer.name,
      loanOfficerSlug: loanOfficer.slug,
      agentName: agentProfile.name,
      agentSlug: agentProfile.slug,
      propertyPageAddress: propertyLandingPage.address,
      propertyPageSlug: propertyLandingPage.slug,
    })
    .from(leads)
    .leftJoin(loanOfficer, eq(leads.loanOfficerId, loanOfficer.id))
    .leftJoin(agentProfile, eq(leads.agentId, agentProfile.id))
    .leftJoin(propertyLandingPage, eq(leads.propertyPageId, propertyLandingPage.id))
    .orderBy(leads.createdAt);
}

export async function updateLeadStatus(
  id: number,
  status: "new" | "contacted" | "booked"
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db.update(leads).set({ status }).where(eq(leads.id, id));
}

export async function updateLeadNotes(id: number, notes: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  return db.update(leads).set({ notes }).where(eq(leads.id, id));
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

export async function listChatIntakeLeads() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({
      lead: chatIntakeLead,
      loanOfficerName: loanOfficer.name,
      loanOfficerSlug: loanOfficer.slug,
      agentName: agentProfile.name,
      agentSlug: agentProfile.slug,
      propertyPageAddress: propertyLandingPage.address,
      propertyPageSlug: propertyLandingPage.slug,
    })
    .from(chatIntakeLead)
    .leftJoin(loanOfficer, eq(chatIntakeLead.loanOfficerId, loanOfficer.id))
    .leftJoin(agentProfile, eq(chatIntakeLead.agentId, agentProfile.id))
    .leftJoin(propertyLandingPage, eq(chatIntakeLead.propertyPageId, propertyLandingPage.id))
    .orderBy(desc(chatIntakeLead.updatedAt));

  return rows.map(({ lead, loanOfficerName, loanOfficerSlug, agentName, agentSlug, propertyPageAddress, propertyPageSlug }) => ({
    ...lead,
    loanOfficerName: loanOfficerName ?? null,
    loanOfficerSlug: loanOfficerSlug ?? null,
    agentName: agentName ?? null,
    agentSlug: agentSlug ?? null,
    propertyPageAddress: propertyPageAddress ?? null,
    propertyPageSlug: propertyPageSlug ?? null,
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
 * are represented as outgoing provider-setup entries, then future webhook
 * events are merged in chronological order as real SMS/MMS is synchronized.
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

/** Provider integration hook for future inbound and outbound SMS/MMS synchronization. */
export async function recordTextChainEvent(input: {
  sourceType: "roadmap" | "chat";
  sourceLeadId: number;
  direction: "incoming" | "outgoing";
  body: string;
  eventStatus: "queued" | "sent" | "delivered" | "failed" | "received" | "opted_out";
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
  const [result] = await db.insert(textChainEvent).values({
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
  const snapshot = buildPropertyLandingSnapshot(row.listing, row.sourceSavedAt);
  const existing = await db
    .select()
    .from(propertyLandingPage)
    .where(eq(propertyLandingPage.geosphereListingId, input.geosphereListingId))
    .limit(1);
  if (existing[0]) {
    await db
      .update(propertyLandingPage)
      .set({
        loanOfficerId: input.loanOfficerId,
        agentId: input.agentId,
        address: snapshot.address,
        listingSnapshot: JSON.stringify(snapshot),
        sourceSavedAt: row.sourceSavedAt ?? null,
        isActive: 1,
      })
      .where(eq(propertyLandingPage.id, existing[0].id));
    return { ...existing[0], loanOfficerId: input.loanOfficerId, agentId: input.agentId, address: snapshot.address, listingSnapshot: JSON.stringify(snapshot), sourceSavedAt: row.sourceSavedAt ?? null, isActive: 1 };
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
    sourceSavedAt: row.sourceSavedAt ?? null,
    isActive: 1,
  });
  const created = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, Number(result.insertId))).limit(1);
  return created[0]!;
}

export async function listPropertyLandingPages() {
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

export type PropertyPageActivityType = "page_view" | "buydown_calculator" | "cost_of_waiting_calculator" | "roadmap_request" | "chat_started" | "chat_completed" | "homes_list_request" | "buyer_agent_request" | "social_share" | "print_export";

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

export async function listPropertyPageActivity(propertyLandingPageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(propertyPageActivity)
    .where(eq(propertyPageActivity.propertyLandingPageId, propertyLandingPageId))
    .orderBy(desc(propertyPageActivity.createdAt), desc(propertyPageActivity.id))
    .limit(100);
}

export async function updatePropertyLandingPageAiSummary(input: { id: number; aiSummary: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(propertyLandingPage).set({ aiSummary: input.aiSummary, aiSummaryUpdatedAt: input.aiSummary ? new Date() : null }).where(eq(propertyLandingPage.id, input.id));
  const rows = await db.select().from(propertyLandingPage).where(eq(propertyLandingPage.id, input.id)).limit(1);
  if (!rows[0]) throw new Error("Property page not found.");
  return rows[0];
}

export async function listPropertyPageAgentEmailTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(propertyPageAgentEmailTemplate).orderBy(asc(propertyPageAgentEmailTemplate.name));
}

export async function createPropertyPageAgentEmailTemplate(input: { name: string; bodyTemplate: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(propertyPageAgentEmailTemplate).values(input);
  const rows = await db.select().from(propertyPageAgentEmailTemplate).where(eq(propertyPageAgentEmailTemplate.id, Number(result.insertId))).limit(1);
  return rows[0]!;
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
export async function listListingAgentEmailTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(listingAgentEmailTemplate)
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

/** Reusable buyer-facing property-list email introductions, ordered alphabetically for the dashboard selector. */
export async function listPropertyEmailTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(propertyEmailTemplate).orderBy(asc(propertyEmailTemplate.name));
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
