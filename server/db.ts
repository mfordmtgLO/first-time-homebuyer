import { and, desc, eq, getTableColumns, isNotNull, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  agentProfile,
  chatIntakeLead,
  chatTranscript,
  leads,
  loanOfficer,
  users,
  type InsertAgentProfile,
  type InsertChatIntakeLead,
  type InsertLoanOfficer,
  type InsertLead,
} from "../drizzle/schema";
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
    })
    .from(leads)
    .leftJoin(loanOfficer, eq(leads.loanOfficerId, loanOfficer.id))
    .leftJoin(agentProfile, eq(leads.agentId, agentProfile.id))
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
    })
    .from(chatIntakeLead)
    .leftJoin(loanOfficer, eq(chatIntakeLead.loanOfficerId, loanOfficer.id))
    .leftJoin(agentProfile, eq(chatIntakeLead.agentId, agentProfile.id))
    .orderBy(desc(chatIntakeLead.updatedAt));

  return rows.map(({ lead, loanOfficerName, loanOfficerSlug, agentName, agentSlug }) => ({
    ...lead,
    loanOfficerName: loanOfficerName ?? null,
    loanOfficerSlug: loanOfficerSlug ?? null,
    agentName: agentName ?? null,
    agentSlug: agentSlug ?? null,
    isCoBranded: Boolean(lead.loanOfficerId && lead.agentId),
  }));
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
