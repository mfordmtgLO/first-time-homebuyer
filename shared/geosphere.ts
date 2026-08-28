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
  overlayEligibility?: {
    lmi?: boolean;
    usda?: boolean;
    lakeviewNational?: {
      available?: boolean;
      reviewReady?: boolean;
      state?: string | null;
      county?: string | null;
      defaultListingPriceCap?: number | null;
      priceWithinDefaultCap?: boolean | null;
      property?: { stickBuiltOneToFour?: boolean; unitCount?: number | null; manufactured?: boolean };
    };
    [key: string]: unknown;
  };
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
  /** Additive source-owned review sets. Version 1 consumers may safely ignore them. */
  programReviewSets?: Record<string, GeoSphereSourceListing[]>;
  programReviewConfiguration?: { version?: string; programs?: Array<{ id?: string; label?: string; [key: string]: unknown }> };
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
