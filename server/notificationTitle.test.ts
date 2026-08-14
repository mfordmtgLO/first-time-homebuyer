import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function publicContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as unknown as TrpcContext["res"] };
}

describe("configured notification website title", () => {
  it("returns the professional website title through the public metadata endpoint", async () => {
    const response = await appRouter.createCaller(publicContext()).site.notificationTitle();
    expect(response.title).toBe("First-Time Homebuyer Mortgage Advisor Landing Page");
    expect(response.title).not.toMatch(/^copy of/i);
  });
});
