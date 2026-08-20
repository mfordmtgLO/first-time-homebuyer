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
  homeownerInsurance?: number | null;
  mortgageInsurance?: number | null;
};

const EXPORT_ESTIMATE_RATE = 0.065;
const EXPORT_ESTIMATE_DOWN_PAYMENT_PERCENT = 0.05;

export function estimateExportMonthlyPrincipalAndInterest(price: number | null) {
  if (price === null || !Number.isFinite(price) || price < 0) return null;
  const loanAmount = price * (1 - EXPORT_ESTIMATE_DOWN_PAYMENT_PERCENT);
  const monthlyRate = EXPORT_ESTIMATE_RATE / 12;
  const months = 30 * 12;
  return Math.round((loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)) * 100) / 100;
}

export function estimateExportTotalMonthlyPayment(listing: Pick<GeoSphereInventoryListing, "price" | "propertyTaxes" | "hoaDues" | "homeownerInsurance" | "mortgageInsurance">) {
  const principalAndInterest = estimateExportMonthlyPrincipalAndInterest(listing.price);
  if (principalAndInterest === null) return null;
  return Math.round((principalAndInterest + Math.max(listing.propertyTaxes ?? 0, 0) / 12 + Math.max(listing.hoaDues ?? 0, 0) + Math.max(listing.homeownerInsurance ?? 0, 0) + Math.max(listing.mortgageInsurance ?? 0, 0)) * 100) / 100;
}

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
  const headers = ["Address", "Price", "Bedrooms", "Bathrooms", "Square footage", "Property type", "Property taxes (annual)", "Units", "HOA dues (monthly)", "Homeowner insurance (monthly)", "Mortgage insurance (monthly)", "Estimated P&I/month (30y, 6.5%, 5% down)", "Estimated total monthly payment (P&I + taxes + HOA + home insurance + mortgage insurance)", "LMI", "USDA RD eligible"];
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
    listing.homeownerInsurance ?? null,
    listing.mortgageInsurance ?? null,
    estimateExportMonthlyPrincipalAndInterest(listing.price),
    estimateExportTotalMonthlyPayment(listing),
    Boolean(listing.isLmi) ? "Yes" : "No",
    Boolean(listing.isUsda) ? "Yes" : "No",
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}
