# Seaway AIS source reliability and coverage audit — 2026-11-07

## Evidence from public production
At approximately 13:37 UTC on Nov. 7, public GET /api/st-lawrence-seaway?region=all succeeded with 23 recent reports. Five independently checked source regions were Montreal (13), Beauharnois (3), Massena (0), Iroquois (0), and Thousand Islands (7). The two empty regions returned successful Open Waters GeoJSON FeatureCollections with zero features. A separate bounded 24-hour query for Massena and Iroquois also returned no positions; an empty response does not establish no ships are present. Other source regions delivered reports around the same time, so a systemwide AIS outage was not reproduced.

Open Waters' documented source network includes third-party AISHub and aisstream positions, with coverage differences across areas; it does not promise a complete Seaway traffic census. Its published commercial-use notice requires tier and per-source rights clarification for monetized products. This code change **does not claim commercial-use permission** and does not add, license or scrape a new AIS source. See https://openwaters.io/ais/ and https://openwaters.io/api/ais/.

Vercel's production runtime log API was forbidden (HTTP 403) during the Nov. 7 diagnosis. A true prior-timeout/429 root cause is not independently known. A successful API response, even a zero-vessel response, remains distinct from upstream network failure.

## Implemented
- A warm-instance, 12-second bounded per-region response cache and promise coalescing. An All corridor request and immediate selected-region request share one upstream fetch for that region on the same function instance. A failed upstream read is cached only two seconds. No Redis, database, scheduling, background polling, additional feeds, or long-lived vessel positions.
- Strict response-time re-normalization enforces the 30-minute AIS age cutoff even when a recent raw response is reused.
- Per-region `checkedAt` is the **actual provider fetch timestamp**, not the time a cached record was reassembled. Combined `checkedAt` uses the oldest successful upstream region timestamp. The response remains an observation and never promises ETA or lock entry.
- Successful zero-report results carry `coverageEvidence: 'not-established'`; actual fresh report results carry `'recent-observations'`. Empty successful data stays `state:'no-reports'`, **not** `'unavailable'` and **not** a verified traffic-free river.
- Client messages say reception coverage is not verified, preserve official-order-of-turn links, and do not invent ship movements. Explicit AISHub contributor link is included when that source supplied recent vessels.
- Both generated pages version the updated Seaway browser scripts; generator, journey enhancer and checked-in HTML agree.

## Validation and limits
Targeted test cases: successful empty upstream state, raw-response coalescing for concurrent All+selected requests, repeated 12-second checks with stable provenance and no fabrication, AISHub attribution link, and existing 429/502/invalid JSON/partial-success fixtures. All repository CI and production smoke must pass before a merge is reported completed.

The cache is **per warm Vercel function instance**, not a global distributed cache. Independent cold instances may still make their own provider requests; this reduces avoidable calls but cannot repair geographic receiver gaps or override provider commercial-use terms. No claims of improved AIS reception in Massena or Iroquois.

## Next evidence threshold
Obtain authorized provider/commercial source rights and dated diagnostic evidence of current source coverage in the two gap regions before replacing or augmenting the AIS provider. Do not scrape or republish operator-only traffic data without permission.
