import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    insertLead: vi.fn(),
    listLeads: vi.fn(async () => []),
    updateLeadStatus: vi.fn(async () => undefined),
    updateLeadNotes: vi.fn(async () => undefined),
  };
});

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

import { appRouter } from "./routers";
import { updateLeadNotes } from "./db";
import type { TrpcContext } from "./_core/context";

const updateLeadNotesMock = vi.mocked(updateLeadNotes);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "admin" | "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: `sample-${role}`,
    email: `${role}@example.com`,
    name: "Sample",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("leads.updateNotes", () => {
  beforeEach(() => {
    updateLeadNotesMock.mockClear();
  });

  it("lets the admin owner save notes on a lead", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.leads.updateNotes({
      id: 1,
      notes: "Called 7/12 — sending pre-approval checklist.",
    });
    expect(result).toEqual({ success: true });
    expect(updateLeadNotesMock).toHaveBeenCalledWith(
      1,
      "Called 7/12 — sending pre-approval checklist."
    );
  });

  it("allows clearing notes with an empty string", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.leads.updateNotes({ id: 1, notes: "" });
    expect(result).toEqual({ success: true });
    expect(updateLeadNotesMock).toHaveBeenCalledWith(1, "");
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(
      caller.leads.updateNotes({ id: 1, notes: "should not work" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updateLeadNotesMock).not.toHaveBeenCalled();
  });

  it("rejects notes longer than 5000 characters", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(
      caller.leads.updateNotes({ id: 1, notes: "x".repeat(5001) })
    ).rejects.toThrow();
    expect(updateLeadNotesMock).not.toHaveBeenCalled();
  });
});
