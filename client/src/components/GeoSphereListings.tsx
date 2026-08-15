import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, ExternalLink, Layers3, Loader2, Mail, MapPin, RefreshCw, SearchCheck, SlidersHorizontal, X } from "lucide-react";
import {
  buildListingEmailDraft,
  type ListingEmailRow,
} from "@shared/leadEmailDraft";
import { OVERLAY_LABELS, type GeoSphereOverlayKey } from "@shared/geosphere";
import { buildGeoSphereInventoryCsv, filterAndSortGeoSphereListings, type GeoSphereInventorySort } from "@shared/geosphereInventory";

const OVERLAYS: GeoSphereOverlayKey[] = ["all", "lmi", "usda", "lmiUsda"];

const usd = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Recipient = {
  value: string;
  name: string;
  email: string;
  source: "Roadmap" | "Mortgage intake";
};

function getListingDetails(raw: string) {
  try {
    const source = JSON.parse(raw) as Record<string, unknown>;
    const agent = source.listingAgent as Record<string, unknown> | undefined;
    return [
      ["MLS", source.mlsNumber],
      ["MLS source", source.mlsName],
      ["Year built", source.yearBuilt],
      ["Days on market", source.daysOnMarket],
      ["Listing agent", agent?.name],
      ["Agent phone", agent?.phone],
      ["Agent email", agent?.email],
      ["Listing URL", source.zillowUrl ?? source.zillow_url ?? source.url],
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "") as Array<[string, unknown]>;
  } catch {
    return [];
  }
}

function ListingDetails({ sourceData, address }: { sourceData: string; address: string }) {
  const details = getListingDetails(sourceData);
  if (!details.length) return <span className="text-xs text-muted-foreground">Imported source details unavailable</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-xs font-semibold text-primary hover:underline">
          Details
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-card text-card-foreground">
        <p className="font-semibold text-sm text-foreground">{address}</p>
        <dl className="mt-3 space-y-2 text-xs">
          {details.map(([label, value]) => {
            const isUrl = label === "Listing URL" && typeof value === "string" && /^https?:\/\//.test(value);
            return (
              <div key={label} className="flex gap-3 justify-between">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium text-foreground max-w-[190px] break-words">
                  {isUrl ? (
                    <a href={String(value)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : String(value)}
                </dd>
              </div>
            );
          })}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

export default function GeoSphereListings() {
  const utils = trpc.useUtils();
  const [selectedPullId, setSelectedPullId] = useState<string>("");
  const [overlay, setOverlay] = useState<GeoSphereOverlayKey>("all");
  const [recipientValue, setRecipientValue] = useState<string>("");
  const [listingSearch, setListingSearch] = useState("");
  const [listingSort, setListingSort] = useState<GeoSphereInventorySort>("address");

  const statusQuery = trpc.geosphere.status.useQuery();
  const pullsQuery = trpc.geosphere.listPulls.useQuery();
  const leadsQuery = trpc.leads.list.useQuery();
  const chatsQuery = trpc.chat.list.useQuery();
  const selectedPull = useMemo(
    () => (pullsQuery.data ?? []).find((pull) => String(pull.id) === selectedPullId) ?? null,
    [pullsQuery.data, selectedPullId]
  );
  const listingsQuery = trpc.geosphere.listListings.useQuery(
    { savedPullId: Number(selectedPullId), overlay },
    { enabled: Boolean(selectedPullId) }
  );

  useEffect(() => {
    if (!selectedPullId && pullsQuery.data?.[0]) setSelectedPullId(String(pullsQuery.data[0].id));
  }, [pullsQuery.data, selectedPullId]);

  const recipients = useMemo<Recipient[]>(() => {
    const roadmap = (leadsQuery.data ?? []).map((lead) => ({
      value: `roadmap:${lead.id}`,
      name: lead.firstName,
      email: lead.email,
      source: "Roadmap" as const,
    }));
    const intakes = (chatsQuery.data ?? [])
      .filter((lead) => lead.status === "qualified" && Boolean(lead.fullName && lead.email))
      .map((lead) => ({
        value: `chat:${lead.id}`,
        name: lead.fullName!,
        email: lead.email!,
        source: "Mortgage intake" as const,
      }));
    return [...roadmap, ...intakes];
  }, [leadsQuery.data, chatsQuery.data]);

  const syncNow = trpc.geosphere.syncNow.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.geosphere.status.invalidate(),
        utils.geosphere.listPulls.invalidate(),
        utils.geosphere.listListings.invalidate(),
      ]);
      toast.success(`Imported ${result.pullCount} saved pull${result.pullCount === 1 ? "" : "s"} and ${result.listingCount} listings.`);
    },
    onError: (error) => toast.error(error.message || "GeoSphere sync could not complete."),
  });

  const openListingDraft = () => {
    const recipient = recipients.find((item) => item.value === recipientValue);
    const listings = visibleListings;
    if (!recipient) {
      toast.error("Choose a Roadmap lead or completed Mortgage Intake Specialist lead first.");
      return;
    }
    if (!selectedPull || !listings.length) {
      toast.error("Choose a saved pull with at least one listing first.");
      return;
    }
    const rows: ListingEmailRow[] = listings.map((listing) => ({
      address: listing.address,
      price: listing.price,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      squareFootage: listing.squareFootage,
      propertyType: listing.propertyType,
      isLmi: listing.isLmi === 1,
      isUsda: listing.isUsda === 1,
    }));
    const draft = buildListingEmailDraft({
      firstName: recipient.name,
      email: recipient.email,
      areaLabel: selectedPull.areaLabel,
      overlayLabel: OVERLAY_LABELS[overlay],
      listings: rows,
    });
    window.location.href = draft.mailto;
    toast.success(`Property-list email draft opened for ${recipient.name}.`);
  };

  const lastSynced = statusQuery.data?.lastSyncedAt ? new Date(statusQuery.data.lastSyncedAt).toLocaleString() : "Not synced yet";
  const listings = listingsQuery.data ?? [];
  const visibleListings = useMemo(
    () => filterAndSortGeoSphereListings(listings, listingSearch, listingSort),
    [listings, listingSearch, listingSort]
  );
  const hasInventoryFilters = Boolean(listingSearch.trim()) || listingSort !== "address" || overlay !== "all";

  const clearInventoryFilters = () => {
    setListingSearch("");
    setListingSort("address");
    setOverlay("all");
  };

  const downloadVisibleInventory = () => {
    const csv = buildGeoSphereInventoryCsv(visibleListings);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeArea = (selectedPull?.areaLabel || "geosphere-saved-listings").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    link.href = href;
    link.download = `${safeArea || "geosphere-saved-listings"}-${overlay}-listings.csv`;
    link.click();
    URL.revokeObjectURL(href);
    toast.success(`Exported ${visibleListings.length} visible saved listing${visibleListings.length === 1 ? "" : "s"}.`);
  };

  return (
    <section className="mt-10 rounded-2xl border border-primary/15 bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border bg-[linear-gradient(118deg,rgba(15,77,59,0.08),rgba(196,142,58,0.07))] px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">GeoSphere inventory workspace</p>
            <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
              <MapPin className="h-6 w-6 text-primary" /> Saved qualifying listings
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Browse manually refreshed GeoSphere snapshots by area and persisted LMI or USDA RD eligibility. Synchronization reads saved snapshots only—it does not make a Rentcast pull.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="bg-card">
              <a href="https://geosphere-map-oregon.vercel.app/" target="_blank" rel="noreferrer">
                <MapPin className="mr-1.5 h-4 w-4" /> Open GeoSphere map <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-card"
              onClick={() => syncNow.mutate()}
              disabled={syncNow.isPending}
            >
              {syncNow.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
              Sync saved pulls
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Last cache-only dashboard sync: <span className="font-medium text-foreground">{lastSynced}</span>. Sync imports GeoSphere snapshots only and never makes a Rentcast pull.
          {statusQuery.data?.lastError ? <span className="ml-2 text-destructive">Latest issue: {statusQuery.data.lastError}</span> : null}
        </p>
      </div>

      <div className="p-5 sm:p-7">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved city, county, or ZIP pull</span>
            <Select value={selectedPullId} onValueChange={setSelectedPullId}>
              <SelectTrigger className="mt-1.5 h-10 bg-background">
                <SelectValue placeholder={pullsQuery.isLoading ? "Loading saved pulls…" : "Choose a saved pull"} />
              </SelectTrigger>
              <SelectContent>
                {(pullsQuery.data ?? []).map((pull) => (
                  <SelectItem key={pull.id} value={String(pull.id)}>
                    {pull.areaLabel} · {pull.listingCount} listings
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {selectedPull && <div className="flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label="Selected saved snapshot summary">
            <span className="rounded-full bg-muted px-3 py-2">Saved {selectedPull.sourceSavedAt ? new Date(selectedPull.sourceSavedAt).toLocaleString() : "date unavailable"}</span>
            <span className="rounded-full bg-primary/10 px-3 py-2 text-primary">All: {selectedPull.listingCount}</span>
            <span className="rounded-full bg-amber-500/10 px-3 py-2 text-amber-800">LMI: {selectedPull.lmiCount}</span>
            <span className="rounded-full bg-emerald-600/10 px-3 py-2 text-emerald-800">USDA: {selectedPull.usdaCount}</span>
            <span className="rounded-full bg-muted px-3 py-2">Both: {selectedPull.lmiUsdaCount}</span>
          </div>}
        </div>

        {(pullsQuery.data ?? []).length === 0 && !pullsQuery.isLoading ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/25 px-5 py-10 text-center">
            <SearchCheck className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">No saved GeoSphere pulls are available yet</p>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">Run a Live Pull in GeoSphere for an area first, then return here and select Sync saved pulls. The dashboard will import only that saved GeoSphere data.</p>
          </div>
        ) : selectedPull ? (
          <>
            <div className="mt-6 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0 flex-1">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search this saved snapshot</span>
                    <input
                      value={listingSearch}
                      onChange={(event) => setListingSearch(event.target.value)}
                      placeholder="Address or property type"
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                  </label>
                </div>
                <label className="block xl:w-52">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort visible listings</span>
                  <Select value={listingSort} onValueChange={(value) => setListingSort(value as GeoSphereInventorySort)}>
                    <SelectTrigger className="mt-1.5 h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="address">Address A–Z</SelectItem>
                      <SelectItem value="price-low">Price: low to high</SelectItem>
                      <SelectItem value="price-high">Price: high to low</SelectItem>
                      <SelectItem value="size-high">Square footage: high to low</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={downloadVisibleInventory} disabled={!visibleListings.length}>
                    <Download className="mr-1.5 h-4 w-4" /> Export visible CSV
                  </Button>
                  {hasInventoryFilters ? <Button variant="ghost" size="sm" onClick={clearInventoryFilters}><X className="mr-1.5 h-4 w-4" /> Clear filters</Button> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Listing overlay filters">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {OVERLAYS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setOverlay(option)}
                    aria-pressed={overlay === option}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${overlay === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                  >
                    <Layers3 className="mr-1 inline-block h-3.5 w-3.5" /> {OVERLAY_LABELS[option]}
                  </button>
                ))}
                <span className="ml-auto text-xs font-semibold text-muted-foreground" aria-live="polite">Showing {visibleListings.length} of {listings.length}</span>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-border">
              {listingsQuery.isLoading ? (
                <div className="flex items-center justify-center py-14 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading saved listings…</div>
              ) : visibleListings.length === 0 ? (
                <div className="py-14 text-center text-sm text-muted-foreground">No listings match the current saved-snapshot search and {OVERLAY_LABELS[overlay]} overlay. <button type="button" onClick={clearInventoryFilters} className="font-semibold text-primary hover:underline">Clear filters</button></div>
              ) : (
                <div className="max-h-[30rem] overflow-auto overscroll-contain [scrollbar-gutter:stable]">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="sticky top-0 z-10 border-b border-border bg-muted/95 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                        <th className="px-4 py-3">Address</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Beds/Baths</th><th className="px-4 py-3">Sq. ft.</th><th className="px-4 py-3">Property type</th><th className="px-4 py-3">Eligibility</th><th className="px-4 py-3 text-right">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleListings.map((listing) => (
                        <tr key={listing.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25">
                          <td className="px-4 py-3 font-medium text-foreground">{listing.address}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{usd(listing.price)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{listing.bedrooms ?? "—"} / {listing.bathrooms ?? "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{listing.squareFootage?.toLocaleString("en-US") ?? "—"}</td>
                          <td className="px-4 py-3">{listing.propertyType ?? "—"}</td>
                          <td className="px-4 py-3"><div className="flex gap-1.5">{listing.isLmi === 1 ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-800">LMI</span> : null}{listing.isUsda === 1 ? <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[11px] font-bold text-emerald-800">USDA RD</span> : null}{listing.isLmi === 0 && listing.isUsda === 0 ? <span className="text-xs text-muted-foreground">General</span> : null}</div></td>
                          <td className="px-4 py-3 text-right"><ListingDetails sourceData={listing.sourceData} address={listing.address} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-primary/15 bg-primary/[0.035] p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Create a property-list email draft</p>
                  <p className="mt-1 text-xs text-muted-foreground">Choose a Roadmap or completed Mortgage Intake Specialist lead. The email opens for your review and includes a plain-text, spreadsheet-style listing table.</p>
                  <Select value={recipientValue} onValueChange={setRecipientValue}>
                    <SelectTrigger className="mt-3 h-10 bg-card"><SelectValue placeholder="Choose a lead recipient" /></SelectTrigger>
                    <SelectContent>
                      {recipients.map((recipient) => <SelectItem key={recipient.value} value={recipient.value}>{recipient.name} · {recipient.email} · {recipient.source}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={openListingDraft} disabled={!visibleListings.length}>
                  <Mail className="mr-1.5 h-4 w-4" /> Open property email draft
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
