export type PropertySnapshotAgent = {
  name: string;
  email: string;
  phone: string;
};

export type PropertyLandingSnapshot = {
  listingId: number;
  savedPullId: number;
  address: string;
  price: number | null;
  bedrooms: string | null;
  bathrooms: string | null;
  squareFootage: number | null;
  lotSize: number | null;
  acreage: number | null;
  propertyTaxes: number | null;
  units: string | null;
  propertyType: string | null;
  manufacturedHomeType: string | null;
  yearBuilt: number | null;
  mlsName: string | null;
  mlsNumber: string | null;
  description: string | null;
  photoUrls: string[];
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  isLmi: boolean;
  isUsda: boolean;
  listingAgent: PropertySnapshotAgent | null;
  sourceSavedAt: string | null;
};

type SavedListingLike = {
  id: number;
  savedPullId: number;
  address: string;
  price: number | null;
  bedrooms: string | null;
  bathrooms: string | null;
  squareFootage: number | null;
  propertyType: string | null;
  latitude: string | null;
  longitude: string | null;
  isLmi: number;
  isUsda: number;
  sourceData: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function firstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(source[key]);
    if (value) return value;
  }
  return null;
}

function firstNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function extractPhotoUrls(source: Record<string, unknown>) {
  const candidates = [source.photoUrls, source.photos, source.images, source.listingPhotos, source.imageUrls];
  const urls = candidates.flatMap((value) => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (typeof item === "string") return [item.trim()];
      const row = asRecord(item);
      return [row.url, row.href, row.src, row.originalUrl].flatMap((candidate) => {
        const url = asString(candidate);
        return url ? [url] : [];
      });
    });
  });
  return Array.from(new Set(urls.filter((url) => /^https?:\/\//i.test(url)))).slice(0, 12);
}

function extractListingAgent(source: Record<string, unknown>): PropertySnapshotAgent | null {
  const agent = asRecord(source.listingAgent);
  const name = asString(agent.name) ?? "";
  const email = asString(agent.email) ?? "";
  const phone = asString(agent.phone) ?? "";
  return name || email || phone ? { name, email, phone } : null;
}

/** Creates a conservative property payload from one saved GeoSphere listing and its raw snapshot fields. */
export function buildPropertyLandingSnapshot(listing: SavedListingLike, sourceSavedAt?: Date | string | null): PropertyLandingSnapshot {
  let source: Record<string, unknown> = {};
  try {
    source = asRecord(JSON.parse(listing.sourceData));
  } catch {
    source = {};
  }
  const propertyType = firstString(source, ["propertyType", "propertySubType", "subType"]) ?? listing.propertyType;
  const manufactured = firstString(source, ["manufacturedHomeType", "manufacturedType", "mobileHomeType"]);
  const description = firstString(source, ["description", "listingDescription", "remarks", "publicRemarks"]);
  return {
    listingId: listing.id,
    savedPullId: listing.savedPullId,
    address: listing.address,
    price: listing.price,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    squareFootage: listing.squareFootage,
    lotSize: firstNumber(source, ["lotSize", "lotSizeSquareFeet", "lotSqft"]),
    acreage: firstNumber(source, ["acreage", "lotAcreage", "lotSizeAcres"]),
    propertyTaxes: firstNumber(source, ["propertyTaxes", "annualPropertyTax", "taxes"]),
    units: firstString(source, ["units", "unitCount", "numberOfUnits"]),
    propertyType,
    manufacturedHomeType: manufactured,
    yearBuilt: firstNumber(source, ["yearBuilt"]),
    mlsName: firstString(source, ["mlsName"]),
    mlsNumber: firstString(source, ["mlsNumber"]),
    description,
    photoUrls: extractPhotoUrls(source),
    latitude: asNumber(source.latitude) ?? asNumber(listing.latitude),
    longitude: asNumber(source.longitude) ?? asNumber(listing.longitude),
    status: firstString(source, ["status", "listingStatus"]),
    isLmi: listing.isLmi === 1,
    isUsda: listing.isUsda === 1,
    listingAgent: extractListingAgent(source),
    sourceSavedAt: sourceSavedAt ? new Date(sourceSavedAt).toISOString() : null,
  };
}

export function parsePropertyLandingSnapshot(value: string): PropertyLandingSnapshot | null {
  try {
    const parsed = JSON.parse(value) as Partial<PropertyLandingSnapshot>;
    if (!parsed || typeof parsed.address !== "string" || typeof parsed.listingId !== "number") return null;
    return parsed as PropertyLandingSnapshot;
  } catch {
    return null;
  }
}

export function propertyEligibilityLabel(snapshot: Pick<PropertyLandingSnapshot, "isLmi" | "isUsda">) {
  if (snapshot.isLmi && snapshot.isUsda) return "OHCS Flex Lending or USDA RD potential";
  if (snapshot.isLmi) return "OHCS Flex Lending potential";
  if (snapshot.isUsda) return "USDA RD potential";
  return "Financing options to review";
}

/** Conservative education copy for saved map screens; this is not a program approval or property eligibility determination. */
export function propertyFinancingContext(snapshot: Pick<PropertyLandingSnapshot, "isLmi" | "isUsda">) {
  if (snapshot.isLmi && snapshot.isUsda) {
    return "This saved screening may make it worth exploring OHCS Flex Lending or USDA RD as potential low- or no-down-payment first-time-buyer pathways, subject to current program rules and borrower, property, income, credit, and loan approval requirements.";
  }
  if (snapshot.isLmi) {
    return "This saved LMI screen may make OHCS Flex Lending worth exploring as a potential low-down-payment first-time-buyer pathway, subject to current program rules and borrower, property, income, credit, and loan approval requirements.";
  }
  if (snapshot.isUsda) {
    return "This saved USDA RD screen may make USDA Rural Development financing worth exploring as a potential low- or no-down-payment first-time-buyer pathway, subject to current program rules and borrower, property, income, credit, and loan approval requirements.";
  }
  return null;
}

export function slugifyPropertyAddress(address: string) {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "saved-property";
}
