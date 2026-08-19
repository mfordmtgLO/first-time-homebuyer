import { useState } from "react";
import { ChevronDown, ExternalLink, House } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPropertyPairingSummary, getPropertyStreetAddress } from "@shared/propertyLeadSource";
import { publicSiteUrl } from "@shared/publicSiteUrl";

type PropertyPageSourceSummaryProps = {
  address: string;
  propertyPageSlug: string | null;
  loanOfficerName: string | null;
  agentName: string | null;
};

/** A compact source-cell control that keeps property-page lead attribution readable in wide dashboard tables. */
export default function PropertyPageSourceSummary({
  address,
  propertyPageSlug,
  loanOfficerName,
  agentName,
}: PropertyPageSourceSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const streetAddress = getPropertyStreetAddress(address);
  const pairingSummary = formatPropertyPairingSummary(loanOfficerName, agentName);
  const propertyUrl = propertyPageSlug ? publicSiteUrl(`/property/${propertyPageSlug}`) : null;

  return (
    <div className="min-w-48 max-w-64">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="btn-press w-full rounded-md p-1 text-left transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        title="Show the full property-page source and co-brand pairing"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/5 text-[10px] font-semibold text-primary">
            <House className="mr-1 h-3 w-3" /> Single-property website
          </Badge>
          <span className="truncate text-xs font-semibold text-foreground">{streetAddress}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-primary transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
        <span className="mt-1 block truncate text-[11px] text-muted-foreground">{pairingSummary}</span>
      </button>

      {expanded && (
        <div className="mt-1.5 rounded-md border border-primary/15 bg-primary/[0.03] p-2 text-[11px] leading-relaxed text-muted-foreground">
          <p><span className="font-medium text-foreground">Full address:</span> {address}</p>
          <p className="mt-1"><span className="font-medium text-foreground">Co-brand pairing:</span> {pairingSummary}</p>
          {propertyUrl ? (
            <a href={propertyUrl} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-1 break-all font-medium text-primary hover:underline">
              <ExternalLink className="h-3 w-3 shrink-0" /> {propertyUrl}
            </a>
          ) : <p className="mt-1.5">The saved property-page URL is unavailable.</p>}
        </div>
      )}
    </div>
  );
}
