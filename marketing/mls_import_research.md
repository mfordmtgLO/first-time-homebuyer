# Authorized MLS-Number Import Research

## Current saved-snapshot capability

The existing GeoSphere snapshot contract already preserves a listing identifier, optional MLS name and MLS number, address, price, beds, baths, square footage, property type, coordinates, listing-agent contact information, description, and optional photo URLs. The current public property-page builder safely uses only the fields present in that saved snapshot.

## RentCast path

RentCast documents nationwide sale and rental listing endpoints with address, property attributes, status, price, MLS name/number, agent and office information, and listing history. Its documentation states that listing data is gathered from public sources rather than directly from MLS systems, is typically updated at least daily, and may appear 12–24 hours after publication. The reviewed listing schema shows MLS metadata and agent fields, but does not document public remarks or listing-photo fields in the returned schema. An MLS number is therefore useful for matching a saved record, but should not be treated as authorization to republish MLS photos or REALTOR® remarks.

## Oregon licensed MLS path

RMLS documents an authorized RESO Web API pathway for Oregon and Southwest Washington. RMLS says its API is for products built for RMLS subscribers and supports IDX, CRM, VOW, print/digital marketing, and other licensed products. Its onboarding requires a relationship with an RMLS subscriber, an executed Listing Content License Agreement involving the subscriber, Participant Broker, and product company, RMLS product review, and then credentials. The API exposes Property and Media resources; RMLS documents `$expand=Media` for photos and supports filtering the Property resource by MLS fields after the feed contract defines the permitted fields. RMLS-specific display, attribution, refresh, and withdrawal requirements must be implemented from the executed license and RMLS review feedback.

## RESO standard

RESO supplies the data-transport standards, not listing data. RESO states that data access is obtained from local MLS organizations after agreeing to their data-use and licensing policies. A RESO-compatible feed is therefore the technical integration method, while the local MLS license controls actual photo, remarks, attribution, and display rights.

## Recommended approved-data design

1. Retain current GeoSphere snapshots for eligibility screening and non-live lead-generation pages.
2. Add an optional `MLS enrichment` provider adapter that remains disabled until an executed MLS/IDX/RESO license is approved and credentials are supplied.
3. Query by MLS number plus MLS name, import only fields permitted by the provider response and license, retain source name, source listing key, retrieval time, attribution, media copyright/display instruction, and content expiration/withdrawal status.
4. Never scrape other CRMs, MLS public pages, consumer portals, photos, or remarks.
5. On an active enrichment, use provider modification status and media update time to refresh, retire, or remove the public page according to the license; retain the existing saved-snapshot disclaimer while enrichment is not active.

## Sources

1. RentCast Property Listings: https://developers.rentcast.io/reference/property-listings
2. RentCast Property Listings Schema: https://developers.rentcast.io/reference/property-listings-schema
3. RESO Web API: https://www.reso.org/reso-web-api/
4. RMLS Web API Documentation: https://rmlscentral.com/reso-api-documentation/
