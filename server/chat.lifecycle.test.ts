import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredLead = {
  id: number;
  sessionId: string;
  status: "incomplete" | "qualified";
  currentStep: string;
  loanPurpose: "purchase" | "refinance" | null;
  propertyType: string | null;
  propertyValue: number | null;
  creditRange: string | null;
  annualIncome: number | null;
  downPayment: number | null;
  loanAmount: number | null;
  lowDownPaymentHomeSearch: number | null;
  targetArea: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  agentId: number | null;
  loanOfficerId: number | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const state: { lead: StoredLead | undefined; transcript: Array<{ id: number; chatLeadId: number; role: "assistant" | "user" | "system"; content: string; createdAt: Date }> } = { lead: undefined, transcript: [] };

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getChatLeadBySession: vi.fn(async (sessionId: string) => state.lead?.sessionId === sessionId ? state.lead : undefined),
    createChatLead: vi.fn(async (values: Partial<StoredLead>) => {
      state.lead = {
        id: 501,
        sessionId: values.sessionId!,
        status: "incomplete",
        currentStep: values.currentStep ?? "loan_purpose",
        loanPurpose: null,
        propertyType: null,
        propertyValue: null,
        creditRange: null,
        annualIncome: null,
        downPayment: null,
        loanAmount: null,
        lowDownPaymentHomeSearch: null,
        targetArea: null,
        fullName: null,
        email: null,
        phone: null,
        agentId: values.agentId ?? null,
        loanOfficerId: values.loanOfficerId ?? null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return 501;
    }),
    updateChatLead: vi.fn(async (_id: number, values: Partial<StoredLead>) => {
      state.lead = { ...state.lead!, ...values, updatedAt: new Date() };
    }),
    addChatTranscript: vi.fn(async (chatLeadId: number, role: "assistant" | "user" | "system", content: string) => {
      state.transcript.push({ id: state.transcript.length + 1, chatLeadId, role, content, createdAt: new Date() });
    }),
    getChatTranscriptByLeadId: vi.fn(async (id: number) => state.transcript.filter((message) => message.chatLeadId === id)),
    listChatIntakeLeads: vi.fn(async () => state.lead ? [state.lead] : []),
    getFeaturedLoanOfficer: vi.fn(async () => ({ id: 1, name: "Mike Ford", email: "mford@cfmtg.com", phone: "(541) 729-0819", nmls: "288455", title: "Loan Officer", visible: 1, featured: 1, createdAt: new Date(), updatedAt: new Date() })),
    getAgentBySlug: vi.fn(async () => undefined),
  };
});

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn(async () => true) }));
vi.mock("./email", () => ({ sendChatIntakeNotification: vi.fn(async () => ({ sent: true })) }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | null): TrpcContext {
  return {
    user: role ? { id: 1, openId: "owner", email: "owner@example.com", name: "Owner", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  state.lead = undefined;
  state.transcript = [];
});

describe("full mortgage intake lifecycle", () => {
  it("persists an incomplete session, completes qualification, and exposes its transcript to the admin", async () => {
    const sessionId = "chat-lifecycle-1234567890";
    const publicCaller = appRouter.createCaller(context(null));
    const started = await publicCaller.chat.start({ sessionId });
    expect(started.status).toBe("incomplete");
    expect(state.lead?.loanOfficerId).toBe(1);

    await publicCaller.chat.answer({ sessionId, message: "purchase" });
    expect(state.lead).toMatchObject({ status: "incomplete", loanPurpose: "purchase", currentStep: "property_type" });
    await publicCaller.chat.answer({ sessionId, message: "Single-Family" });
    await publicCaller.chat.answer({ sessionId, message: "$450,000" });
    await publicCaller.chat.answer({ sessionId, message: "Good 660-719" });
    await publicCaller.chat.answer({ sessionId, message: "$120,000" });
    await publicCaller.chat.answer({ sessionId, message: "$45,000" });
    await publicCaller.chat.answer({ sessionId, message: "Sarah Chen" });
    await publicCaller.chat.answer({ sessionId, message: "sarah@example.com" });
    await publicCaller.chat.answer({ sessionId, message: "(541) 555-0101" });
    expect(state.lead).toMatchObject({ currentStep: "home_search_interest" });
    await publicCaller.chat.answer({ sessionId, message: "Yes" });
    expect(state.lead).toMatchObject({ currentStep: "search_area_type", lowDownPaymentHomeSearch: 1 });
    await publicCaller.chat.answer({ sessionId, message: "City" });
    const completed = await publicCaller.chat.answer({ sessionId, message: "Eugene and Springfield" });

    expect(completed.completed).toBe(true);
    expect(completed.message).toContain("Thank you, Sarah Chen!");
    expect(state.lead).toMatchObject({ status: "qualified", currentStep: "complete", loanAmount: 405000, email: "sarah@example.com", lowDownPaymentHomeSearch: 1, searchAreaType: "City", targetArea: "Eugene and Springfield" });
    expect(state.lead?.completedAt).toBeInstanceOf(Date);

    const adminCaller = appRouter.createCaller(context("admin"));
    const listed = await adminCaller.chat.list();
    const transcript = await adminCaller.chat.transcript({ chatLeadId: 501 });
    expect(listed).toHaveLength(1);
    expect(transcript.some((message) => message.role === "user" && message.content === "sarah@example.com")).toBe(true);
    expect(transcript.at(-1)?.content).toContain("within 24 business hours");
  });
});
