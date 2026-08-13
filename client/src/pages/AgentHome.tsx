/**
 * Co-branded landing page at /with/:slug — the full landing page with the
 * partner agent's section driven by the slug. Unknown slugs fall back to the
 * default homepage experience (no agent section).
 */
import { useRoute } from "wouter";
import Home from "./Home";

export default function AgentHome() {
  const [, pairedParams] = useRoute("/with/:loanOfficerSlug/:agentSlug");
  const [, legacyParams] = useRoute("/with/:slug");
  if (pairedParams?.loanOfficerSlug && pairedParams.agentSlug) {
    return <Home
      loanOfficerSlug={pairedParams.loanOfficerSlug.toLowerCase()}
      agentSlug={pairedParams.agentSlug.toLowerCase()}
    />;
  }
  return <Home agentSlug={legacyParams?.slug?.toLowerCase() ?? null} />;
}
