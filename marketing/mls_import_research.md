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

## Enterprise-platform validation

The user’s example is directionally supported by public vendor materials, but it does not eliminate product-specific contracting and compliance review. Surefire publicly advertises Single Property Sites, describes them as pages featuring MLS images and specifications, and says it has access to multiple data sources. Total Expert publicly describes direct integrations with many MLS providers and the ability to populate co-marketing materials and single-property websites with descriptions and photos. ICE advertises MLS/listings data through its RPR relationship. These materials establish that enterprise mortgage-marketing platforms can offer this capability; they do not establish that every lender subscription automatically has downstream display rights, specific photo/remark rights, or authority for every zero-cost realtor co-branding scenario.

Bridge’s own documentation confirms the governing model: an MLS or other provider controls access; applications may require data-provider approval, licenses, fees, and compliance testing; feed types have distinct field-level rules; and data providers can change field payloads and restrictions. Bridge says access can be shared with third parties only when the approving MLS allows it. The engineering design should therefore use the provider’s granted feed type, field metadata, and data-license status as runtime controls, rather than assume rights based on an MLS number or a listing’s public web visibility.

## Co-branding and lead-routing decision record

The platform can support a lender-paid, zero-dollar single-property site only after corporate compliance confirms the proposed site, agent attribution, lead capture, and lead-routing workflow. The technical system should expose a compliance status per property page; prohibit publishing an enterprise-enriched page until the active data feed confirms permitted fields; include required listing/broker attribution; honor withdrawn/restricted listing status; and retain audit records for page creation, refresh, recipient assignment, and lead routing. Whether the arrangement satisfies RESPA Section 8, fair-lending requirements, state law, company policy, and any agent-specific agreement is a legal/compliance decision, not an API capability.

## Enterprise-model comparison and approval questions

| Topic | What the reviewed vendor materials support | What remains to be approved |
|---|---|---|
| Single-property page capability | Surefire advertises MLS-driven single-property sites and Total Expert advertises MLS-populated property descriptions and photos. | The exact data source, field set, and display rights attached to the borrower’s or lender’s subscription. |
| Enterprise data delivery | ICE advertises licensing of MLS/listings data; Bridge supports data-provider-managed API access and licenses. | Whether Cornerstone or its selected vendor has a contract allowing this application to display and share each requested photo, remark, agent/broker field, and property URL. |
| Realtor participation | Enterprise platforms can centralize data access and content workflows. | Whether a listing agent, listing brokerage, Participant Broker, or MLS authorization is required for a given listing, feed type, or co-brand display. |
| Cost allocation | Total Expert describes co-marketing templates designed to support cost splitting for compliance. | Whether lender-funded hosting, agent branding, leads, routing, advertising, or other value is a reportable marketing benefit under corporate policy and applicable law. |
| Lead routing | The proposed system can route leads by saved LO-agent page assignment and retain audit records. | Whether all or any leads may be routed to the agent, what notice/consent is required, and whether the routing or follow-up is linked to listing display rights. |

The clearest implementation route is to obtain the vendor’s written product/data-use confirmation for the intended lender-branded single-property pages, have corporate compliance approve the zero-cost agent-display and routing model, then add an optional provider adapter. That adapter will query by MLS number and MLS source, save only provider-approved fields, attach the supplied attribution and expiration metadata, and automatically retire a page when the provider reports a withdrawal, restriction, or changed display permission.

## Sources

1. RentCast Property Listings: https://developers.rentcast.io/reference/property-listings
2. RentCast Property Listings Schema: https://developers.rentcast.io/reference/property-listings-schema
3. RESO Web API: https://www.reso.org/reso-web-api/
4. RMLS Web API Documentation: https://rmlscentral.com/reso-api-documentation/
5. Surefire CRM, Single Property Sites: https://www.topofmind.com/surefire-crm/
6. Total Expert, Co-Marketing & Referral Relationships: https://www.totalexpert.com/blog/fostering-co-marketing-referral-relationships
7. ICE Mortgage Technology Data: https://mortgagetech.ice.com/solutions/data
8. Bridge Data Output API Documentation: https://bridgedataoutput.com/docs/platform/API/bridge
