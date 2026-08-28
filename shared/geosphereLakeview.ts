export type LakeviewNationalReview = {
  available: boolean;
  reviewReady: boolean;
  state: string | null;
  county: string | null;
  defaultListingPriceCap: number | null;
  priceWithinDefaultCap: boolean | null;
  property: {
    stickBuiltOneToFour: boolean;
    unitCount: number | null;
    manufactured: boolean;
  } | null;
};

type SourceListing = {
  overlayEligibility?: {
    lakeviewNational?: Partial<LakeviewNationalReview>;
  };
};

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableAmount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Reads additive upstream Lakeview review metadata from a saved GeoSphere listing snapshot. */
export function parseLakeviewNationalReview(sourceData: string): LakeviewNationalReview | null {
  try {
    const source = JSON.parse(sourceData) as SourceListing;
    const value = source.overlayEligibility?.lakeviewNational;
    if (!value || typeof value !== "object") return null;
    const propertyValue = value.property;
    const property = propertyValue && typeof propertyValue === "object"
      ? {
          stickBuiltOneToFour: propertyValue.stickBuiltOneToFour === true,
          unitCount: typeof propertyValue.unitCount === "number" && Number.isInteger(propertyValue.unitCount) && propertyValue.unitCount >= 1 && propertyValue.unitCount <= 4 ? propertyValue.unitCount : null,
          manufactured: propertyValue.manufactured === true,
        }
      : null;
    return {
      available: value.available === true,
      reviewReady: value.reviewReady === true,
      state: nullableText(value.state),
      county: nullableText(value.county),
      defaultListingPriceCap: nullableAmount(value.defaultListingPriceCap),
      priceWithinDefaultCap: value.priceWithinDefaultCap === true ? true : value.priceWithinDefaultCap === false ? false : null,
      property,
    };
  } catch {
    return null;
  }
}

/** Matches the upstream Lakeview map review screen only; it is never a property or borrower qualification. */
export function isLakeviewNationalReviewMatch(sourceData: string) {
  const review = parseLakeviewNationalReview(sourceData);
  return Boolean(
    review?.available
    && review.reviewReady
    && review.priceWithinDefaultCap === true
    && review.property?.stickBuiltOneToFour === true
    && review.property.manufactured === false
    && review.defaultListingPriceCap !== null
  );
}

export function lakeviewNationalReviewLabel(review: LakeviewNationalReview | null) {
  if (!review || !isLakeviewNationalReviewMatch(JSON.stringify({ overlayEligibility: { lakeviewNational: review } }))) return null;
  const location = [review.state, review.county ? `${review.county} County` : null].filter(Boolean).join(" · ");
  const unitLabel = review.property?.unitCount ? ` · ${review.property.unitCount}-unit` : "";
  const cap = review.defaultListingPriceCap!.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return `Lakeview review${location ? ` · ${location}` : ""}${unitLabel} · price screen ${cap}`;
}
