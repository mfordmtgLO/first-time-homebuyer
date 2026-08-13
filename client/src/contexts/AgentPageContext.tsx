/**
 * Carries co-branded agent and loan-officer slugs down to public forms and the
 * Mortgage Intake Specialist so paired URLs retain both identities.
 */
import { createContext, useContext, type ReactNode } from "react";

type CoBrandContextValue = {
  agentSlug: string | null;
  loanOfficerSlug: string | null;
};

const AgentPageContext = createContext<CoBrandContextValue>({ agentSlug: null, loanOfficerSlug: null });

export function AgentPageProvider({
  agentSlug,
  loanOfficerSlug = null,
  children,
}: {
  agentSlug: string | null;
  loanOfficerSlug?: string | null;
  children: ReactNode;
}) {
  return <AgentPageContext.Provider value={{ agentSlug, loanOfficerSlug }}>{children}</AgentPageContext.Provider>;
}

export function useAgentSlug() {
  return useContext(AgentPageContext).agentSlug;
}

export function useLoanOfficerSlug() {
  return useContext(AgentPageContext).loanOfficerSlug;
}
