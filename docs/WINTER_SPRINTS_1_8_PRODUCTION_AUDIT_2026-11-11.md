# Winter growth Sprints 1–8: live production audit

November 11, 2026, approximately 1:45–2:00 p.m. Eastern. Audited PRs: #1606, #1607, #1608, Duluth metadata correction #1609, #1616, #1628, #1637, #1638 and NWS repair #1639.

## Production evidence
1. Sprint 1: Freighter tracking, Mackinac Bridge and northern lights pages/canonicals render. Tracker AIS responds. The Bridge Authority status, NOAA nearby wind and NOAA aurora feeds return recent source data.
2. Sprint 2: Michigan Snow Totals and ACIS season API both return success and no source degradation. Reports dated November 6 may be latest positive observations; zero reports during a shorter window is legitimate, not a system error.
3. Sprint 3: Duluth Canal API returned 12 recent map vessels; Welland Canal returned 6. The pages preserve live tools and separate Harbor Lookout published schedule fallback. Raw Duluth AIS message normalization has a defect: yearless ETA strings are serialized as 2001. The visitor's actual passage watch is computed separately and does not display that ETA as a schedule. Do not use raw ETA as a dated arrival.
4. Sprint 4: Duluth build generator metadata fix stays applied; no separate new forecast model.
5. Sprint 5: All seven Michigan lake-effect regions returned status ok, valid NWS forecast coverage; WPC and NDFD snow grids returned dated evidence. Snow-depth engine reported a valid no-strong-snow answer for a Bay City-area origin and separately noted unavailable NOAA model/observed 0-inch snow and unverified parking.
6. Sprint 6: Michigan Winter Weekends canonical and editorial chooser present. The chooser is an editorial trip shortlist and not a claim that parking, lifts or trails are currently open.
7. Sprint 7: The ski API returned valid gridded NWS forecasts for 18 out of 18 resort coordinates. Independently parsed operating reports exist for only 2 of 18. This is a major evidence gap: forecasts cannot establish operating lifts. Snowmobile API returned seven regions with no ride-ranked regions before the December 1 season; old club reports are marked stale. Cross-country page separates snow from grooming and access.
8. Sprint 8: Eleven land-based viewpoints and five source-owned ice-formation reports remain. None of the five formations was confirmed today. The Saginaw Bay 200-OK-but-null NWS forecast failure was real and was repaired by PR #1639 with official NWS grid fallback; 72 valid forecast hours now returned.

## Separate issues and limits
The national-planting production smoke assertion expects JavaScript asset v35, but the current page serves v36. This assertion is stale, unrelated to the winter sprints; do not present it as a proven planting app outage.
Some raw freighter AIS records and buoy observations contain source-quality gaps. Live pages must retain explicit source freshness rather than infer current movement or weather.
The actual browser experience (maps, tiles, pins, mobile touch and JavaScript event handling) could not be independently executed by the available browser tool. A successful HTML fetch or API response does not prove those interactions work.
There is no verified AdSense revenue uplift or complete postrelease GSC comparison attributable to these sprints.

## Repeatable read-only audit
Run node scripts/audit-winter-growth-sprints-live.cjs. The script checks actual source payloads, not merely HTTP 200, and accepts valid zero-observation or off-season outcomes. It records artifacts/winter-sprints-production-health.json and exits unsuccessfully for required source failures. The audit workflow is PR-triggered for this check and available on manual dispatch. No production page, source engine, title, robots rule, ad or map is changed by this audit commit.

Do not launch more growth sprints until source payload checks pass and a separate browser/mobile acceptance run verifies interactive UI.

## Remediation confirmed after the first audit run

The initial GitHub-hosted source audit failed 1/15 checks despite a healthy HTTP 200 from the Michigan Snow Depth ranking API: the browser Origin request lacked Access-Control-Allow-Origin. This is a real browser-readability defect that normal JSON ingestion cannot detect. It was repaired in its separate owner, izworskic/national-snowpack-melt PR #32, by sending Vary: Origin even on anonymous responses that Vercel might cache. After owner production deployment, the same GitHub production job was rerun and all 15/15 contracts passed, including matching cross-origin response headers. Owner deployment, verification and main-site audit release occurred November 11, 2026.

The pull-request action now also triggers when affected winter and shipping routes/scripts/APIs change, rather than only when the audit script or document changes. It remains read-only, does not run an expensive monitoring schedule and does not claim that a map rendered correctly.
