# Issue #1258 — Batch 69: Warner Falls M-35 culvert identity correction and visitor-access gate

**Reviewed November 5, 2026.** **Decision:** geographically real roadside waterfall on Warner Creek south of Palmer. **Hold** Michigan GIS #172 as `research-only` and `noindex,follow` because a current legal stopping point and continuous authorized pedestrian approach are not separately established. The new evidence corrects a material B34 error: a project on the same creek is not automatically construction at the falls.

## Evidence that changes our earlier account

1. [MDOT July 1, 2026 project notice](https://www.michigan.gov/mdot/news-outreach/pressreleases/2026/07/01/m-35-culvert-project-detour-starts-july-27) identifies work on **M-35 over a branch of Warner Creek north of Palmer**. Original B34 visitor research described this as reconstruction of the falls bridge/guardrail without an actual location crosswalk; that was unsupported.
2. [MDOT August 12, 2026 notice](https://www.michigan.gov/mdot/news-outreach/pressreleases/2026/08/12/m-35-culvert-replacements-in-marquette-county-start-aug-24) identifies **two separate culvert replacements south of Palmer near County Roads MT and MP**. Neither the release nor collected project details actually names the Warner Falls turnout. Do **not** claim these works are irrelevant to every approach road, either; no as-built site-specific crosswalk was verified.
3. [Travel Marquette's named falls guide](https://www.travelmarquette.com/blog/post/waterfalls-you-need-to-see-in-fall/) identifies Warner Falls approximately **46.43333,-87.59888, south of Palmer**. It describes historical roadside viewing, stopping fully off M-35 beyond guardrail, and a short signed trail.
4. [Michigan tourism](https://www.michigan.org/property/warner-falls) and [UP Travel](https://www.uptravel.com/listing/warner-falls/4598/) independently list a south-of-Palmer M-35 waterfall and a roadside perspective. These are visitor-organization directions, *not legal site-specific stopping approval by MDOT*.
5. [Firsthand Waterfalls of the Keweenaw](https://www.waterfallsofthekeweenaw.com/warner-creek/warner-falls/) reports a waterfall at **46.43338,-87.59897** and old shoulder/trail approach. Old stream-bank access and guardrail observations must not be assigned a November 2026 opening status.
6. [Michigan GIS #172](https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7) is the natural feature at **46.433378,-87.598960**. No car route or exact stopping position is constructed from this point. The central Palmer community point is around **46.44077,-87.59319**, consistent with the falls being to the south, but a town-centroid distance is not a construction-project coordinate.

## Six independent proof axes

| Axis | Verdict | Finding |
|---|---|---|
| Physical feature identity | Supported | State GIS, tourism and specialist coordinates agree on southern Warner Creek falls |
| Highway vs bank ownership | Incomplete | MDOT is M-35 road authority, not confirmed owner/grantor of the full riverbank descent |
| Historic published approach | Supported as history | Two tourism agencies describe roadside perspective and signed short trail |
| Legal and safe stopping now | **Not cleared** | No current MDOT site-specific designated turnout or stopping/guardrail approval |
| Continuous authorized walk | **Not cleared** | No current manager-verified access across the bank, path and waterfall viewpoint |
| Conditions and closures | **Unknown** | Neither north nor south MDOT project notice establishes today's parking, reopening or winter visitor use |

The correct interpretation is **not** "2026 highway works closed Warner Falls." It is **not** "the completed work proves the falls are safely accessible." The proper answer is that the past reconstruction assumption was ungrounded and present legal parking/bank-access evidence is still incomplete.

## Implemented

- Rewrote the noindex [Warner Falls research page](/upper-peninsula-waterfalls/research/warner-falls/) to explain both MDOT projects and give the source-backed roadside-vs-parking distinction. The visitor is linked to the public Wright Street Falls option rather than given a dubious shoulder GPS.
- New structured source ledger: `data/up-waterfall-warner-culvert-evidence.json`; complete, dated source URLs, six separate evidence axes, nonpublication guardrails.
- Updated existing GIS reconciliation #172, inventory ledger, GIS opt-in access review JSON, and deterministic pending queue source count, without changing the five public counts or other candidate order.
- Added B69 regression to protect project identity, source provenance, noindex, no parking pin, visitor sitemap, original B34 classification and six mandatory route axes.

**Unchanged inventory:** 75 curated destinations, 68 exact state GIS matches, 93 GIS features still pending. No new waterfall cards, public coordinates-as-car-target, sitemap entries, ad logic, structured TouristAttraction schema or creator attribution changes.

**Next truly decisive research:** authoritative MDOT site-specific parking/status and a legal public bank-to-viewpoint corridor at Warner Falls south of Palmer. Do not outsource this to visitors. If the original official site cannot be proved, do not manufacture a turnout or trail.
