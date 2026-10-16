# Rockhounding next phase: original Commons repeat-view image candidates (Grand Marais, Michigan)

**Reviewed October 16, 2026.** Goal: identify same-reach, same-station, storm-bracketing original photographs remotely without claiming a wave-exposure/agate discovery forecast.

## 2014 and 2026 independently sourced photographs

| Original public source | Documented original capture | Lens | Camera GPS | License | Repeat-view decision |
|---|---|---|---|---|---|
| [Grand Marais Superior shoreline, Yinan Chen](https://commons.wikimedia.org/wiki/File:Gfp-michigan-grand-marais-superior-shoreline.jpg) | May 31, **2014**, local EXIF **10:30** (timezone not verified) | **55 mm** Canon | **Not documented** | Public domain dedication | **Possible regional bluff/tree silhouette**, not a registered matching camera |
| [Lake Superior shoreline to the horizon, Yinan Chen](https://commons.wikimedia.org/wiki/File:Gfp-michigan-lake-superior-shoreline-to-the-horizon.jpg) | May 31, **2014**, local EXIF **10:36** (timezone not verified) | **18 mm** Canon | **Not documented** | Public domain dedication | **Negative control:** open lake horizon and sand lack the first frame's stable dune/forest landmarks despite same date and photographer |
| [Grand Marais Agate Beach, TCP04](https://commons.wikimedia.org/wiki/File:Grand_Marais_Agate_Beach.jpg) | July 5, **2026**, local EXIF **12:57:56** (timezone not verified) | **78 mm** Nikon | **46.675190, -85.987480**, original camera point of view within the independent OSM study polygon | **CC BY 4.0**; always credit TCP04 and link original and license | **Verified GPS-located single-scene Agate Beach baseline**, not a before/after pair |

The public Commons [Grand Marais, Michigan](https://commons.wikimedia.org/wiki/Category:Grand_Marais,_Michigan) category currently lists approximately 25 files. We verified the two 2014 source dates and metadata on their respective original file pages, not inferred from upload time. Those two dated shoreline photographs came from an approximately six-minute session yet show different views. They are a concrete counterexample to treating same-place, same-date media as automatically comparable.

The 2014 coastal perspective and 2026 Agate photo have **visually similar broad trees-and-bluffs composition**, but image-to-image landmark registration was not performed and the old photo has **no independent camera GPS**. We have **not verified** the images were taken at the same position or on the same precise beach segment. Scale, angle, water elevation, vegetation, season and lenses differ. It would be deceptive to overlay the images and report shore width or rock change as measured.

**No 2014 vs 2026 photo pair brackets one specific 2026 GLOS storm.** The first qualified 2026 elevated episode after the June 26 archive opening is July 21 and comes **after** the July 5 Agate photograph. 2014 pictures cannot be the immediate pre-event baseline for that 2026 storm.

## What was built

- `data/rockhounding/grand-marais-repeat-view-source-candidates-2026.json`: three actual Commons pages, source-verified original capture dates, unknown timezone indicators, upload dates, 18/55/78 mm lenses, rights, GPS availability and nonpromotion of old city-level images to Agate Beach.
- `lib/rockhounding/repeat-view-photos.cjs`: provenance verifier, actual point-in-polygon check for known 2026 GPS, explicit unknown-to-null handling for missing 2014 camera position/direction, two annotated historical comparisons, genuine observed 2026 storm-interval checks, strict **no shoreline change or rock-probability** conclusions.
- `validateComparableRetakePair()` accepts future **independently source-dated, licensed** candidate pairs only when both photographs have verified timezone and positions within the Agate research polygon, both capture headings are recorded, the stations are at most **20 meters apart**, headings within **12 degrees**, and at least **four stationary landmarks** have been manually verified with geometric registration and explicit lake level, runup, ice/snow, light/occlusion controls. These tolerances are **research screening defaults, not validated morphological-change accuracy bounds**. Passing permits only **view repeatability**, NOT pixel-measured shoreline change, storm causality, newly exposed stones or safe access.
- `scripts/rockhounding/audit-repeat-view-photos.cjs`: repeatable static snapshot generation from reviewed provider pages, no paid services or per-visitor source requests.
- `public/rockhounding-lab/repeat-view-candidates-2026.json` and the original **noindex** prototype: two actual, legally reusable 2014 vs 2026 shoreline photographs shown side by side with direct source/rights links; explicit camera positions and lens caveats; a text-only negative-control source and the review limitations. Images use `object-fit:contain` to avoid fake matching through common crops.
- Regression suite: source date, GPS, lens, license provenance, absence of station data, independent geographic controls, heading wraparound, mislabeled/altered imagery, false new-rock training outcomes, and noindex/ads retention.

## Result

**One plausible long-horizon geographic photograph family; zero confirmed common camera positions; zero verified same-segment storm-bracketing repeat views; zero measured shoreline changes; zero agate-exposure calibration.**

The next physical-evidence milestone needs a **2026 (or future) same-camera, same-landmark scene before and shortly after one of the independently measured GLOS offshore events**. Online publicly archived time-lapse from a genuinely Agate-facing camera (not the harbor webcams) or two properly licensed and GPS-verifiable photos could satisfy that. Neither a 2014 photo alone nor an attractive view similarity does.

No contacting municipalities or other people, onsite field requests, photo republishing from restrictive media, paid imagery/data, marketing ad implementation, canonical/sitemap/indexed rockhounding verdicts or visitor-side API calls have been added.
