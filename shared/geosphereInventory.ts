export type GeoSphereInventoryListing = {
  address: string;
  price: number | null;
  bedrooms: string | number | null;
  bathrooms: string | number | null;
  squareFootage: number | null;
  propertyType: string | null;
  isLmi: boolean | number;
  isUsda: boolean | number;
  propertyTaxes?: number | null;
  units?: string | null;
  hoaDues?: number | null;
};

export type GeoSphereInventorySort = "address" | "price-low" | "price-high" | "size-high";

export function filterAndSortGeoSphereListings<T extends GeoSphereInventoryListing>(
  listings: T[],
  query: string,
  sort: GeoSphereInventorySort
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? listings.filter((listing) =>
        [listing.address, listing.propertyType]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))
      )
    : [...listings];

  return filtered.sort((a, b) => {
    if (sort === "price-low") return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
    if (sort === "price-high") return (b.price ?? -1) - (a.price ?? -1);
    if (sort === "size-high") return (b.squareFootage ?? -1) - (a.squareFootage ?? -1);
    return a.address.localeCompare(b.address);
  });
}

function escapeCsvCell(value: string | number | null) {
  const normalized = value === null ? "" : String(value);
  return /[",\n]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
}

export function buildGeoSphereInventoryCsv(listings: GeoSphereInventoryListing[]) {
  const headers = ["Address", "Price", "Bedrooms", "Bathrooms", "Square footage", "Property type", "Property taxes (annual)", "Units", "HOA dues (monthly)", "LMI", "USDA RD eligible"];
  const rows = listings.map((listing) => [
    listing.address,
    listing.price,
    listing.bedrooms,
    listing.bathrooms,
    listing.squareFootage,
    listing.propertyType,
    listing.propertyTaxes ?? null,
    listing.units ?? null,
    listing.hoaDues ?? null,
    Boolean(listing.isLmi) ? "Yes" : "No",
    Boolean(listing.isUsda) ? "Yes" : "No",
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}
