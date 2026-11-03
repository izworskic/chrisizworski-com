# Wallops Launch Viewing Atlas | Milestone 4
Audit: 2026-11-03. Canonical: https://chrisizworski.com/wallops-rocket-launch-viewing/

## Visitor purpose
A launch visitor should distinguish a real scheduled mission from broader range operations, a short-lived sounding rocket from an orbital/suborbital vehicle, an actual NASA Visitor Center launch opening from regular museum hours, and the three documented coastal landmarks from a guaranteed spectator GPS point.

Distinctive Wallops visitor experience: illustrated Eastern Shore marsh landscape, mission-truth panel, independent NASA public-vs-range source checks, science-focused sounding rocket explainer, interactive public location atlas. This is not a clone of the Florida or Texas UI.

## Source ledger and limitations
- NASA public launch schedule: https://www.nasa.gov/wallops-launch-schedule/ . Research check stated no public launches listed. This is NOT a statement about non-NASA range work.
- NASA Wallops Range Blog: https://www.nasa.gov/blogs/wallops-range/ . Lists operational announcements independently, sometimes without a webcast or real-time status.
- NASA Visitor Center launch rules: https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/ . Free, nonreservable, first-come; no guarantee of parking/entry; event-specific opening, security, no roadside parking on Route 175, no oversize vehicles on launch days; names Robert Reed Park and Curtis Merritt Harbor alternatives.
- NASA visitor center GPS: https://www.nasa.gov/wallops/stem/wallops-ec/ . Official PUBLIC arrival point 37.9393167,-75.4566333, not surveyed launch-viewing lawn or secured range entrance.
- USACE town-owned Robert Reed Park dock project: https://www.nao.usace.army.mil/Media/Public-Notices/Article/4443337/408-nao-2026-0018-town-of-chincoteague-downtown-floating-dock/ . Dock/project point 37.934715,-75.377321, NOT the parked vehicle or guaranteed viewpoint.
- Virginia DOH Curtis Merritt Harbor feature survey: https://www.vdh.virginia.gov/content/uploads/sites/20/2016/05/survey101.pdf . Working harbor feature 37.902311,-75.405202, NOT a marked viewing area.
- Chincoteague NWR authority: https://www.fws.gov/refuge/chincoteague . Refuge and Virginia Assateague district can close during launch operations.

## Source architecture
The national cached/authorized Postgres launch schedule remains the sole provider of LL2 mission UUIDs, actual pad positions and time precision (Virginia location ID 21). The regional API adds a source-reviewed public geographic projection, never an independent launch feed, live parking or site-access permission. Only mission-specific pad coordinates inside the Wallops regional bounds create a separate restricted marker; no pad driving directions. The dashed map comparison is a straight-line bearing, NEVER a route or predicted flight track.

The optional standalone NASA official endpoint checks the published public schedule and independent Wallops Range Blog with bounded server-side retrieval and a 30-minute CDN cache. The state no-public-listed is only emitted if that exact NASA text is verified; otherwise source-checked/unclassified or unavailable. The endpoint does not turn past announcements, normal center hours, RSS history or generic NASA YouTube into an upcoming rocket, event opening, published launch hour or webcast. Fail closed on source errors.

## Release scorecard
| Criterion | Weight | Gate |
|---|---:|---|
| NASA-vs-LL2 mission/source truth | 25 | Correct separate source statuses, no fabricated launch |
| Safe coast geography | 20 | Three traceable references, no pad navigation, no unsourced access |
| Visitor value | 20 | Distinct sounding/HASTE/orbital classes, mission-aware profiles, fallback |
| Mobile/design/accessibility | 15 | Four responsive viewports, keyboard, static NASA source fallbacks |
| Reliability | 10 | source outage, no mission, invalid UUID, absent pad and broken map |
| SEO/discovery | 10 | Canonical, exactly one sitemap entry, national UUID handoff, guide link |
| TOTAL | 100 | Gate on reproducible tests and production smoke |

Tests: tests/wallops-viewing-atlas.test.js; scripts/verify-wallops-browser.cjs; full npm run verify:all, emitted-page audit and Vercel exact merge-SHA verification. No CTR or SEO impact claim until measured.
