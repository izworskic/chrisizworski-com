# Snowmobile parking -> trail access: source reconciliation

**Research and code checkpoint:** November 13, 2026.
**Priority corridors:** Grayling–Gaylord, Cadillac–Baldwin, Eastern U.P.,
Keweenaw–Copper Country.
**Live public pages:** existing seven `/snowmobile/regions/*.html`; no new
SEO page or route endpoint.

## Evidence hierarchy

1. **Independent DNR county map parking + trail pairing.** Exact source
   parking reference, numbered trail, road description and county-map PDF
   cross-checked with a DNR public-owner parking GIS OBJECTID. These points
   may be described as *DNR county-map paired*, but **not** as verified legal
   entrances, proof of winter plowing, trailer space, parking availability
   or rideable trails.
2. **Local club operator-listed staging.** A club lists a named site,
   published address and its actual parking restrictions. Keweenaw's
   Calumet maintenance facility is expressly identified as right on Trail
   17. Other club-listed sites do not get a guessed trail connection.
3. **DNR public parking GIS only.** Location and DNR description are shown,
   with explicit warning that a matching county map pairing has NOT been
   independently identified.
4. **Conflicting / incomplete evidence.** An OBJECTID present in the
   reviewed county map inventory but with changed trail number or road
   description is marked SOURCE_CONFLICT. The interface never silently
   promotes mismatched data.

The trail graph stays unchanged. Parking pins and street addresses never
create routing nodes or edges. The existing DNR closure/route calculations
control on-trail routing; a map feature being nearby does not confer legal
access from an off-trail lot. Closure checks, permits and local signs
remain a distinct question.

## Priority DNR county-map paired parking audit

| County | Official PDF update | DNR parking OBJECTIDs and county-map symbols |
|---|---|---|
| Crawford | 2026-03-02 | 28 LP7[1] M-72 / S. Blue Bear; 760 LP7[2] W. CR 612 / Myrtle; 489 LP47[3] S. Wilcox Bridge / Lewiston Grade |
| Otsego | 2026-03-02 | 883 LP4,LP7[2] S. Otsego / Acorn; 1440 LP4[3] Turtle Lake / Old State |
| Lake | 2026-03-02 | 412 LP35[1] M-37 / W. 3 Mile; 81 LP35,LP36[3] W. 7 Mile; 1487 LP362,LP344E[4] N. Kings / E. F; 6 LP30[5] 8th St Baldwin; 88 LP35[6] US-10 Mack / Sheppard |
| Wexford | 2026-03-02 | 781 LP35[3] E. 48.5 / S. 33 |
| Chippewa | 2026-08-25 | 231 UP45[1] M-123 / N. Beaver; 66 UP493[3] Maxton / Maxton Cut Across; 702 UP510[4] Bass Cove |

**Official DNR county sources:**
- Crawford: https://www2.dnr.state.mi.us/publications/pdfs/forestslandwater/_Archived/SnowmobileTrailMaps/countymaps/snowmobile_crawford.pdf
- Otsego: https://www2.dnr.state.mi.us/publications/pdfs/forestslandwater/_Archived/SnowmobileTrailMaps/countymaps/snowmobile_otsego.pdf
- Lake: https://www2.dnr.state.mi.us/publications/pdfs/forestslandwater/_Archived/SnowmobileTrailMaps/countymaps/snowmobile_lake.pdf
- Wexford: https://www2.dnr.state.mi.us/publications/pdfs/forestslandwater/_Archived/SnowmobileTrailMaps/countymaps/snowmobile_wexford.pdf
- Chippewa: https://www2.dnr.state.mi.us/publications/pdfs/forestslandwater/_Archived/SnowmobileTrailMaps/countymaps/snowmobile_chippewa.pdf

County maps are periodically revised; dates on PDFs reflect map compilation,
not any inspection of plowing or legal site access on November 13.
The live GIS parking source supplies actual coordinates. Printed map
symbols/road/trail association provide independent evidence only. Never
reuse a GIS OBJECTID without validating both the trail number and road
description, or hardcode a point solely from the PDF.

## Keweenaw — authoritative local staging instead of inventing DNR pins

The reviewed Houghton and Keweenaw DNR county maps do not provide an
independently matchable parking list for the current DNR GIS inventory.
Do not mistake that source absence for lack of real parking.

The **Keweenaw Snowmobile Club FAQ** explicitly lists:
- Calumet facility, **56953 Osceola Road**, Calumet. Operator explicitly
  identifies Trail 17 alongside the facility; overnight parking allowed.
  Limited block heater power and restrooms listed.
- Eagle Harbor Cutoff Road Trailhead, **8527 Eagle Harbor Road**.
  **No overnight parking.**
- Ray Kestner Waterfront Park, **1100 W Lakeshore Dr**, Houghton.
  Restrooms listed; overnight status not established.
- George Gipp Ice Arena, **200 Isle Royale St**, Laurium. Back/east lot
  or designated north parking before the trailhead; **never** in front of
  the chain-link fence. Overnight status not established.
- South Range Baseball Fields, **44969 Baltic Ave**. **No overnight**,
  no riding on ball fields.

Primary operator evidence:
https://www.keweenawsnowmobileclub.com/faq/
Corroborating regional tourism page:
https://www.visitkeweenaw.com/plan/transportation/parking/

The Keweenaw Snowmobile Club and Visit Keweenaw listings are not real-time
parking occupancy, lot plowing, or a landowner permit. Addresses are routed
through Google Maps as **published addresses**, not guessed GPS drop pins.
Club staging cards remain separate from DNR GIS parking assets.

## Decision on a full legal entrance 'verified' claim

**No source reviewed verifies the physical, lawful snowmobile path from
every parking spot to the named trail in today's conditions.** That would
require a site-specific recorded public connector / signed entrance or a
direct operator statement plus confirmation of any crossings/restrictions.
The application therefore deliberately does **not** print "verified legal
trail connection" for any of the 14 county-map pairs. Calumet's direct
Trail 17 statement is attributed to the Keweenaw club, not to a physical
inspection by the website.

Current season permits and access: DNR's 2026/2027 trail permit is $65;
designated season Dec 1–Mar 31; many parking lots require Recreation
Passport; check current DNR legal closures and published map:
https://www.michigan.gov/dnr/things-to-do/snowmobiling/where
https://www.michigan.gov/dnr/things-to-do/snowmobiling/permits-and-requirements

## Release QA

- Unit tests compare **14 independent DNR live GIS descriptions** with
  county-map references, including changed-road and changed-trail failures.
- Source-only Keweenaw items are never converted into invented GIS pins.
- Responsive Playwright checks on 390px and 1440px browsers test county-map
  evidence, club cards, Google Maps directions, no auto-routing and a DNR
  outage with no stale parking recommendations.
- CI generates all seven regional pages from one template and compares
  the committed HTML. Canonicals, scripts, AdSense, GA4, public URL, DNR
  route graph and Rust/WASM fallback remain unchanged.
- After merge: verify Vercel production status, live route pages, and live
  DNR parking endpoint. Do not claim a successful field parking inspection
  or exact legal connection without additional evidence.
