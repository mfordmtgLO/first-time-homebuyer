import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    insertLead: vi.fn(),
    listLeads: vi.fn(async () => []),
  };
});

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

import { appRouter } from "./routers";
import { insertLead } from "./db";
import { notifyOwner } from "./_core/notification";
import type { TrpcContext } from "./_core/context";

const insertLeadMock = vi.mocked(insertLead);
const notifyOwnerMock = vi.mocked(notifyOwner);

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("leads.submit", () => {
  beforeEach(() => {
    insertLeadMock.mockClear();
    notifyOwnerMock.mockClear();
    insertLeadMock.mockResolvedValue(undefined as never);
    notifyOwnerMock.mockResolvedValue(true);
  });

  it("stores a valid lead and notifies the owner", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.leads.submit({
      firstName: "Taylor",
      email: "taylor@example.com",
      phone: "(541) 555-0100",
      smsConsent: true,
      source: "roadmap",
    });

    expect(result).toEqual({ success: true });
    expect(insertLeadMock).toHaveBeenCalledWith({
      firstName: "Taylor",
      email: "taylor@example.com",
      phone: "(541) 555-0100",
      smsConsent: 1,
      source: "roadmap",
      scenario: undefined,
    });
    expect(notifyOwnerMock).toHaveBeenCalledTimes(1);
    expect(notifyOwnerMock.mock.calls[0]?.[0]?.title).toContain("Taylor");
  });

  it("defaults source to roadmap when omitted", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await caller.leads.submit({ firstName: "Sam", email: "sam@example.com", phone: "(541) 555-0100", smsConsent: true });

    expect(insertLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "roadmap" })
    );
  });

  it("stores privacy-minimized UTM attribution with a Roadmap submission", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await caller.leads.submit({
      firstName: "Avery",
      email: "avery@example.com",
      phone: "(541) 555-0100",
      smsConsent: true,
      campaignAttribution: {
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "goog_ore_fthb_roadmap_v1",
        landingPath: "/",
        referrerHost: "www.google.com",
      },
    });

    expect(insertLeadMock).toHaveBeenCalledWith(expect.objectContaining({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "goog_ore_fthb_roadmap_v1",
      landingPath: "/",
      referrerHost: "www.google.com",
    }));
  });

  it("stores a supplied Roadmap phone number for follow-up", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await caller.leads.submit({ firstName: "Sam", email: "sam@example.com", phone: "(541) 555-0100", smsConsent: true });

    expect(insertLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "(541) 555-0100", smsConsent: 1 })
    );
  });

  it("rejects a submission without affirmative SMS consent", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.leads.submit({ firstName: "Sam", email: "sam@example.com", phone: "(541) 555-0100" })).rejects.toThrow("SMS consent is required");
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it("rejects the common 555 placeholder phone number", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.leads.submit({ firstName: "Sam", email: "sam@example.com", phone: "555-555-5555", smsConsent: true })).rejects.toThrow("placeholder numbers are not accepted");
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.leads.submit({ firstName: "Bad", email: "not-an-email" })
    ).rejects.toThrow();
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it("rejects an empty first name", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.leads.submit({ firstName: "  ", email: "ok@example.com" })
    ).rejects.toThrow();
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it("stores an attached buydown scenario as JSON and summarizes it in the notification", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const scenario = {
      purchasePrice: 450000,
      downPayment: 22500,
      noteRate: 6.5,
      loanAmount: 427500,
      year1Payment: 2166,
      year2Payment: 2427,
      notePayment: 2702,
      year1MonthlySavings: 536,
      year2MonthlySavings: 275,
      totalSubsidy: 9730,
    };

    await caller.leads.submit({
      firstName: "Jordan",
      email: "jordan@example.com",
      phone: "(541) 555-0100",
      smsConsent: true,
      source: "roadmap+buydown",
      scenario,
    });

    expect(insertLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "roadmap+buydown",
        scenario: JSON.stringify({ buydown: scenario }),
      })
    );
    const stored = JSON.parse(
      (insertLeadMock.mock.calls[0]?.[0] as { scenario: string }).scenario
    );
    expect(stored.buydown.purchasePrice).toBe(450000);
    expect(stored.buydown.totalSubsidy).toBe(9730);

    const content = notifyOwnerMock.mock.calls[0]?.[0]?.content ?? "";
    expect(content).toContain("Lead name: Jordan\nLead phone: (541) 555-0100\nLead email: jordan@example.com");
    expect(content).toContain("$450,000 purchase");
    expect(content).toContain("Year 1 monthly savings: $536");
    expect(content).toContain("Year 2 monthly savings: $275");
    expect(content).toContain("Total seller-paid buydown interest subsidy: $9,730 (2.16% of sales price)");
  });

  it("stores an attached cost-of-waiting scenario and summarizes it in the notification", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const costOfWaiting = {
      waitYears: 3,
      monthlyRent: 1800,
      purchasePrice: 400000,
      downPayment: 0,
      interestRate: 6.5,
      appreciationRate: 2,
      rentIncreaseRate: 3,
      monthlyPayment: 2528,
      totalRentPaid: 64800,
      equityGained: 38814,
      costOfWaiting: 103614,
    };

    await caller.leads.submit({
      firstName: "Riley",
      email: "riley@example.com",
      phone: "(541) 555-0100",
      smsConsent: true,
      source: "roadmap+waiting",
      costOfWaiting,
    });

    expect(insertLeadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "roadmap+waiting",
        scenario: JSON.stringify({ costOfWaiting }),
      })
    );
    const stored = JSON.parse(
      (insertLeadMock.mock.calls[0]?.[0] as { scenario: string }).scenario
    );
    expect(stored.costOfWaiting.waitYears).toBe(3);
    expect(stored.costOfWaiting.rentIncreaseRate).toBe(3);
    expect(stored.costOfWaiting.costOfWaiting).toBe(103614);
    expect(stored.buydown).toBeUndefined();

    const content = notifyOwnerMock.mock.calls[0]?.[0]?.content ?? "";
    expect(content).toContain("Lead name: Riley\nLead phone: (541) 555-0100\nLead email: riley@example.com");
    expect(content).toContain("3 yr(s) of waiting compared");
    expect(content).toContain("$1,800/mo rent");
    expect(content).toContain("resulting in $103,614 cost of waiting.");
  });

  it("stores both scenarios together in one combined payload", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const scenario = {
      purchasePrice: 450000,
      downPayment: 22500,
      noteRate: 6.5,
      loanAmount: 427500,
      year1Payment: 2166,
      year2Payment: 2427,
      notePayment: 2702,
      year1MonthlySavings: 536,
      year2MonthlySavings: 275,
      totalSubsidy: 9730,
    };
    const costOfWaiting = {
      waitYears: 2,
      monthlyRent: 2000,
      purchasePrice: 450000,
      downPayment: 22500,
      interestRate: 6.125,
      appreciationRate: 3,
      monthlyPayment: 2598,
      totalRentPaid: 48000,
      equityGained: 37000,
      costOfWaiting: 85000,
    };

    await caller.leads.submit({
      firstName: "Alex",
      email: "alex@example.com",
      phone: "(541) 555-0100",
      smsConsent: true,
      source: "roadmap+buydown+waiting",
      scenario,
      costOfWaiting,
    });

    const stored = JSON.parse(
      (insertLeadMock.mock.calls[0]?.[0] as { scenario: string }).scenario
    );
    expect(stored.buydown.totalSubsidy).toBe(9730);
    expect(stored.costOfWaiting.costOfWaiting).toBe(85000);

    const content = notifyOwnerMock.mock.calls[0]?.[0]?.content ?? "";
    expect(content).toContain("2-1 buydown scenario");
    expect(content).toContain("Rent vs. buy scenario");
    expect(content).toContain("resulting in $85,000 cost of waiting.");
  });

  it("rejects a cost-of-waiting scenario with out-of-range values", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.leads.submit({
        firstName: "Morgan",
        email: "morgan@example.com",
        costOfWaiting: {
          waitYears: 9, // max is 5
          monthlyRent: 1800,
          purchasePrice: 400000,
          downPayment: 0,
          interestRate: 6.5,
          appreciationRate: 2,
          monthlyPayment: 2528,
          totalRentPaid: 64800,
          equityGained: 38814,
          costOfWaiting: 103614,
        },
      })
    ).rejects.toThrow();
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it("rejects a rent increase rate above 10%", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.leads.submit({
        firstName: "Jamie",
        email: "jamie@example.com",
        costOfWaiting: {
          waitYears: 3,
          monthlyRent: 1800,
          purchasePrice: 400000,
          downPayment: 0,
          interestRate: 6.5,
          appreciationRate: 2,
          rentIncreaseRate: 12, // max is 10
          monthlyPayment: 2528,
          totalRentPaid: 64800,
          equityGained: 38814,
          costOfWaiting: 103614,
        },
      })
    ).rejects.toThrow();
    expect(insertLeadMock).not.toHaveBeenCalled();
  });

  it("rejects a scenario with out-of-range values", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.leads.submit({
        firstName: "Casey",
        email: "casey@example.com",
        scenario: {
          purchasePrice: -5,
          downPayment: 0,
          noteRate: 99,
          loanAmount: 0,
          year1Payment: 0,
          year2Payment: 0,
          notePayment: 0,
          year1MonthlySavings: 0,
          year2MonthlySavings: 0,
          totalSubsidy: 0,
        },
      })
    ).rejects.toThrow();
    expect(insertLeadMock).not.toHaveBeenCalled();
  });
});
