# Oregon Sync Verification Log

## Baseline before combined-source refresh

- **Timestamp:** 2026-08-18 PDT
- **Dashboard:** `https://firsttimehomebuyer.manus.space/leads#co-marketing-agents`
- **Prior dashboard state:** 60 imported Oregon source profiles.
- **Source deployment confirmed by owner:** Combined Oregon source directory/export deployment completed after the principal-broker coverage repair.
- **Expected refresh result:** 60 top agents plus derived standalone principal/managing principal broker records, including Tiffany Johnson as a principal broker for RE/MAX Integrity office #23.

The next step is an owner-authorized dashboard refresh followed by database-level verification of total, record-type counts, duplicate source IDs, rank denominators, and Tiffany Johnson's retained office context.

## Refresh execution

The dashboard owner-authorized **Sync Top Agents** action was triggered after the combined-source deployment. The following verification will use the persisted owner-scoped records rather than relying solely on the dashboard counter.

## Connection correction

The initial production refresh returned an HTML document where JSON was expected. The protected connection test independently verified that the Oregon endpoint returned the required JSON payload with the configured bearer token. The dashboard was updated to use the canonical endpoint `https://oregonleads-bqkuz5cc.manus.space/api/sync/agents?state=Oregon`; this configuration and its regression test were deployed in dashboard checkpoint `a7e75481`.

After the checkpoint and managed-service restart, the published dashboard still showed the previous 60-record baseline and returned the same HTML parsing error on a browser-triggered refresh. The protected endpoint remains independently reachable and returns JSON under the configured token, so the next recovery step must use the validated source payload with the application’s standard owner-scoped upsert routine, then verify persisted records directly.

## Completed verification

The owner-authorized recovery refresh reused the application’s normal `upsertSyncedTopAgents` routine and persisted all **97** unique Oregon source profiles: **60** top-agent records and **37** standalone principal-broker records. A direct owner-scoped database verification found no rank above its declared pool. Tiffany Johnson is now present as a standalone `principal_broker` record with **Office #23/87**, **RE/MAX Integrity**, and the title **Managing Principal Broker**.

The source denominator correction was published as Oregon Agent Leads commit `0004572` (`Use full Oregon pool for broker rank labels`). Focused source export tests passed after the rebase, covering standalone broker links and full-pool rank denominators. The dashboard source URL configuration and summary update were published as dashboard checkpoint `a7e75481`.

## Token-error follow-up

On 2026-08-19, an authenticated dashboard click on **Sync Top Agents** reproduced a raw `Unexpected token '<'` error, indicating that the published refresh path had received HTML rather than the protected JSON payload. The configured bearer-authenticated connection test still passed against the canonical Oregon export. The dashboard source URL was re-pinned to `https://oregonleads-bqkuz5cc.manus.space/api/sync/agents?state=Oregon`, and checkpoint `62e79213` adds content-type validation so a future non-JSON response produces a clear actionable dashboard error instead of a raw parsing failure. Final owner-triggered refresh verification remains pending after the new deployment starts.

The first browser retry after checkpoint `62e79213` still displayed the pre-existing raw parsing toast. This indicates that the published browser session continued to reach an older refresh implementation or another deployment-routing path; it does not invalidate the independently passing bearer-authenticated export connection test. Further production route diagnosis is required before the tracker item can be completed.

Deployment success was confirmed after that stale-browser retry. A new cache-busting dashboard load no longer showed the retained parsing toast, so the next verification must trigger a fresh owner-authorized **Sync Top Agents** action against the newly deployed instance.

The first fresh click after deployment still produced the raw parsing toast. The authenticated source test was then rerun after a secure re-entry of `OREGON_AGENT_SYNC_TOKEN` and passed. Checkpoint `1c7d0ef3` publishes that refreshed secret so the production server restarts with the exact revalidated shared token. A final post-restart browser verification is required before closing the issue.

The post-restart browser refresh continued to display the legacy raw parser message even though the revalidated protected export test passed. The next repair will route the refreshed client through a new versioned protected tRPC procedure, retaining the same owner-scoped upsert logic, so the current published client and server implementation are explicitly aligned.

The versioned `agentSync.syncOregonRefresh` procedure now reuses the same server-side authenticated JSON import helper as the legacy procedure, and the dashboard client now targets the versioned route. Focused router and authenticated-source tests pass. The client-bundle fingerprint will change on the next checkpoint, ensuring the browser calls the new protected route rather than retaining the legacy client action.

Checkpoint `789de51b` has been loaded through a cache-busting dashboard URL. The page rendered without the old error toast, and the current Co-marketing Agents control is ready for the final owner-authorized versioned refresh test.

The initial click occurred before the production rollout completed and still reached the older client bundle. Production deployment has since confirmed successfully, and the served dashboard asset changed from `index-BJErPbMS.js` to `index-D1PmDpQi.js`, confirming that the versioned refresh client bundle is now available for the final browser test.

The post-rollout dashboard load at `?syncfix=789de51b-live` rendered without an error toast and exposed the owner-authenticated **Sync Top Agents** control. The next click is the definitive versioned-route verification.

The final post-rollout click completed with the raw parser error still present. The complete served production bundle was downloaded and confirmed to invoke `agentSync.syncOregonRefresh`, so browser caching is no longer a plausible cause. The remaining likely fault is a stale or malformed production source-URL setting reaching the server-side fetch; the next repair will pin the Oregon-only route directly in the server import helper while retaining the bearer token secret.

Checkpoint `656bd73a` deployed the pinned canonical endpoint correction successfully. A fresh cache-busting dashboard load has no error toast and shows the owner-authenticated **Sync Top Agents** control ready for the final server-side refresh verification.
