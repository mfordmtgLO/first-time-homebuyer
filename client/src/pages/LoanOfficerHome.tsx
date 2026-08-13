import { useRoute } from "wouter";
import Home from "./Home";

/** Public loan-officer-only profile page at /loan-officer/:loanOfficerSlug. */
export default function LoanOfficerHome() {
  const [, params] = useRoute("/loan-officer/:loanOfficerSlug");
  return <Home loanOfficerSlug={params?.loanOfficerSlug?.toLowerCase() ?? null} />;
}
