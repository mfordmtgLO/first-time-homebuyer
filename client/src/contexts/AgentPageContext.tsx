/**
 * Carries co-branded agent and loan-officer slugs down to public forms and the
 * Mortgage Intake Specialist so paired URLs retain both identities.
 */
import { createContext, useContext, type ReactNode } from "react";

type CoBrandContextValue = {
  agentSlug: string | null;
  loanOfficerSlug: string | null;
  propertyPageSlug: string | null;
};

const AgentPageContext = createContext<CoBrandContextValue>({ agentSlug: null, loanOfficerSlug: null, propertyPageSlug: null });

export function AgentPageProvider({
  agentSlug,
  loanOfficerSlug = null,
  propertyPageSlug = null,
  children,
}: {
  agentSlug: string | null;
  loanOfficerSlug?: string | null;
  propertyPageSlug?: string | null;
  children: ReactNode;
}) {
  return <AgentPageContext.Provider value={{ agentSlug, loanOfficerSlug, propertyPageSlug }}>{children}</AgentPageContext.Provider>;
}

export function useAgentSlug() {
  return useContext(AgentPageContext).agentSlug;
}

export function useLoanOfficerSlug() {
  return useContext(AgentPageContext).loanOfficerSlug;
}

export function usePropertyPageSlug() {
  return useContext(AgentPageContext).propertyPageSlug;
}
