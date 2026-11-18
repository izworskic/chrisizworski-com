# Rideau Canal Skateway, source-governed winter desk

**Decision:** Which of the NCC's 14 mapped sections is actually reported available for skating, and which official entrance should I research?

**Owner:** `izworskic/chrisizworski-com`. Canonical candidate `/rideau-canal-skateway/`. Initial branch status is `noindex,follow` with no Tools card and no sitemap registration. Do not index before public release checks. The existing waterway planner's primary intent is separate: navigation heritage, lock visits, boating and paddling.

## Evidence and rights

National Capital Commission publishes ice conditions by section, generally twice daily when the Skateway is operating. The openly licensed ESRI FeatureServer has 14 polygons (IDs 1..14), fields `ID`, `From_`, `To_`, `Length_KM`, `Status` and an edit timestamp in `editingInfo.dataLastEditDate`. Licence: Open Government Licence - Canada. We store a source-reviewed centroid for each ice *section*, not an entrance. The last audited official edit was March 4, 2026 Ottawa local time; that **cannot** establish 2026-27 winter skating access. Relevant source pages: https://ncc-ccn.gc.ca/places/skateway-ice-conditions and https://ncc-ccn.gc.ca/places/access-points-rideau-canal-skateway.

The official entrance table names eleven recommended sites and five universal access ramps. Exact Google Maps pins are not claimed: links open named-place searches. Parking and O-Train text reflects the NCC directory, not a confirmed future service timetable.

## Architecture decision

**A. Direct public ArcGIS read in static HTML/JavaScript (selected).** 14 records, no personal information or location sent, no secrets or Vercel functions, with an HTML-first fallback. The browser fetches the source metadata and features independently and sends both to a pure policy engine. Status is presented only if the source is complete, recognized, source timestamp is not future dated, date is in winter and edited within 18 hours. Otherwise the answer is unverified. Cartographic pins are official section centroids, never ramps or skating routes.

**B. Scheduled Python preprocessing to CDN JSON (deferred).** Useful if cross-origin browser delivery proves unreliable, but scheduled updates can lag the NCC during changing ice conditions. It would require checking caching, maintenance and data rights before shipping. Existing Python is used for reproducible offline reference reconciliation and mirror audits.

**C. Rust/Java backend (rejected).** Neither high-volume scientific computation nor managed per-request routing is needed to restate NCC source decisions. New WASM, JVM or server endpoints would add deploy burden without verified visitor value. The nearby waterway explorer already uses Rust for a separate numerical routing-policy problem.

## State / failure matrix

| State | Visible answer | What remains actionable |
| --- | --- | --- |
| Initial or no live source | No current opening verified | 14 sections, full NCC status and entrance links |
| Current and complete source | Exactly the NCC-reported source statuses | Select section, source time, entrance searches |
| Current but zero reported open | NCC currently reports zero open sections | Official source and travel alternatives |
| Stale, missing, unknown or future | No positive access declaration | Source and section list, no stale green |
| Official Walking Only, Snow Covered, Closed | Not presented as a skating opening | Follow NCC signage and official map |
| Map tiles / Leaflet unavailable | Hidden map, usable section panel | Google Maps place search, NCC portal |
| JavaScript off | Static fourteen-section inventory | Official source and entrance list |
| Image missing | No impact on source/status | Complete readable visitor guidance |

**Cross-language tests:** `python3 scripts/verify-rideau-skateway.py`; `node --test tests/rideau-skateway.test.js`; Chromium 360/390/768/1440px and a mocked Jan 2027 fresh-source fixture. No model skill, visitation uplift, income or CTR is asserted.

**Release:** Do not merge or index before final full CI, inspected screenshots, live provider CORS verification, license display, public production status and independent smoke. Retain QA artifact URL and exact SHA.
