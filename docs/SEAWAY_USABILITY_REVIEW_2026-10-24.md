# Seaway interaction review — October 24, 2026

Question: can a first-time visitor compare viewing locations, inspect a ship or lock, and return to the right evidence without losing context?

| Failure | Evidence | Repair / acceptance |
| --- | --- | --- |
| A chosen comparison disappears | Live browser: Both countries → Iroquois changes the filter to Canada and hides the U.S. card. | Both countries is the default; choosing a site preserves that setting. Explicit country choice persists in shared URLs and Back. |
| Old ship detail survives a region change | `setRegion` cleared the selected ship but left its map detail intact. Lock/place selection could also retain the old ship, allowing the next refresh to replace the new inspection. | Scope changes reset the map detail; lock/place inspection clears the prior ship. Filtering the selected ship out removes its detail and popup. |
| “Check ships” changes an offscreen map | The viewing-detail action only changed the region. | It selects the region and scrolls back to ship watch. |
| Missing evidence looks like quiet water | Initial load and source failure used the same ship-list empty state as a successfully checked quiet region. | Separate loading, unavailable, filtered and quiet states. A filter reset preserves the chosen region. |
| Regional evidence disappears from summaries | Summary cards read only the active scope, forgetting the already checked whole corridor. An older regional cache also took precedence over a newer whole-river check. | Each summary uses the newer relevant cache; an unavailable wider check retains the available regional snapshot. Freshness filtering still applies. Active region is visibly marked and exposed with `aria-pressed`. |

The repair keeps the existing map, camera placement, Google Maps destinations, lock model and historical charts. No additional dashboard or visual redesign was needed. No ad settings changed.

`tests/seaway-ui.test.js` exercises actual navigation/actions, with network and unrelated chart renderers isolated. Existing data/camera tests remain. Browser acceptance and exact deployment status are recorded in the release PR; automated tests are not evidence of human task success. Mobile portrait browser QA and GSC/GA4/AdSense measurements are not claimed here.
