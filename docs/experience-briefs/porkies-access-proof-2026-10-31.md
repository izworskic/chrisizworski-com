# Porkies access proof & source watch — experience brief (2026-10-31)

**Canonical visitor page:** https://chrisizworski.com/porcupine-mountains/  
**Owning repository:** izworskic/chrisizworski-com  
**Scope:** add a source-led access proof and source-change monitoring; do NOT enable routes, estimate driving time, alter indexing/canonical, or add new map/photo/advertising dependencies.  
**As-of:** 2026-10-31. This date labels a **research review**, not a current road-opening certificate.

## Visitor decision and evidence

*Question:* Can I arrive at the Presque Isle River waterfalls by vehicle using the western CR519 approach, and where should I park?

*Decision:* The DNR identifies a separate west approach, but the signed final turn into the mapped DNR trail-area parking asset is **not verified**, nor is reopening of the township work zone. Therefore provide a static map location and authority links but **no automatic turn-by-turn** west route. All source checks may return a "manual review" or "unavailable" state but never "open".

**Authoritative evidence reviewed:**
1. [Michigan DNR park operations](https://www.michigan.gov/recsearch/parks/porkies): CR519 western Presque Isle approach is separate from winter closures of M-107 and South Boundary Road, Headquarters–Pinkerton. DNR explicitly makes reopening conditional on roads being deemed safe; no live gate or lot opening.
2. [Wakefield Township published work-zone notice](https://wakefieldtownship.com/north-county-road-519-will-be-closed/), issued **2026-09-22**: 519 at M-28 closed for water-main replacement, Johnson Road identified as a detour; this notice does not publish a dated reopening or verified turn sequence. Source page still contains that notice as of review date; that does not prove the closure is still operational in real time.
3. [Gogebic County Road Commission](https://gogebiccountyroadcommission.org/), notice issued **2026-10-26**: parking on county road and state highway roadways/shoulders outside city limits forbidden November 1–April 15, 2–7 a.m. Not a finding about separate designated park lots.
4. [DNR GPS park map](https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf), map dated 2025-07-14: depicts the Presque Isle scenic area but cannot certify a full legal driving graph to a specific DNR parking asset.
5. **Official-source spatial crosswalk** in `west-road-reference.geojson`: 17 MGF Presque Isle Rd centerline features and 15 western South Boundary features. Using a local equirectangular nearest-line calculation, parking asset **#841** is **1,217 meters straight-line** from its nearest published west-of-Pinkerton South Boundary feature (#9684), and **1,316 meters** from the nearest published `Presque Isle Rd` feature (#10130). Distances describe **missing research geometry coverage**, not actual road length, a walk, or proof the road stops. Parking point was independently matched to DNR recreation record #3763, not a signed turn.

**Additional non-coverage:** MDOT's [Mi Drive disclaimer](https://www.michigan.gov/mdot/about/mi-drive-disclaimer) states its lane closure feeds cover I/M/US state routes rather than all county roads. A blank Mi Drive result cannot clear County Road 519.

## Research inspirations and rejected alternatives

- [National Park Service Active Alerts](https://www.nps.gov/planyourvisit/alerts.htm?s=MP), checked 2026-10-31: separates Closure/Caution/Danger/Information and refers visitors to the park itself. **Borrow:** source and alert type labels, direct authority links. **Do not borrow:** NPS jurisdiction, data/branding, or claim an NPS-quality live feed.
- [MDOT Mi Drive](https://www.michigan.gov/mdot/about/mi-drive-disclaimer), checked 2026-10-31: map/list for actual reported construction and update status with explicit limitations. **Borrow:** dated evidence and geographic coverage disclaimers. **Do not borrow:** state-only reporting as county-road proof or infer anything from missing incidents.

Two approaches compared:
- **A: Auto-detected road-open map** with green/red GPS route based on whether an official notice disappears. **Rejected:** unreliable public notice publishing, missing turn network and risk of falsely announcing an open road; would force unsupported visitor routing.
- **B: Human-verifiable proof disclosure + scheduled official-source drift detection. Selected.** Keep the main editor's interpretive prose; show a compact access answer and expandable four-source proof. Run daily GitHub Actions for three official county/township sources reachable from GitHub runners; preserve a dated artifact and open/update one review issue on substantive changes. DNR's page is **manual-only** because it returns HTTP 403 to the unattended runner (confirmed 2026-10-31), though its dated statement remains directly linked in the guide. Never modify the road verdict without primary-source verification.

**Reusable patterns:** EXPERIENCE_OS_V1 P01 answer-before-controls, P06 proof panel, P08 progressive disclosure, P10 alternatives after unknown. Anti-pattern A08 (geometry != permission), A07 (old evidence != live), A18 (research trapped in chat), A19 (mechanical park copy).

## Interaction and failure contract

| Action | Result | Unavailable/JS-off behavior |
| --- | --- | --- |
| Expand "four official access checks" by pointer or keyboard | Reveal dated work-zone, parking-GIS gap, DNR winter road rule and Gogebic parking hours | Native HTML `details` and links remain; no JavaScript needed |
| Choose west parking on existing date-aware planner | Existing fail-closed directions remain withheld after 2026-09-22; static Google map location still linked | Static parking card and official map link remain |
| Run scheduled source watcher | Artifact with `checkedAt`, per-source success/absence, review reasons; one issue if official access text changes | On HTTP failure: `source-unavailable`, never reopen road. On detected update: `manual-source-review-needed`, never reopen road |
| Compare source road and DNR parking pin | See literal nearest-line measurements with GIS caveat in proof ledger | Exact positions retained in independent JSON; no predicted distance/time |

**Technology:** existing static HTML + scoped CSS + Node22 built-in `fetch`; no React/Rust, Redis, new map tiles, analytics, ads, PII or visitor-side network checks. GitHub Actions creates a small time-stamped artifact, no daily production re-deploy or optimistic closure-state mutation. Native details keyboard accessible with `:focus-visible` and mobile single column.

## Acceptance / scoring

Prior to release require: source-geometry recalculation, monitor normal/reopen/HTTP-failure fixture tests, no-JS source proof, mobile/narrow/desktop Chromium and keyboard toggling, full repository verification, static HTML and ads/Person/sitemap gates, review of exactly-head checks. The three-source automated monitor excludes the DNR page (HTTP 403), which requires manual review. A monitored source update must never produce `accessOpenVerified:true` or permission to render drive links.

**Results at drafting:** unmeasured until exact-head CI and screenshots complete. Record PR, test links, review outcome, and remaining real-world work in the final release handoff.

**Still unverified:** road commission or township construction reopening; precise signed last-mile driveway and legal turn; designated day-use/contact-booth/campground lot equivalence; bridge/ford clearance; snow or plowing; RV turning. Only fresh official access/parking evidence can change the fail-closed state.
