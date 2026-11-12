# U.P. waterfall inventory — current source-first research queue

**Checkpoint: November 10, 2026.** This updates the earlier queue v2 to match the latest merged 80-destination, 640-observation evidence system. This is a research workflow, not visitor access certification.

## Live source ledger (do not add overlapping counts)

| Class | Verified inventory size | What the number means |
| --- | ---: | --- |
| Curated waterfall and waterfall-area guides | 80 | Visitor guides, closure guides, research-only entries and the existing multi-falls Tahquamenon handoff, **not 80 confirmed open falls** |
| Michigan GIS named waterfall candidates | 161 | Natural geographic feature references, **not driving locations** |
| GIS candidates linked by exact state object ID to a curated entry | 69 | Source correspondence, not evidence of visitor access |
| GIS features still pending identity/access reconciliation | 92 | Each has some reviewed evidence and a documented route/access audit; **not 92 unstudied waterfalls** |
| Curated entries without an exact GIS object-ID match | 15 | Some are legitimate non-GIS waterfalls, groups or multi-falls destinations |
| Independent name observations | 291 | Names/aliases, not one-to-one confirmed falls |
| Indexed UP Travel listing records | 108 | 91 waterfall-named and 17 related pages; only 12 directly observed category cards |
| Evidence Atlas source observations | 640 | 80 + 161 + 291 + 108, **not 640 distinct waterfalls** |
| Name-only and tourism records without source-backed coordinates | 399 | No map pins, parking waypoints or routes should be invented |

**Primary machine-readable truth:** `data/up-waterfall-reconciliation.json`, `data/up-waterfalls.json`, `data/up-waterfall-uptravel-indexed-listings-2026.json` and `public/assets/up-waterfall-evidence-atlas.json`. Recompute these counts from the files before each future release; historical batch notes are not a live counter.

## November 12 follow-up: access and release evidence

The follow-up review is recorded in [UP_WATERFALL_ACCESS_SOURCE_RELEASE_AUDIT_2026-11-12.md](UP_WATERFALL_ACCESS_SOURCE_RELEASE_AUDIT_2026-11-12.md). It adds Travel Marquette's documented 2025 decision to stop promoting the eroding Dead River gorge and distinguishes a private lodging operator's Alger Falls **guest-only** statement from public road access. The June 2026 EGLE Au Train emergency order and unresolved upper/lower owner routes still prevent verified visitor directions. All three remain research-only.

The UP Travel directory still directly exposes only 12 verified cards of its reported 104; the other 92 membership records are **not** verified through the separate 108 indexed URLs. The later merged waterfall PR #1626 ran and passed GitHub verify, public audit, mobile/map smoke and SEO protection, superseding #1602's no-job failures. This is not an independent live-production click-through. The new source/access regression test protects the distinction in future builds.

## What changed from the previous queue

The former queue text reported **96 pending GIS candidates** and prioritized first-time source discovery. The current November 7 reconciliation records **92 pending** and an `accessRouteAudit` plus `evidenceReviewed` on every pending GIS candidate. Repeating the same searches on the same access-blocked falls is now a low-value task. A "new source" must resolve a named open question or add independently checkable data.

The November 9 Pinkerton/Traders official geography work confirms two distinct USGS-named geographic features and a Michigan DNR trail, but **no verified waterfall-specific public approach** or identification of UP Travel's third unnamed cascade. Bulldog's remote wilderness setting is not a signed trail. The NPS Siskiwit Lake portage is not a falls-viewpoint route. These remain evidence investigations, never auto-published destinations.

The November 10 atlas bug fix (#1602) restores searched curated pins, normalizes possessive apostrophes and separates Tahquamenon Upper/Lower natural feature points from the combined day-use reference. The correction must be preserved in every later atlas regeneration. It did not add a waterfall or authorize any route.

## Next research priority, in order

1. **Acquire missing authoritative visitor access evidence for well-known held falls, not another generic waterfall list.** For **Dead River Falls**, obtain a current owner/manager public-corridor and parking-to-viewpoint permission record for the McClure gorge. For **Au Train Falls**, obtain an official update resolving the June 2, 2026 EGLE emergency dam-safety order, actual ownership/access and safe upper/lower visitor corridors. For **Alger Falls**, establish lawful safe state-highway stopping and the precise falls-side permission. Without these specific proofs, preserve the existing noindex research entries and omit driving/map recommendations.
2. **Finish the named-source identity gap without false precision.** For Pinkerton Creek, distinguish GNIS Traders Falls, GNIS Pinkerton Falls, and UP Travel's unnamed drop only with cited land-manager or direct feature-identity evidence. Do not infer that DNR trail proximity, a stream crossing or a cartographic point is a verified viewpoint.
3. **Close the UP Travel directory reconciliation only with actually observed records.** The live category displays a 104-result regional directory; the validated record currently includes its first 12 visible cards and 108 separately indexed listing pages, which are **not** the same set. Seek a verifiable paginated listing feed or additional individually observed category cards. Do not claim 104 matched, 300+ known locations, or geographic/parking completeness from indexed URL counts alone.
4. **Invest visitor-facing effort in source-cleared clusters.** Before promoting another guide, establish the exact start/parking/trail/walking-effort for one geographic cluster, current land-manager restrictions, and how the new destination helps a visitor make a better day plan. Preserve map-feature vs arrival-point separation and visible source-review dates.
5. **Repair automated release visibility.** GitHub Actions for #1602 reported failures with zero jobs actually run; that is not a passing browser or whole-repository validation. Before any subsequent broad waterfall code release, restore actionable CI logs and run exact-head Node, Python, responsive-browser/map, canonical, sitemap and person/AdSense regression gates.

## Publication gate

Every visitor destination must pass source-backed geographic identity, public access permission, correct land manager, legal arrival/parking, continuous trail or viewpoint approach, and dated restriction review. GIS coordinates do not imply arrival access. Private, closed, unsigned, or uncertain waterfalls remain in a labeled research catalog; absence of a verified route is not proof of permanent closure. Do not auto-create public pages, markers, deep links, routes, ad changes, canonical changes or sitemap entries from research-only entries.

Use only publicly available online evidence; no emails or crowdsourced access confirmations. This file is a checkpoint, not a claim that the outstanding research has been completed.
