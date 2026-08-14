import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getChatLeadBySession: vi.fn(async () => undefined),
    getChatLeadById: vi.fn(async () => undefined),
    recordChatIntakeResendAttempt: vi.fn(async () => undefined),
    createChatLead: vi.fn(async () => 99),
    updateChatLead: vi.fn(async () => undefined),
    addChatTranscript: vi.fn(async () => undefined),
    getChatTranscriptByLeadId: vi.fn(async () => []),
    listChatIntakeLeads: vi.fn(async () => []),
    getFeaturedLoanOfficer: vi.fn(async () => undefined),
    getLoanOfficerById: vi.fn(async () => undefined),
    listLoanOfficers: vi.fn(async () => []),
    createLoanOfficer: vi.fn(async () => 1),
    updateLoanOfficer: vi.fn(async () => undefined),
    deleteLoanOfficer: vi.fn(async () => undefined),
    setFeaturedLoanOfficer: vi.fn(async () => undefined),
    getAgentById: vi.fn(async () => undefined),
    getAgentBySlug: vi.fn(async () => undefined),
  };
});

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn(async () => true) }));
vi.mock("./email", () => ({
  sendChatIntakeNotification: vi.fn(async () => ({ sent: true })),
  buildChatIntakeNotification: vi.fn(() => ({ subject: "Chat intake", text: "Chat intake details" })),
}));

import { appRouter } from "./routers";
import {
  addChatTranscript,
  createChatLead,
  getChatLeadBySession,
  getChatLeadById,
  listChatIntakeLeads,
  recordChatIntakeResendAttempt,
  getFeaturedLoanOfficer,
  getAgentById,
  getLoanOfficerById,
  updateChatLead,
} from "./db";
import { sendChatIntakeNotification } from "./email";
import type { TrpcContext } from "./_core/context";

const getChatLeadBySessionMock = vi.mocked(getChatLeadBySession);
const getChatLeadByIdMock = vi.mocked(getChatLeadById);
const listChatIntakeLeadsMock = vi.mocked(listChatIntakeLeads);
const recordChatIntakeResendAttemptMock = vi.mocked(recordChatIntakeResendAttempt);
const createChatLeadMock = vi.mocked(createChatLead);
const updateChatLeadMock = vi.mocked(updateChatLead);
const addChatTranscriptMock = vi.mocked(addChatTranscript);
const getFeaturedLoanOfficerMock = vi.mocked(getFeaturedLoanOfficer);
const getLoanOfficerByIdMock = vi.mocked(getLoanOfficerById);
const getAgentByIdMock = vi.mocked(getAgentById);
const sendChatIntakeNotificationMock = vi.mocked(sendChatIntakeNotification);

function context(role: "admin" | "user" | null): TrpcContext {
  return {
    user: role
      ? {
          id: 1,
          openId: `test-${role}`,
          email: `${role}@example.com`,
          name: "Tester",
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const OFFICER = {
  id: 5,
  name: "Mike Ford",
  email: "mford@cfmtg.com",
  phone: "(541) 729-0819",
  nmls: "288455",
  title: "Loan Officer",
  visible: 1,
  featured: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PHONE_STEP_LEAD = {
  id: 99,
  sessionId: "chat-session-1234567890",
  status: "incomplete" as const,
  currentStep: "phone",
  loanPurpose: "refinance" as const,
  propertyType: "Single-Family",
  propertyValue: 450000,
  creditRange: "Good 660-719",
  annualIncome: 120000,
  downPayment: 45000,
  loanAmount: 405000,
  lowDownPaymentHomeSearch: null,
  searchAreaType: null,
  targetArea: null,
  fullName: "Sarah Chen",
  email: "sarah@example.com",
  phone: null,
  smsConsent: 0,
  smsConsentAt: null,
  agentId: null,
  loanOfficerId: 5,
  recipientEmailStatus: "not_attempted" as const,
  recipientEmailDetail: null,
  resendCount: 0,
  lastResentAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  getChatLeadBySessionMock.mockResolvedValue(undefined);
  getChatLeadByIdMock.mockResolvedValue(undefined);
  recordChatIntakeResendAttemptMock.mockResolvedValue(undefined as never);
  createChatLeadMock.mockResolvedValue(99 as never);
  getFeaturedLoanOfficerMock.mockResolvedValue(OFFICER as never);
  getLoanOfficerByIdMock.mockResolvedValue(OFFICER as never);
  getAgentByIdMock.mockResolvedValue(undefined);
});

describe("chat intake router", () => {
  it("starts a public incomplete session and records the opening assistant message", async () => {
    const caller = appRouter.createCaller(context(null));
    const result = await caller.chat.start({ sessionId: "chat-session-1234567890" });
    expect(result.status).toBe("incomplete");
    expect(result.officer.name).toBe("Mike Ford");
    expect(result.messages[0]?.content).toContain("purchase");
    expect(createChatLeadMock).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "chat-session-1234567890", loanOfficerId: 5 }));
    expect(addChatTranscriptMock).toHaveBeenCalledWith(99, "assistant", expect.stringContaining("Mike Ford"));
  });

  it("marks a completed contact capture as qualified and saves a completion timestamp", async () => {
    getChatLeadBySessionMock.mockResolvedValue({ ...PHONE_STEP_LEAD, currentStep: "sms_consent", phone: "(541) 555-0101" } as never);
    const caller = appRouter.createCaller(context(null));
    const result = await caller.chat.answer({ sessionId: "chat-session-1234567890", message: "Yes" });
    expect(result.completed).toBe(true);
    expect(result.message).toContain("within 24 business hours");
    expect(updateChatLeadMock).toHaveBeenCalledWith(99, expect.objectContaining({ status: "qualified", currentStep: "complete", smsConsent: 1, smsConsentAt: expect.any(Date), completedAt: expect.any(Date) }));
    expect(sendChatIntakeNotificationMock).toHaveBeenCalledWith(expect.objectContaining({ recipientEmail: "mford@cfmtg.com", recipientRole: "loan_officer", fullName: "Sarah Chen" }));
  });

  it("notifies a co-branded agent as well as the selected loan officer", async () => {
    getChatLeadBySessionMock.mockResolvedValue({ ...PHONE_STEP_LEAD, agentId: 17, currentStep: "sms_consent", phone: "(541) 555-0101" } as never);
    getAgentByIdMock.mockResolvedValue({
      id: 17,
      name: "Kaandice McLean",
      slug: "kaandice-mclean",
      email: "kaandice@example.com",
      phone: "(541) 555-0117",
      bio: "",
      website: "",
      companyName: "Cooley Real Estate Group",
      headshotUrl: "",
      companyLogoUrl: "",
      visible: 1,
      featured: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const caller = appRouter.createCaller(context(null));
    await caller.chat.answer({ sessionId: "chat-session-1234567890", message: "Yes" });
    expect(sendChatIntakeNotificationMock).toHaveBeenCalledTimes(2);
    expect(sendChatIntakeNotificationMock).toHaveBeenCalledWith(expect.objectContaining({ recipientEmail: "kaandice@example.com", recipientRole: "agent", coBrandedAgentName: "Kaandice McLean" }));
  });

  it("asks purchase leads about a low/no-down-payment home search and captures the target area before completion", async () => {
    const phoneLead = { ...PHONE_STEP_LEAD, loanPurpose: "purchase" as const };
    getChatLeadBySessionMock.mockResolvedValueOnce(phoneLead as never);
    const caller = appRouter.createCaller(context(null));
    await expect(caller.chat.answer({ sessionId: "chat-session-1234567890", message: "(541) 555-0101" })).resolves.toMatchObject({ completed: false, currentStep: "sms_consent" });

    getChatLeadBySessionMock.mockResolvedValueOnce({ ...phoneLead, currentStep: "sms_consent", phone: "(541) 555-0101" } as never);
    await expect(caller.chat.answer({ sessionId: "chat-session-1234567890", message: "Yes" })).resolves.toMatchObject({ completed: false, currentStep: "home_search_interest" });

    getChatLeadBySessionMock.mockResolvedValueOnce({ ...phoneLead, currentStep: "home_search_interest", phone: "(541) 555-0101", smsConsent: 1 } as never);
    await expect(caller.chat.answer({ sessionId: "chat-session-1234567890", message: "Yes" })).resolves.toMatchObject({ completed: false, currentStep: "search_area_type" });

    getChatLeadBySessionMock.mockResolvedValueOnce({ ...phoneLead, currentStep: "search_area_type", phone: "(541) 555-0101", smsConsent: 1, lowDownPaymentHomeSearch: 1 } as never);
    await expect(caller.chat.answer({ sessionId: "chat-session-1234567890", message: "County" })).resolves.toMatchObject({ completed: false, currentStep: "target_area" });

    getChatLeadBySessionMock.mockResolvedValueOnce({ ...phoneLead, currentStep: "target_area", phone: "(541) 555-0101", smsConsent: 1, lowDownPaymentHomeSearch: 1, searchAreaType: "County" } as never);
    await expect(caller.chat.answer({ sessionId: "chat-session-1234567890", message: "Eugene and Springfield" })).resolves.toMatchObject({ completed: true, currentStep: "complete" });
    expect(sendChatIntakeNotificationMock).toHaveBeenCalledWith(expect.objectContaining({ lowDownPaymentHomeSearch: 1, searchAreaType: "County", targetArea: "Eugene and Springfield" }));
  });

  it("records an admin-visible manual follow-up state when recipient email delivery is unavailable", async () => {
    getChatLeadBySessionMock.mockResolvedValue({ ...PHONE_STEP_LEAD, currentStep: "sms_consent", phone: "(541) 555-0101" } as never);
    sendChatIntakeNotificationMock.mockResolvedValueOnce({ sent: false, reason: "unverified_domain" });
    const caller = appRouter.createCaller(context(null));
    await caller.chat.answer({ sessionId: "chat-session-1234567890", message: "Yes" });
    expect(updateChatLeadMock).toHaveBeenLastCalledWith(99, expect.objectContaining({
      recipientEmailStatus: "manual_follow_up",
      recipientEmailDetail: expect.stringContaining("unverified_domain"),
    }));
  });

  it("keeps chat lead review restricted to the admin", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.chat.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to save private follow-up notes on a chat intake", async () => {
    getChatLeadByIdMock.mockResolvedValue(PHONE_STEP_LEAD as never);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.chat.updateNotes({ chatLeadId: 99, notes: "Call Friday after reviewing payment options." })).resolves.toEqual({ success: true });
    expect(updateChatLeadMock).toHaveBeenCalledWith(99, { notes: "Call Friday after reviewing payment options." });
  });

  it("returns saved LO-agent co-branded attribution to the admin chat intake list", async () => {
    listChatIntakeLeadsMock.mockResolvedValue([{
      ...PHONE_STEP_LEAD,
      loanOfficerName: "Mike Ford",
      loanOfficerSlug: "mike-ford",
      agentName: "Kaandice McLean",
      agentSlug: "kaandice-mclean",
      isCoBranded: true,
    }] as never);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.chat.list()).resolves.toEqual([expect.objectContaining({
      loanOfficerName: "Mike Ford",
      agentName: "Kaandice McLean",
      isCoBranded: true,
    })]);
  });

  it("allows an admin to resend a completed intake to its selected recipients", async () => {
    getChatLeadByIdMock.mockResolvedValue({ ...PHONE_STEP_LEAD, status: "qualified" } as never);
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.chat.resend({ chatLeadId: 99 })).resolves.toMatchObject({ recipientEmailStatus: "sent" });
    expect(recordChatIntakeResendAttemptMock).toHaveBeenCalledWith(99);
    expect(sendChatIntakeNotificationMock).toHaveBeenCalledWith(expect.objectContaining({ recipientEmail: "mford@cfmtg.com", recipientRole: "loan_officer" }));
  });

  it("allows an admin to assign an agent and opens a fallback draft when direct chat-agent delivery is unavailable", async () => {
    const agent = { id: 17, name: "Kaandice McLean", email: "kaandice@example.com", visible: 1 };
    getChatLeadByIdMock.mockResolvedValue({ ...PHONE_STEP_LEAD, agentId: 17 } as never);
    getAgentByIdMock.mockResolvedValue(agent as never);
    sendChatIntakeNotificationMock.mockResolvedValueOnce({ sent: false, reason: "not_configured" });
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.chat.assignAgent({ chatLeadId: 99, agentId: 17 })).resolves.toEqual({ success: true });
    expect(updateChatLeadMock).toHaveBeenCalledWith(99, { agentId: 17 });
    await expect(caller.chat.sendToAgent({ chatLeadId: 99 })).resolves.toMatchObject({ sent: false, reason: "not_configured", mailto: expect.stringMatching(/^mailto:kaandice@example\.com\?subject=/) });
    expect(recordChatIntakeResendAttemptMock).toHaveBeenCalledWith(99);
  });

  it("keeps manual resend restricted to the admin", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.chat.resend({ chatLeadId: 99 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
