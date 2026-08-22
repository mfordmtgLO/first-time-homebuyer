import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const chatIntakeSource = readFileSync(resolve(process.cwd(), "client/src/components/ChatIntakeLeads.tsx"), "utf8");
const inboxSource = readFileSync(resolve(process.cwd(), "client/src/components/PlatformLeadInbox.tsx"), "utf8");
const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("Mortgage chat intake quick replies and reviewable extraction", () => {
  it("exposes four consent-gated text quick replies without automatic sending", () => {
    expect(chatIntakeSource).toContain('value: "follow_up"');
    expect(chatIntakeSource).toContain('value: "roadmap"');
    expect(chatIntakeSource).toContain('value: "listing_search"');
    expect(chatIntakeSource).toContain('value: "connect_agent"');
    expect(chatIntakeSource).toContain('lead.smsConsent !== 1 || !hasUsableRoadmapPhone(lead.phone)');
    expect(chatIntakeSource).toContain('window.location.href = `sms:${phone}?body=${encodeURIComponent(body)}`');
    expect(chatIntakeSource).toContain('Review it before sending.');
  });

  it("assigns an agent before opening an unassigned connect-with-agent text draft", () => {
    expect(chatIntakeSource).toContain("Choose a co-branded agent");
    expect(chatIntakeSource).toContain("SelectGroup");
    expect(chatIntakeSource).toContain("SelectLabel>Paired");
    expect(chatIntakeSource).toContain("SelectLabel>Agents");
    expect(chatIntakeSource).toContain("LO: {agentConnectionLead.loanOfficerName} + Agent: {agent.name}");
    expect(chatIntakeSource).toContain('assignAgent.mutate({ chatLeadId: agentConnectionLead.id, agentId: agent.id }');
  });

  it("builds vertical exact question-and-answer notes with explicit unanswered values", () => {
    expect(chatIntakeSource).toContain("function verbatimChatAnswers");
    expect(chatIntakeSource).toContain('"No response provided"');
    expect(chatIntakeSource).toContain('"Would you like potential low- or no-down-payment homes?"');
    expect(chatIntakeSource).toContain('"Did you provide consent for text messages?"');
    expect(chatIntakeSource).toContain('notes: verbatimChatAnswers(lead)');
    expect(chatIntakeSource).toContain('new CustomEvent("platform-lead-manual-prefill"');
  });

  it("opens an owner-reviewed Organic manual lead prefill and retains known chat assignments only when saved", () => {
    expect(inboxSource).toContain('window.addEventListener("platform-lead-manual-prefill"');
    expect(inboxSource).toContain('leadSource: "organic"');
    expect(inboxSource).toContain("Loan officer assignment");
    expect(inboxSource).toContain("Co-branded agent assignment");
    expect(routerSource).toContain("assignedLoanOfficerId: z.number().int().positive().nullable().optional()");
    expect(routerSource).toContain("assignedAgentId: z.number().int().positive().nullable().optional()");
    expect(routerSource).toContain("assignedLoanOfficerId: input.assignedLoanOfficerId ?? null");
    expect(routerSource).toContain("assignedAgentId: input.assignedAgentId ?? null");
  });
});
