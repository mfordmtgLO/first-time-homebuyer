import { ENV } from "./_core/env";
import {
  type GeoSpherePullWrite,
  updateGeoSphereSyncSetting,
  upsertGeoSphereSavedPull,
} from "./db";
import type { GeoSphereExport, GeoSphereSourceListing, GeoSphereSourcePull } from "../shared/geosphere";

function asNullableString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function asNullableInt(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? Math.round(result) : null;
}

function dateFromSource(value: GeoSphereSourcePull["savedAt"]) {
  if (value === undefined || value === null) return null;
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sourceListingKey(listing: GeoSphereSourceListing, index: number) {
  const intrinsicId = listing.id ?? listing.listingId ?? listing.mlsNumber;
  if (intrinsicId !== undefined && intrinsicId !== null && String(intrinsicId).trim()) return String(intrinsicId);
  return [listing.formattedAddress ?? listing.address ?? "listing", listing.latitude ?? "", listing.longitude ?? "", index].join("|");
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function canonicalListings(pull: GeoSphereSourcePull) {
  const lmiKeys = new Set((pull.overlaySets.lmi ?? []).map((listing, index) => sourceListingKey(listing, index)));
  const usdaKeys = new Set((pull.overlaySets.usda ?? []).map((listing, index) => sourceListingKey(listing, index)));
  return (pull.overlaySets.all ?? []).map((listing, index) => {
    const listingKey = sourceListingKey(listing, index);
    return {
      listingKey,
      externalListingId: asNullableString(listing.id ?? listing.listingId ?? listing.mlsNumber),
      address: asNullableString(listing.formattedAddress ?? listing.address) ?? "Address unavailable",
      price: asNullableInt(listing.price),
      bedrooms: asNullableString(listing.bedrooms),
      bathrooms: asNullableString(listing.bathrooms),
      squareFootage: asNullableInt(listing.squareFootage),
      propertyType: asNullableString(listing.propertyType),
      latitude: asNullableString(listing.latitude),
      longitude: asNullableString(listing.longitude),
      isLmi: listing.overlayEligibility?.lmi || lmiKeys.has(listingKey) ? 1 : 0,
      isUsda: listing.overlayEligibility?.usda || usdaKeys.has(listingKey) ? 1 : 0,
      sourceData: safeJson(listing),
    };
  });
}

function toWriteModel(pull: GeoSphereSourcePull): GeoSpherePullWrite {
  const area = pull.area ?? {};
  const listings = canonicalListings(pull);
  return {
    sourceSnapshotId: pull.snapshotId,
    cacheKey: pull.cacheKey,
    areaLabel: area.label || [area.city, area.county, area.zipCode, area.state].filter(Boolean).join(" · ") || pull.cacheKey,
    city: asNullableString(area.city),
    county: asNullableString(area.county),
    zipCode: asNullableString(area.zipCode),
    state: asNullableString(area.state),
    sourceSavedAt: dateFromSource(pull.savedAt),
    listingCount: listings.length,
    lmiCount: listings.filter((listing) => listing.isLmi === 1).length,
    usdaCount: listings.filter((listing) => listing.isUsda === 1).length,
    lmiUsdaCount: listings.filter((listing) => listing.isLmi === 1 && listing.isUsda === 1).length,
    listings,
  };
}

export async function fetchGeoSphereSavedListingExport(): Promise<GeoSphereExport> {
  if (!ENV.geosphereSavedListingsUrl || !ENV.geosphereSyncToken) {
    throw new Error("GeoSphere sync credentials are not configured.");
  }
  const response = await fetch(ENV.geosphereSavedListingsUrl, {
    headers: { "x-geosphere-sync-token": ENV.geosphereSyncToken },
  });
  if (!response.ok) {
    throw new Error(`GeoSphere export request failed with ${response.status}.`);
  }
  const payload = (await response.json()) as GeoSphereExport;
  if (payload.version !== 1 || !Array.isArray(payload.pulls)) {
    throw new Error("GeoSphere export returned an unsupported payload.");
  }
  return payload;
}

export async function syncGeoSphereSavedListings() {
  try {
    const source = await fetchGeoSphereSavedListingExport();
    let listingCount = 0;
    for (const pull of source.pulls) {
      const write = toWriteModel(pull);
      listingCount += write.listingCount;
      await upsertGeoSphereSavedPull(write);
    }
    const result = { pullCount: source.pulls.length, listingCount, syncedAt: new Date() };
    await updateGeoSphereSyncSetting({
      lastSyncedAt: result.syncedAt,
      lastError: null,
      lastPullCount: result.pullCount,
      lastListingCount: result.listingCount,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown GeoSphere sync failure.";
    await updateGeoSphereSyncSetting({ lastError: message });
    throw error;
  }
}
