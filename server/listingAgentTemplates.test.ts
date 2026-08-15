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
    listPropertyEmailTemplates: vi.fn(async () => []),
    createPropertyEmailTemplate: vi.fn(async (input: { name: string; bodyTemplate: string }) => ({
      id: 93,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    recordGeoSphereListingEmailActivity: vi.fn(async (input: { listingIds: number[]; templateName: string }) => input.listingIds.map((id, index) => ({
      id,
      sentAt: new Date("2026-08-15T19:30:00.000Z"),
      wasResend: index === 1,
      emailResendCount: index === 1 ? 2 : 0,
      templateName: input.templateName,
    }))),
  };
});

import { appRouter } from "./routers";
import { createListingAgentEmailTemplate, createPropertyEmailTemplate, listListingAgentEmailTemplates, listPropertyEmailTemplates, recordGeoSphereListingEmailActivity } from "./db";
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
const listPropertyTemplatesMock = vi.mocked(listPropertyEmailTemplates);
const createPropertyTemplateMock = vi.mocked(createPropertyEmailTemplate);
const recordEmailActivityMock = vi.mocked(recordGeoSphereListingEmailActivity);

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

  it("records original and resend outreach activity for the selected saved properties", async () => {
    const result = await appRouter.createCaller(createContext("admin")).geosphere.recordListingEmailActivity({
      listingIds: [24, 25],
      templateName: "USDA RD only",
    });

    expect(recordEmailActivityMock).toHaveBeenCalledWith({ listingIds: [24, 25], templateName: "USDA RD only" });
    expect(result).toEqual([
      expect.objectContaining({ id: 24, wasResend: false, emailResendCount: 0, templateName: "USDA RD only" }),
      expect.objectContaining({ id: 25, wasResend: true, emailResendCount: 2, templateName: "USDA RD only" }),
    ]);
  });

  it("does not expose template management to a non-admin user", async () => {
    await expect(appRouter.createCaller(createContext("user")).geosphere.listListingAgentEmailTemplates()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lists and saves custom buyer-facing property email introductions for the site owner", async () => {
    const templates = [{ id: 4, name: "Weekend homes", bodyTemplate: "Here are a few homes to consider.", createdAt: new Date(), updatedAt: new Date() }];
    listPropertyTemplatesMock.mockResolvedValueOnce(templates as never);

    const listed = await appRouter.createCaller(createContext("admin")).geosphere.listPropertyEmailTemplates();
    const saved = await appRouter.createCaller(createContext("admin")).geosphere.savePropertyEmailTemplate({
      name: "Saturday review",
      bodyTemplate: "I pulled together a few homes for your weekend review and would be glad to help with any questions.",
    });

    expect(listed).toEqual(templates);
    expect(createPropertyTemplateMock).toHaveBeenCalledWith({
      name: "Saturday review",
      bodyTemplate: "I pulled together a few homes for your weekend review and would be glad to help with any questions.",
    });
    expect(saved).toMatchObject({ id: 93, name: "Saturday review" });
  });

  it("does not expose buyer-facing property template management to a non-admin user", async () => {
    await expect(appRouter.createCaller(createContext("user")).geosphere.listPropertyEmailTemplates()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
