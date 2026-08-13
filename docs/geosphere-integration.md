# GeoSphere Saved-Listing Integration

The dashboard imports **only manually refreshed GeoSphere snapshots** from the GeoSphere source project at `https://github.com/mfordmtgLO/geosphere-map-oregon`.

## Server-to-server contract

| Item | Value |
| --- | --- |
| Production export URL | `https://geosphere-map-oregon.vercel.app/api/saved-listings` |
| Request method | `GET` |
| Authorization header | `x-geosphere-sync-token: <GEOSPHERE_SYNC_TOKEN>` |
| Source persistence | Vercel KV, 30-day saved snapshot TTL |
| Response behavior | Cache-only; never calls Rentcast |
| Response format | JSON `{ version: 1, generatedAt, pulls }` |

GeoSphere classifies and persists four overlays for each new Live Pull: `all`, `lmi`, `usda`, and `lmiUsda`. The dashboard stores a normalized copy keyed by the GeoSphere source snapshot ID, making repeated imports idempotent.

## Initial verified import

On 2026-08-13, the dashboard successfully imported the existing Coos Bay snapshot: **116 listings** from a source cache timestamp of 2026-08-10. That snapshot pre-dated persisted overlay sets, so its LMI, USDA RD, and dual-overlay counts are zero. Run a new GeoSphere **Live Pull** for any existing area to replace its 30-day snapshot with overlay-classified data; use **Saved Listings** afterward to browse it without calling Rentcast.

## Required secrets

The same random token must be set as `GEOSPHERE_SYNC_TOKEN` in the GeoSphere Vercel project and in this dashboard’s secure environment settings. The dashboard endpoint value is stored as `GEOSPHERE_SAVED_LISTINGS_URL`.

## Weekly import

The dashboard provides a secured `/api/scheduled/geosphere-sync` callback for a project-level weekly job. The site must be published before the job is created, and the schedule must use a six-field UTC cron expression. The selected cron task UID is stored in `geosphere_sync_setting.scheduleCronTaskUid`.
