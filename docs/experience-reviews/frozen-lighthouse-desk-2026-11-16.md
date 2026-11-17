# Frozen Lighthouse Watch: second-pass release review

Date: 2026-11-16
Canonical: https://chrisizworski.com/frozen-lighthouses-michigan/
Owner: izworskic/chrisizworski-com
Stage: draft PR #1743; CI required on final feature head; no merge, deployment or live production smoke

## What changed
- Added a synchronized shoreline desk for all nine USCG-listed lights, with one forecast-time control and native step buttons.
- Each place reports the selected forecast hour and preserves the selected UTC hour when switching lights.
- Exposes the first contiguous, evidence-backed spray window and duration rather than only the maximum single hour.
- The selected tower links directly to the light's WGS84 coordinate in Google Maps, without claiming to identify a car park, trailhead or safe access.
- Reuses the original one-Edge-function API response, 72-hour source feed, NWS alerts, Overland scientific classification and provenance.
- Adds one static JS asset. No new images, ad code, analytics vendor, API endpoint or canonical URL.

## Evidence and comparable experiences
- Existing Michigan Ice Report is a lakewide seasonal model; lighthouse desk is a current hourly *place-by-place* spray screen, not a separate regional ice model.
- Existing Great Lakes Buoys is an observation/station dashboard; the lighthouse desk is a forecast window explorer that does not imply operating winter buoys.
- Official NWS hourly forecast graph: https://www.weather.gov/wrn/hourly-weather-graph
- Meteoblue forecast meteograms: https://content.meteoblue.com/en/private-customers/website-help/forecast/meteograms
- Verified REA own-source analysis: https://github.com/izworskic/chrisizworski-com/actions/runs/43998715151
- Original scientific and coordinate sources remain in the canonical page and docs/experience-briefs/frozen-lighthouse-watch.md.

## Browser scenario matrix
| Journey | Expected outcome | Evidence stage |
| --- | --- | --- |
| First load | Static visitor answer + source notice, then nine evidence-linked lighthouse buttons | CI mock browser pending |
| Place A to B to A | Same absolute forecast time, selected location, per-place readings and source status | CI mock browser pending |
| Hour 9 compare | Positive for fixture Frankfort, zero for fixture St. Joseph, with synced list states | CI mock browser pending |
| Missing hourly input | Explicit unknown and striped timeline bar, never zero | CI mock browser pending |
| Source API outage | Disabled slider and Google Maps link, unverified verdict | CI mock browser pending |
| No JavaScript | FAQ, named lights, source and pier safety remain available | CI mock browser pending |
| Widths 360 / 390 / 768 / 1440 | No page overflow; source and selected hour readable | CI screenshots pending |
| Rust/Python boundary cases | Same relative model classification as JavaScript; never claim observed accumulation | CI science parity pending |

## Release truth and rollback
- Verify:all: PASSED on earlier feature head 21497fb8 (Agent branch verification). Latest changed head requires its own green run.
- Browser screenshots: INSPECTED from passing CI run 43999542524 (360/390/768/1440), initial version. Revision to mobile selection and appendix must pass its own screenshot gate.
- Production deploy: NOT DEPLOYED (draft PR remains unmerged)
- Public weather feed: NOT CHECKED ON THIS BRANCH
- User engagement and search CTR: NOT MEASURED
- Rollback: revert the new JS asset inclusion and desk block, preserve original nine cards. New API additions are backward-compatible.
- Cost: no additional API request from the desk, one extra static asset, two repository CI jobs on relevant PR changes. Temporary REA inspection workflow removed before PR.

### Acceptance
Do not merge until full CI green, browser smoke green and screenshots reviewed. Green fixture tests do not make the live forecast scientifically accurate or any pier safe.

## Visual review after first passing Chromium capture
- Actual attached Actions artifact from run 43999542524 was downloaded and inspected, not merely checked for existence.
- 390px first screen: long editorial hero followed by truthful source summary; the coast selector was initially aligned north-first while initial selection St. Joseph was offscreen, and nine downstream detail cards greatly extended the page. Corrective change now scrolls the horizontal selector to the chosen light and tucks the detailed cards in a native disclosure, preserving the static HTML content.
- Desktop first screen: strong typography and readable safety banner, but the interactive desk remains below initial hero; the first hero control now jumps to it.
- The captured screenshots used deterministic API fixtures. Real production screenshot status remains unverified; QA category scores must not be invented.
