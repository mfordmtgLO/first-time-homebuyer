export type GeoSphereOverlayKey = "all" | "lmi" | "usda" | "lmiUsda";

export type GeoSphereSourceListing = {
  id?: string | number | null;
  listingId?: string | number | null;
  mlsNumber?: string | null;
  formattedAddress?: string | null;
  address?: string | null;
  price?: number | null;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  squareFootage?: number | null;
  propertyType?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  overlayEligibility?: { lmi?: boolean; usda?: boolean };
  [key: string]: unknown;
};

export type GeoSphereSourcePull = {
  snapshotId: string;
  cacheKey: string;
  area?: { label?: string; city?: string | null; county?: string | null; zipCode?: string | null; state?: string | null };
  savedAt?: number | string | null;
  count?: number;
  totalFetched?: number;
  overlaySets: Record<GeoSphereOverlayKey, GeoSphereSourceListing[]>;
};

export type GeoSphereExport = {
  version: 1;
  generatedAt: string;
  pulls: GeoSphereSourcePull[];
};

export const OVERLAY_LABELS: Record<GeoSphereOverlayKey, string> = {
  all: "All eligible",
  lmi: "LMI",
  usda: "USDA RD",
  lmiUsda: "LMI + USDA RD",
};
