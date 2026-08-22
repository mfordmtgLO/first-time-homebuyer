import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createWorkflowAiReviewHistory: vi.fn(async (input) => ({ id: 302, ...input, status: "open", feedback: null, ownerNote: null, createdAt: new Date(), updatedAt: new Date() })),
    listWorkflowAiReviewHistory: vi.fn(async () => []),
    updateWorkflowAiReviewOutcome: vi.fn(async (input) => ({ ...input, section: "platform-leads", headline: "Review new leads", recordsSnapshot: "[]", actionsSnapshot: "[]", createdAt: new Date(), updatedAt: new Date() })),
  };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ headline: "Review new leads", actions: [{ title: "Document a next step", detail: "Review the newest lead and document the next action." }] }) } }] })),
}));

import { appRouter } from "./routers";
import { createWorkflowAiReviewHistory, listWorkflowAiReviewHistory, updateWorkflowAiReviewOutcome } from "./db";
import type { TrpcContext } from "./_core/context";

const createHistoryMock = vi.mocked(createWorkflowAiReviewHistory);
const listHistoryMock = vi.mocked(listWorkflowAiReviewHistory);
const updateOutcomeMock = vi.mocked(updateWorkflowAiReviewOutcome);

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 55, openId: `workflow-history-${role}`, name: "Workflow Owner", email: "workflow@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("workflowAi review history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks non-admin users from private review history and outcomes", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.workflowAi.listHistory()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.workflowAi.updateOutcome({ id: 302, status: "completed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listHistoryMock).not.toHaveBeenCalled();
    expect(updateOutcomeMock).not.toHaveBeenCalled();
  });

  it("saves bounded review snapshots and outputs under the dashboard owner", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.workflowAi.review({ section: "platform-leads", records: [{ label: "Jamie", status: "New", meta: "Organic lead" }] });
    expect(result.historyId).toBe(302);
    expect(createHistoryMock).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 55, section: "platform-leads", headline: "Review new leads" }));
    expect(createHistoryMock.mock.calls[0]?.[0].recordsSnapshot).toContain("Jamie");
    expect(createHistoryMock.mock.calls[0]?.[0].actionsSnapshot).toContain("Document a next step");
  });

  it("scopes history and owner-recorded outcomes to the signed-in dashboard owner", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.workflowAi.listHistory({ section: "platform-leads", limit: 5 });
    expect(listHistoryMock).toHaveBeenCalledWith({ ownerUserId: 55, section: "platform-leads", limit: 5 });
    await caller.workflowAi.updateOutcome({ id: 302, status: "completed", feedback: "useful", ownerNote: "Follow-up task documented." });
    expect(updateOutcomeMock).toHaveBeenCalledWith({ id: 302, ownerUserId: 55, status: "completed", feedback: "useful", ownerNote: "Follow-up task documented." });
  });
});
