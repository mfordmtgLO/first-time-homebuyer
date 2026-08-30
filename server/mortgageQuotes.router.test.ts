import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listMortgagePaymentQuotes: vi.fn(async () => []),
    createMortgagePaymentQuote: vi.fn(async (input) => ({ id: 91, ...input, createdAt: new Date() })),
    deleteMortgagePaymentQuote: vi.fn(async () => undefined),
    updateMortgagePaymentQuoteName: vi.fn(async (input) => ({ id: input.id, name: input.name, ownerUserId: input.ownerUserId })),
  };
});

import { appRouter } from "./routers";
import { createMortgagePaymentQuote, deleteMortgagePaymentQuote, listMortgagePaymentQuotes, updateMortgagePaymentQuoteName } from "./db";
import type { TrpcContext } from "./_core/context";

const listMock = vi.mocked(listMortgagePaymentQuotes);
const createMock = vi.mocked(createMortgagePaymentQuote);
const deleteMock = vi.mocked(deleteMortgagePaymentQuote);
const updateNameMock = vi.mocked(updateMortgagePaymentQuoteName);

function createContext(role: "admin" | "user"): TrpcContext {
  return {
    user: { id: 83, openId: `quote-${role}`, name: "Quote Owner", email: "quote@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const quoteInput = {
  name: "Condo with HOA",
  purchasePriceCents: 42500000,
  downPaymentPercentBasisPoints: 300,
  annualRateBasisPoints: 650,
  termYears: 30 as const,
  annualPropertyTaxCents: 480000,
  annualHomeInsuranceCents: 180000,
  monthlyHoaDuesCents: 35000,
  monthlyMortgageInsuranceCents: 11500,
};

describe("mortgageQuotes router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks non-admin access to saved private mortgage-payment scenarios", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.mortgageQuotes.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.mortgageQuotes.create(quoteInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("saves and removes scenarios only within the signed-in owner scope", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.mortgageQuotes.create(quoteInput);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 83, ...quoteInput, firstName: "", lastName: "", program: "conventional", monthlyFloodInsuranceCents: 0, maxPurchasePriceResultCents: 0 }));

    await caller.mortgageQuotes.updateName({ id: 91, name: "  Renamed condo  " });
    expect(updateNameMock).toHaveBeenCalledWith({ id: 91, name: "Renamed condo", ownerUserId: 83 });
    await caller.mortgageQuotes.delete({ id: 91 });
    expect(deleteMock).toHaveBeenCalledWith({ id: 91, ownerUserId: 83 });
  });

  it("passes owner-scoped borrower, program, and max-price filters to the database helper", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.mortgageQuotes.list({ firstName: "Ava", lastName: "Lee", program: "fha", maxPurchasePriceCents: 60_000_000 });
    expect(listMock).toHaveBeenCalledWith(83, { firstName: "Ava", lastName: "Lee", program: "fha", maxPurchasePriceCents: 60_000_000 });
  });

  it("accepts saved affordability inputs and max-price results", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await caller.mortgageQuotes.create({ ...quoteInput, firstName: "Ava", lastName: "Lee", program: "fha", creditScore: 640, grossMonthlyIncomeCents: 800000, monthlyConsumerDebtCents: 50000, maxHousingPaymentCents: 406000, availablePrincipalAndInterestCents: 256000, maxPurchasePriceResultCents: 50000000, dtiBasisPoints: 5700, minimumCreditScore: 580 });
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ firstName: "Ava", lastName: "Lee", program: "fha", creditScore: 640, maxPurchasePriceResultCents: 50000000, dtiBasisPoints: 5700, minimumCreditScore: 580 }));
  });

  it("requires a name and rejects invalid monthly-cost values", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    await expect(caller.mortgageQuotes.create({ ...quoteInput, name: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.mortgageQuotes.create({ ...quoteInput, monthlyHoaDuesCents: -1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.mortgageQuotes.create({ ...quoteInput, termYears: 20 as 15 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
