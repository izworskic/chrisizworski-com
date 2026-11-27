# Ontario and New York 511 configuration

The existing Niagara approach-context route uses official developer APIs. It never supplies crossing delay estimates or changes the bridge recommendation. An empty successful event list is not an outage; an authentication failure, malformed response or missing key is not an empty list.

## Setup

1. Register or sign in to the owner's Ontario 511 developer account at https://511on.ca/developers/doc and obtain an authorized API key. The API requires a developer key for events and cameras. Register separately at https://511ny.org/developers for the New York feed if desired.
2. In the owning Vercel project (verify that its production domain is chrisizworski.com), add sensitive environment variables ONTARIO511_API_KEY and, separately, NY511_API_KEY in Production. Do not commit, print, or paste keys into a chat or PR. Use Preview only if the owner intends to test there.
3. Redeploy through the normal reviewed main release path so the functions receive the production environment.
4. Verify https://chrisizworski.com/api/niagara-approach-context returns sources.ontario.configured=true, available=true, complete=true, events_status=available and cameras_status=available. New York has an independent state. A valid empty array can be available. Confirm Sentinel's on511-events contract on the next sweep; leave the critical finding open if the adapter is not available.

No account, key or deployment was created in this change. No public unauthenticated workaround is assumed. Existing official fallback links remain visible. No new route, schedule, paid service, or data store.
