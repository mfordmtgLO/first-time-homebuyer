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

Checkpoint `bea849d1` deployed the explicit `Accept: application/json` tRPC transport fix. The served client asset advanced to `index-Cfi0keRm.js`, and a fresh cache-busting dashboard session loaded without an immediate error. The final authenticated Sync Top Agents action remains to be tested.

The JSON-only transport changed the live error from an HTML parsing failure to `Unable to transform response from server`, demonstrating that the protected request now reaches the server and receives JSON. Checkpoint `247c38e7` therefore normalizes the completed refresh response to only plain JSON-safe primitives and arrays, with an empty fallback for omitted movement metadata. Its deployment has completed; the final live retry is now pending.

A fresh cache-busting authenticated dashboard session is loaded after checkpoint `247c38e7`, and the owner-only **Sync Top Agents** control is visible for the closing normalized-response verification.

Checkpoint `23414e8d` deployed the final lightweight acknowledgement contract. A fresh authenticated dashboard session is loaded and the owner-only **Sync Top Agents** control is ready for the closing live verification.

The lightweight tRPC acknowledgement still produced `Unable to transform response from server`, confirming the production issue is in the tRPC response path itself rather than the Oregon source payload. A protected JSON-only `POST /api/oregon-sync-refresh` endpoint now reuses the exact same owner-scoped refresh helper while bypassing tRPC response transformation. Its local unauthenticated probe returns `401 application/json`, and the full regression suite passes. Production verification remains pending deployment.

Checkpoint `a60f169c` deployed the protected JSON fallback successfully. A fresh authenticated dashboard session has loaded and the owner-only **Sync Top Agents** control is ready for the closing fallback-route verification.

Checkpoint `d9336001` deployed the safe fallback diagnostic. The current browser session is authenticated and the owner-only **Sync Top Agents** control is visible for the final request inspection.

The diagnostic client is deployed and the endpoint is live; the dashboard interaction map refreshed before the final click could be sent. The next step is a new control snapshot followed by the same owner-authorized fallback request.

Checkpoint `68f4498b` deployed the storage-safe client. A fresh authenticated dashboard session has loaded all private dashboard data successfully; the owner-only **Sync Top Agents** control is next for final verification.

The storage-safe live request authenticated successfully and returned `502 application/json`, which confirms the browser transport and dashboard session are now working. The remaining failure is inside the server-to-server Oregon refresh; checkpoint `451d96c7` adds safe deployment-log visibility for its exact non-secret cause.

The logging build is deployed and loaded in a fresh authenticated dashboard session. The owner-only **Sync Top Agents** control is visible and ready for the diagnostic refresh.

The protected-refresh log identified the exact cause: `The Oregon agent directory returned an unexpected export format.` The combined source intentionally assigns stable negative IDs to derived principal-broker records. The dashboard export schema incorrectly required positive IDs, rejecting every combined refresh even though the records are valid. The schema now accepts any nonzero integer and regression coverage verifies that a negative principal-broker ID is imported through the guarded owner-scoped path.
