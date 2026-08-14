import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
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
  createAgent,
  createLoanOfficer,
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
  listGeoSphereListings,
  listGeoSphereSavedPulls,
  loanOfficerSlugTaken,
  recordChatIntakeResendAttempt,
  insertLead,
  listAgents,
  listChatIntakeLeads,
  listLoanOfficers,
  listLeads,
  listTextMessageDrafts,
  listTextReadyRecipients,
  markLeadSentToAgent,
  setFeaturedAgent,
  setFeaturedLoanOfficer,
  slugTaken,
  updateAgent,
  updateChatLead,
  updateLeadAgent,
  updateLeadStatus,
  updateLeadNotes,
  updateLoanOfficer,
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

const ADMIN_ONLY_MESSAGE = "Only the site owner can manage agents.";

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
  companyName: z.string().trim().max(200).default(""),
  headshotUrl: z.string().trim().max(500).default(""),
  companyLogoUrl: z.string().trim().max(500).default(""),
  visible: z.boolean().default(true),
});

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

const chatSessionSchema = z.string().trim().min(12).max(72);

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

function buildChatAgentMailto(lead: CompletedChatIntake, agent: { name: string; email: string }, coBrandedSourceUrl: string | null) {
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
    coBrandedAgentName: agent.name,
    coBrandedSourceUrl,
  });
  return `mailto:${agent.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
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
          source: z.string().trim().max(64).optional(),
          scenario: buydownScenarioSchema.optional(),
          costOfWaiting: costOfWaitingScenarioSchema.optional(),
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

        await insertLead({
          firstName: input.firstName,
          email: input.email,
          phone: input.phone,
          smsConsent: 1,
          source: input.source ?? "roadmap",
          scenario: scenarioPayload,
          agentId,
          loanOfficerId,
          agentSource: agentId !== undefined ? "link" : undefined,
        });

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
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the site owner can view leads.",
        });
      }
      return listLeads();
    }),
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["new", "contacted", "booked"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the site owner can update leads.",
          });
        }
        await updateLeadStatus(input.id, input.status);
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
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the site owner can update leads.",
          });
        }
        await updateLeadNotes(input.id, input.notes);
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
          };
        }

        let agent: Awaited<ReturnType<typeof getAgentBySlug>> | undefined;
        let officer = defaultOfficer;
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
        });
        await addChatTranscript(Number(leadId), "assistant", greeting);

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
          return { completed: true as const, currentStep: "complete" as const, message: completion };
        }

        await updateChatLead(lead.id, { ...persistedPatch, currentStep: parsed.nextStep });
        await addChatTranscript(lead.id, "assistant", parsed.response);
        return { completed: false as const, currentStep: parsed.nextStep, message: parsed.response };
      }),
    /** Admin-only list used by the dashboard's chat-intake review panel. */
    list: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return listChatIntakeLeads();
    }),
    /** Admin-only transcript view for a single chat intake. */
    transcript: protectedProcedure
      .input(z.object({ chatLeadId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        return getChatTranscriptByLeadId(input.chatLeadId);
      }),
    /** Admin-only private follow-up notes for a chat intake. */
    updateNotes: protectedProcedure
      .input(z.object({ chatLeadId: z.number().int().positive(), notes: z.string().max(5000) }))
      .mutation(async ({ ctx, input }) => {
        requireAdmin(ctx.user.role);
        const lead = await getChatLeadById(input.chatLeadId);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Mortgage intake not found." });
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
    /** Admin-only provider state. Delivery remains disabled until credentials are intentionally configured. */
    status: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx.user.role);
      return {
        providerConfigured: false as const,
        mode: "provider_setup_required" as const,
        detail: "No SMS/MMS provider is configured. You can select consented leads, upload JPG attachments, and save drafts, but no text messages will be sent.",
      };
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
        if (buffer.length === 0 || buffer.length > 4_000_000) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "JPG must be no larger than 4MB." });
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
        const slug = await resolveUniqueSlug(input.slug, input.name);
        const id = await createAgent({
          name: input.name,
          slug,
          email: input.email,
          phone: input.phone,
          bio: input.bio,
          website: input.website,
          companyName: input.companyName,
          headshotUrl: input.headshotUrl,
          companyLogoUrl: input.companyLogoUrl,
          visible: input.visible ? 1 : 0,
        });
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
          companyName: input.companyName,
          headshotUrl: input.headshotUrl,
          companyLogoUrl: input.companyLogoUrl,
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
