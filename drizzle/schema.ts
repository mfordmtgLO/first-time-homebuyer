import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  /** Primary phone number captured with a Roadmap lead for agent follow-up. */
  phone: varchar("phone", { length: 40 }).default("").notNull(),
  /** Visitor affirmatively agreed to receive mortgage-inquiry text messages. */
  smsConsent: int("smsConsent").default(0).notNull(),
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
  /** Visitor explicitly chose Yes to the chat SMS consent question. */
  smsConsent: int("smsConsent").default(0).notNull(),
  smsConsentAt: timestamp("smsConsentAt"),
  agentId: int("agentId"),
  loanOfficerId: int("loanOfficerId"),
  /** Private admin follow-up notes; never shown to visitors. */
  notes: text("notes"),
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

/**
 * A dashboard-authored text campaign or individual message. All rows remain in
 * draft mode until a messaging provider is deliberately configured.
 */
export const textMessage = mysqlTable("text_message", {
  id: int("id").autoincrement().primaryKey(),
  body: text("body").notNull(),
  providerMode: mysqlEnum("providerMode", ["draft", "provider_setup_required", "sent", "failed"])
    .default("draft")
    .notNull(),
  providerName: varchar("providerName", { length: 80 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TextMessage = typeof textMessage.$inferSelect;
export type InsertTextMessage = typeof textMessage.$inferInsert;

/** One independently delivered recipient per dashboard-selected lead. */
export const textMessageRecipient = mysqlTable(
  "text_message_recipient",
  {
    id: int("id").autoincrement().primaryKey(),
    textMessageId: int("textMessageId").notNull(),
    sourceType: mysqlEnum("sourceType", ["roadmap", "chat"]).notNull(),
    sourceLeadId: int("sourceLeadId").notNull(),
    recipientName: varchar("recipientName", { length: 180 }).notNull(),
    recipientPhone: varchar("recipientPhone", { length: 40 }).notNull(),
    deliveryStatus: mysqlEnum("deliveryStatus", ["draft", "provider_setup_required", "sent", "failed", "opted_out"])
      .default("draft")
      .notNull(),
    providerMessageId: varchar("providerMessageId", { length: 160 }),
    deliveryDetail: text("deliveryDetail"),
    sentAt: timestamp("sentAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("text_message_recipient_message_idx").on(table.textMessageId),
    index("text_message_recipient_source_idx").on(table.sourceType, table.sourceLeadId),
  ]
);

export type TextMessageRecipient = typeof textMessageRecipient.$inferSelect;
export type InsertTextMessageRecipient = typeof textMessageRecipient.$inferInsert;

/** JPG attachments stored in S3 and associated with a saved dashboard draft. */
export const textMessageAttachment = mysqlTable(
  "text_message_attachment",
  {
    id: int("id").autoincrement().primaryKey(),
    textMessageId: int("textMessageId").notNull(),
    storageKey: varchar("storageKey", { length: 700 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    fileName: varchar("fileName", { length: 300 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("text_message_attachment_message_idx").on(table.textMessageId)]
);

export type TextMessageAttachment = typeof textMessageAttachment.$inferSelect;
export type InsertTextMessageAttachment = typeof textMessageAttachment.$inferInsert;

/**
 * Provider-synchronized individual SMS/MMS events. Draft messages remain in
 * text_message until an eventual provider integration records their real
 * outbound delivery here; received messages will also be stored here.
 */
export const textChainEvent = mysqlTable(
  "text_chain_event",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceType: mysqlEnum("sourceType", ["roadmap", "chat"]).notNull(),
    sourceLeadId: int("sourceLeadId").notNull(),
    direction: mysqlEnum("direction", ["incoming", "outgoing"]).notNull(),
    body: text("body").notNull(),
    eventStatus: mysqlEnum("eventStatus", ["queued", "sent", "delivered", "failed", "received", "opted_out"])
      .default("received")
      .notNull(),
    senderLabel: varchar("senderLabel", { length: 180 }),
    providerName: varchar("providerName", { length: 80 }),
    providerMessageId: varchar("providerMessageId", { length: 160 }),
    textMessageId: int("textMessageId"),
    textMessageRecipientId: int("textMessageRecipientId"),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("text_chain_event_source_time_idx").on(table.sourceType, table.sourceLeadId, table.occurredAt),
    index("text_chain_event_provider_id_idx").on(table.providerName, table.providerMessageId),
  ]
);

export type TextChainEvent = typeof textChainEvent.$inferSelect;
export type InsertTextChainEvent = typeof textChainEvent.$inferInsert;

/** Attachments associated with one provider-synchronized text-chain event. */
export const textChainAttachment = mysqlTable(
  "text_chain_attachment",
  {
    id: int("id").autoincrement().primaryKey(),
    textChainEventId: int("textChainEventId").notNull(),
    storageKey: varchar("storageKey", { length: 700 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    fileName: varchar("fileName", { length: 300 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("text_chain_attachment_event_idx").on(table.textChainEventId)]
);

export type TextChainAttachment = typeof textChainAttachment.$inferSelect;
export type InsertTextChainAttachment = typeof textChainAttachment.$inferInsert;

/**
 * One cache-only saved pull exported by GeoSphere. The source snapshot ID makes
 * imports idempotent while preserving every manually refreshed area pull.
 */
export const geosphereSavedPull = mysqlTable(
  "geosphere_saved_pull",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceSnapshotId: varchar("sourceSnapshotId", { length: 320 }).notNull(),
    cacheKey: varchar("cacheKey", { length: 320 }).notNull(),
    areaLabel: varchar("areaLabel", { length: 500 }).notNull(),
    city: varchar("city", { length: 180 }),
    county: varchar("county", { length: 180 }),
    zipCode: varchar("zipCode", { length: 24 }),
    state: varchar("state", { length: 8 }),
    sourceSavedAt: timestamp("sourceSavedAt"),
    listingCount: int("listingCount").default(0).notNull(),
    lmiCount: int("lmiCount").default(0).notNull(),
    usdaCount: int("usdaCount").default(0).notNull(),
    lmiUsdaCount: int("lmiUsdaCount").default(0).notNull(),
    importedAt: timestamp("importedAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("geosphere_saved_pull_source_snapshot_unique").on(table.sourceSnapshotId),
    index("geosphere_saved_pull_cache_key_idx").on(table.cacheKey),
    index("geosphere_saved_pull_area_idx").on(table.state, table.city, table.county),
  ]
);

export type GeoSphereSavedPull = typeof geosphereSavedPull.$inferSelect;
export type InsertGeoSphereSavedPull = typeof geosphereSavedPull.$inferInsert;

/** A normalized property from a saved GeoSphere snapshot, including overlay membership. */
export const geosphereListing = mysqlTable(
  "geosphere_listing",
  {
    id: int("id").autoincrement().primaryKey(),
    savedPullId: int("savedPullId").notNull(),
    listingKey: varchar("listingKey", { length: 320 }).notNull(),
    externalListingId: varchar("externalListingId", { length: 320 }),
    address: varchar("address", { length: 700 }).notNull(),
    price: int("price"),
    bedrooms: varchar("bedrooms", { length: 32 }),
    bathrooms: varchar("bathrooms", { length: 32 }),
    squareFootage: int("squareFootage"),
    propertyType: varchar("propertyType", { length: 160 }),
    latitude: varchar("latitude", { length: 48 }),
    longitude: varchar("longitude", { length: 48 }),
    isLmi: int("isLmi").default(0).notNull(),
    isUsda: int("isUsda").default(0).notNull(),
    sourceData: text("sourceData").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("geosphere_listing_pull_key_unique").on(table.savedPullId, table.listingKey),
    index("geosphere_listing_pull_overlay_idx").on(table.savedPullId, table.isLmi, table.isUsda),
    index("geosphere_listing_price_idx").on(table.price),
  ]
);

export type GeoSphereListing = typeof geosphereListing.$inferSelect;
export type InsertGeoSphereListing = typeof geosphereListing.$inferInsert;

/** Reusable listing-agent outreach copy. Built-in rows are seeded and protected from editing. */
export const listingAgentEmailTemplate = mysqlTable(
  "listing_agent_email_template",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    bodyTemplate: text("bodyTemplate").notNull(),
    isBuiltIn: int("isBuiltIn").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("listing_agent_email_template_name_unique").on(table.name)]
);

export type ListingAgentEmailTemplate = typeof listingAgentEmailTemplate.$inferSelect;
export type InsertListingAgentEmailTemplate = typeof listingAgentEmailTemplate.$inferInsert;

/** Persistent ownership state for the project-level GeoSphere weekly sync job. */
export const geosphereSyncSetting = mysqlTable(
  "geosphere_sync_setting",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    lastSyncedAt: timestamp("lastSyncedAt"),
    lastError: text("lastError"),
    lastPullCount: int("lastPullCount").default(0).notNull(),
    lastListingCount: int("lastListingCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("geosphere_sync_setting_task_uid_idx").on(table.scheduleCronTaskUid)]
);

export type GeoSphereSyncSetting = typeof geosphereSyncSetting.$inferSelect;
