import { useState } from "react";
import { ChevronDown, Copy, ExternalLink, House, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPropertyPairingSummary, getPropertyStreetAddress } from "@shared/propertyLeadSource";
import { publicSiteUrl } from "@shared/publicSiteUrl";
import { getPropertyHeroMedia, parsePropertyLandingSnapshot } from "@shared/propertyLandingPage";
import { toast } from "sonner";

type PropertyPageSourceSummaryProps = {
  address: string;
  propertyPageSlug: string | null;
  listingSnapshot: string | null;
  loanOfficerName: string | null;
  agentName: string | null;
};

/** A compact source-cell control that keeps property-page lead attribution readable in wide dashboard tables. */
export default function PropertyPageSourceSummary({
  address,
  propertyPageSlug,
  listingSnapshot,
  loanOfficerName,
  agentName,
}: PropertyPageSourceSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const streetAddress = getPropertyStreetAddress(address);
  const pairingSummary = formatPropertyPairingSummary(loanOfficerName, agentName);
  const propertyUrl = propertyPageSlug ? publicSiteUrl(`/property/${propertyPageSlug}`) : null;
  const snapshot = listingSnapshot ? parsePropertyLandingSnapshot(listingSnapshot) : null;
  const heroMedia = snapshot ? getPropertyHeroMedia(snapshot) : { kind: "unavailable" as const };

  const copyPropertyUrl = async () => {
    if (!propertyUrl) return;
    try {
      await navigator.clipboard.writeText(propertyUrl);
      toast.success("Property page URL copied.");
    } catch {
      toast.error("Unable to copy the property page URL. Please copy it from the link.");
    }
  };

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
        <div className="mt-1.5 flex gap-2 rounded-md border border-primary/15 bg-primary/[0.03] p-2 text-[11px] leading-relaxed text-muted-foreground">
          {heroMedia.kind === "saved_listing_photo" ? (
            <img src={heroMedia.url} alt={`Saved listing thumbnail for ${streetAddress}`} className="h-16 w-16 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded bg-muted px-1 text-center text-[9px] text-muted-foreground"><ImageOff className="mb-1 h-3.5 w-3.5" />No saved photo</div>
          )}
          <div className="min-w-0 flex-1">
            <p><span className="font-medium text-foreground">Full address:</span> {address}</p>
            <p className="mt-1"><span className="font-medium text-foreground">Co-brand pairing:</span> {pairingSummary}</p>
            {propertyUrl ? (
              <div className="mt-1.5 flex items-start gap-1.5">
                <a href={propertyUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all font-medium text-primary hover:underline">
                  <ExternalLink className="mr-1 inline h-3 w-3 shrink-0" /> {propertyUrl}
                </a>
                <button type="button" onClick={copyPropertyUrl} className="btn-press inline-flex shrink-0 items-center gap-1 rounded border border-primary/20 bg-card px-1.5 py-1 font-medium text-primary hover:bg-primary/5" title="Copy property page URL">
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
            ) : <p className="mt-1.5">The saved property-page URL is unavailable.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
