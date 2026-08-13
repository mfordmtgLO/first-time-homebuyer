import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Roadmap lead capture — stores submissions from the landing page lead form.
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  source: varchar("source", { length: 64 }).default("roadmap").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "booked"]).default("new").notNull(),
  notes: text("notes"),
  /** JSON snapshot of the 2-1 buydown calculator scenario the visitor ran, if any. */
  scenario: text("scenario"),
  /** Co-marketing agent this lead is assigned to (or auto-tagged from a /with/:slug page). */
  agentId: int("agentId"),
  /** Loan officer selected by a paired /with/:loanOfficerSlug/:agentSlug co-branded page. */
  loanOfficerId: int("loanOfficerId"),
  /**
   * How the lead got its agent: "link" = submitted via the agent's /with/:slug
   * co-branded page; "manual" = assigned from the dashboard. Null when no agent.
   */
  agentSource: mysqlEnum("agentSource", ["link", "manual"]),
  /** ISO timestamp of the last "Send to agent" referral email, null if never sent. */
  sentToAgentAt: timestamp("sentToAgentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Co-marketing real estate agent profiles, editable from the /leads dashboard.
 * Unlimited rows; each agent has a unique URL slug so the landing page can be
 * co-branded per agent at /with/:slug. The default landing page (/) shows the
 * "Local Real Estate Agent" section only for the agent marked `featured`.
 */
export const agentProfile = mysqlTable("agent_profile", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).default("").notNull(),
  /** URL-safe unique identifier used in /with/:slug co-branded links. */
  slug: varchar("slug", { length: 160 }).default("").notNull(),
  email: varchar("email", { length: 320 }).default("").notNull(),
  phone: varchar("phone", { length: 40 }).default("").notNull(),
  bio: text("bio"),
  website: varchar("website", { length: 500 }).default("").notNull(),
  companyName: varchar("companyName", { length: 200 }).default("").notNull(),
  /** /manus-storage/... URL of the uploaded headshot image. */
  headshotUrl: varchar("headshotUrl", { length: 500 }).default("").notNull(),
  /** /manus-storage/... URL of the uploaded company logo image. */
  companyLogoUrl: varchar("companyLogoUrl", { length: 500 }).default("").notNull(),
  visible: int("visible").default(1).notNull(),
  /** 1 = show this agent on the default landing page (/). At most one featured agent. */
  featured: int("featured").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentProfile = typeof agentProfile.$inferSelect;
export type InsertAgentProfile = typeof agentProfile.$inferInsert;

/**
 * Loan officers shown in the public Mortgage Intake Specialist widget. One
 * officer may be featured at a time; the model supports additional officers as
 * the business grows.
 */
export const loanOfficer = mysqlTable("loan_officer", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).default("").notNull(),
  /** URL-safe public identifier for loan-officer and paired co-marketing pages. */
  slug: varchar("slug", { length: 160 }).default("").notNull(),
  email: varchar("email", { length: 320 }).default("").notNull(),
  phone: varchar("phone", { length: 40 }).default("").notNull(),
  nmls: varchar("nmls", { length: 40 }).default("").notNull(),
  title: varchar("title", { length: 120 }).default("Loan Officer").notNull(),
  companyName: varchar("companyName", { length: 200 }).default("").notNull(),
  bio: text("bio"),
  website: varchar("website", { length: 500 }).default("").notNull(),
  /** /manus-storage/... URL of the LO headshot shown on their co-branded page. */
  headshotUrl: varchar("headshotUrl", { length: 500 }).default("").notNull(),
  /** /manus-storage/... URL of the LO company logo shown on their co-branded page. */
  companyLogoUrl: varchar("companyLogoUrl", { length: 500 }).default("").notNull(),
  /** Optional saved agent partner for this LO's unique public co-branded link. */
  agentId: int("agentId"),
  visible: int("visible").default(1).notNull(),
  featured: int("featured").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoanOfficer = typeof loanOfficer.$inferSelect;
export type InsertLoanOfficer = typeof loanOfficer.$inferInsert;

/**
 * A resumable mortgage-intake session. It intentionally records an incomplete
 * status as soon as a visitor starts the conversation, then becomes qualified
 * only after the requested contact and financial planning fields are supplied.
 */
export const chatIntakeLead = mysqlTable("chat_intake_lead", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 72 }).notNull().unique(),
  status: mysqlEnum("status", ["incomplete", "qualified"]).default("incomplete").notNull(),
  currentStep: varchar("currentStep", { length: 64 }).default("loan_purpose").notNull(),
  loanPurpose: mysqlEnum("loanPurpose", ["purchase", "refinance"]),
  propertyType: varchar("propertyType", { length: 80 }),
  propertyValue: int("propertyValue"),
  creditRange: varchar("creditRange", { length: 80 }),
  annualIncome: int("annualIncome"),
  downPayment: int("downPayment"),
  loanAmount: int("loanAmount"),
  lowDownPaymentHomeSearch: int("lowDownPaymentHomeSearch"),
  searchAreaType: varchar("searchAreaType", { length: 16 }),
  targetArea: varchar("targetArea", { length: 240 }),
  fullName: varchar("fullName", { length: 180 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  agentId: int("agentId"),
  loanOfficerId: int("loanOfficerId"),
  recipientEmailStatus: mysqlEnum("recipientEmailStatus", ["not_attempted", "sent", "manual_follow_up"])
    .default("not_attempted")
    .notNull(),
  recipientEmailDetail: text("recipientEmailDetail"),
  resendCount: int("resendCount").default(0).notNull(),
  lastResentAt: timestamp("lastResentAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatIntakeLead = typeof chatIntakeLead.$inferSelect;
export type InsertChatIntakeLead = typeof chatIntakeLead.$inferInsert;

/** Full audit trail for every visitor and assistant turn in a chat intake. */
export const chatTranscript = mysqlTable("chat_transcript", {
  id: int("id").autoincrement().primaryKey(),
  chatLeadId: int("chatLeadId").notNull(),
  role: mysqlEnum("role", ["assistant", "user", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatTranscript = typeof chatTranscript.$inferSelect;
export type InsertChatTranscript = typeof chatTranscript.$inferInsert;
