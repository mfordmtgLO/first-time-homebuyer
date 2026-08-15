import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listListingAgentEmailTemplates: vi.fn(async () => []),
    createListingAgentEmailTemplate: vi.fn(async (input: { name: string; bodyTemplate: string }) => ({
      id: 91,
      ...input,
      isBuiltIn: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };
});

import { appRouter } from "./routers";
import { createListingAgentEmailTemplate, listListingAgentEmailTemplates } from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "admin" | "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: `template-${role}`,
    email: `${role}@example.com`,
    name: "Sample Admin",
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

const listTemplatesMock = vi.mocked(listListingAgentEmailTemplates);
const createTemplateMock = vi.mocked(createListingAgentEmailTemplate);

describe("geosphere listing-agent email templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists built-in and saved templates for the site owner", async () => {
    const templates = [{ id: 1, name: "OHCS Flex Lending only", bodyTemplate: "Built-in body", isBuiltIn: 1 }];
    listTemplatesMock.mockResolvedValueOnce(templates as never);

    const result = await appRouter.createCaller(createContext("admin")).geosphere.listListingAgentEmailTemplates();

    expect(result).toEqual(templates);
    expect(listTemplatesMock).toHaveBeenCalledTimes(1);
  });

  it("saves a validated custom reusable body for the site owner", async () => {
    const result = await appRouter.createCaller(createContext("admin")).geosphere.saveListingAgentEmailTemplate({
      name: "Open-house follow-up",
      bodyTemplate: "I would like to discuss a buyer-attraction conversation for these properties.",
    });

    expect(createTemplateMock).toHaveBeenCalledWith({
      name: "Open-house follow-up",
      bodyTemplate: "I would like to discuss a buyer-attraction conversation for these properties.",
    });
    expect(result).toMatchObject({ id: 91, isBuiltIn: 0, name: "Open-house follow-up" });
  });

  it("does not expose template management to a non-admin user", async () => {
    await expect(appRouter.createCaller(createContext("user")).geosphere.listListingAgentEmailTemplates()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
