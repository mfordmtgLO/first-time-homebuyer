import { describe, expect, it } from "vitest";

const endpoint = process.env.GEOSPHERE_SAVED_LISTINGS_URL;
const syncToken = process.env.GEOSPHERE_SYNC_TOKEN;

describe("GeoSphere saved-listing connection", () => {
  it("authenticates to the protected cache-only export endpoint", async () => {
    expect(endpoint).toMatch(/^https:\/\//);
    expect(syncToken).toBeTruthy();

    const response = await fetch(endpoint!, {
      headers: { "x-geosphere-sync-token": syncToken! },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      version: 1,
      pulls: expect.any(Array),
    });
  }, 20_000);
});
