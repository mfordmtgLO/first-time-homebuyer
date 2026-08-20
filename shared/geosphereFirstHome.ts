export type FirstHomeAreaType = "targeted" | "non_targeted";

export type FirstHomeScreening = {
  available: boolean;
  priceEligible: boolean | null;
  lmiEligible: boolean;
  areaType: FirstHomeAreaType | null;
  priceLimit: number | null;
  county: string | null;
};

type SourceListing = {
  overlayEligibility?: {
    firstHome?: Partial<FirstHomeScreening>;
  };
};

/** Reads only additive GeoSphere overlay metadata already retained with a saved listing snapshot. */
export function parseFirstHomeScreening(sourceData: string): FirstHomeScreening | null {
  try {
    const source = JSON.parse(sourceData) as SourceListing;
    const value = source.overlayEligibility?.firstHome;
    if (!value || typeof value !== "object") return null;
    const areaType = value.areaType === "targeted" || value.areaType === "non_targeted" ? value.areaType : null;
    const priceLimit = typeof value.priceLimit === "number" && Number.isFinite(value.priceLimit) ? value.priceLimit : null;
    return {
      available: value.available === true,
      priceEligible: value.priceEligible === true ? true : value.priceEligible === false ? false : null,
      lmiEligible: value.lmiEligible === true,
      areaType,
      priceLimit,
      county: typeof value.county === "string" && value.county.trim() ? value.county.trim() : null,
    };
  } catch {
    return null;
  }
}

/** Matches GeoSphere’s FirstHome LMI plus maximum-purchase-price overlay screen. */
export function isFirstHomeLmiPriceEligible(sourceData: string) {
  const screening = parseFirstHomeScreening(sourceData);
  return Boolean(screening?.available && screening.lmiEligible && screening.priceEligible === true && screening.priceLimit !== null);
}

export function firstHomeScreeningLabel(screening: FirstHomeScreening | null) {
  if (!screening?.available || !screening.lmiEligible || screening.priceEligible !== true || screening.priceLimit === null) return null;
  return `FirstHome ${screening.areaType === "targeted" ? "targeted" : "non-targeted"} · max ${screening.priceLimit.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`;
}
