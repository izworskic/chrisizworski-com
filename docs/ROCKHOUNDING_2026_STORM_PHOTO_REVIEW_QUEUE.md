# Grand Marais rockhounding: storm-specific photo evidence review queue

**Completed October 16, 2026 UTC. Research only, no visitor forecast or fresh-agate prediction.**

## Why this is the next meaningful evidence layer

The free GLOS Seagull Grand Marais Spotter archive now holds **5,243 authentic offshore measurements across 111 UTC days**, with **11 grouped elevated-wave episodes and 8 qualifying sampling-supported episodes**. The previous shoreline evidence register had 3 independent dated Agate Beach media sources, but only one vaguely timed July post-storm candidate and zero same-camera pre/post comparisons.

A genuine next phase must attach *each* actual offshore event to precisely documented photograph eligibility windows **without** confusing a picture taken during a storm, a file upload date, or a different "Agate Beach" with an independently observed Grand Marais beach change.

## Actual source finding

- For each of eight sampling-qualified original GLOS episodes, construct a 48-hour **pre-event camera-capture** research window before the first elevated reading and a 72-hour **post-event camera-capture** window after the last elevated reading. These windows are **source evidence matching intervals, not recommended beach access times**.
- Search existing [Grand Marais dated beach media registry](../data/rockhounding/grand-marais-dated-shoreline-evidence-2026.json) and [Wikimedia original geotag metadata](../data/rockhounding/grand-marais-commons-geosearch-2026-10-16.json). Photo original capture day (camera timezone often unverified) is conservatively padded by 12 hours both sides; publication/upload timestamps must **never** become photo capture time.
- **October 12 measured offshore peak 2.57 m** and **October 5 2.51 m** currently have **no** verified date-matching Agate Beach scenes. This says nothing about rock findings: it means *no relevant independently sourced beach image was found in the reviewed registries*.
- **July 21–22 offshore episode: 1.62 m peak**. A July 26 Reddit user described Agate Beach, Grand Marais media as "two days ago." The approximate July 23–25 UTC capture window only partially overlaps the post-event research period. This is the **sole uncertain, named-site post-scene**, not verified exact timestamp, same camera, change in beach sediments or new-agate outcome. No close pre-storm Agate Beach photograph is available in the reviewed sources.
- Wikimedia original geosearch returned **six geotagged nearby files**, but only one of them is the previously registered GPS Agate baseline from July 5. A photo **near** Agate Beach need not face Agate Beach. An independent 2016 Lake Superior shore file is nearly 192 m from the 2026 baseline; the other nearby files are unrelated scenes. None provides a 2026 storm-bracketing photo pair.

### Geographic name-collision caught during this phase

A widely viewed [July 13, 2026 Reddit "Agate Beach" photograph](https://www.reddit.com/r/Michigan/comments/1uuwj6n/agate_beach_upper_peninsula_just_before_sunset/) is explicitly identified by the poster as **Agate Beach in Stanton Township, near Toivola in Houghton County**, not Agate Beach, Grand Marais. This is also corroborated by the independent [Agate Beach, Michigan locality page](https://en.wikipedia.org/wiki/Agate_Beach_(Michigan)). The engine includes this real source as a wrong-location **negative control** rather than counting it as evidence for a Grand Marais storm. Generic “Agate Beach, Upper Peninsula” search hits are unresolved until the original place is verified.

## Implemented

- `lib/rockhounding/storm-photo-review-queue.cjs`:
  - Original-source-locked, date-bounded, event-by-event reviewed media inventory. Original 8 offshore sampled episodes, separate date intervals, original photo metadata and camera GPS status, reject repeated original-source IDs, wrong origin URLs and geotag radius errors.
  - Photo-date uncertainty never collapsed to a falsely exact UTC timestamp. **During-event photo**, **partial pre/post overlap**, **strict pre/post** and **out-of-window** evidence classes. For new geotags, original-site visual verification, original camera angle and stable landmarks remain missing, and the record cannot be labeled Agate Beach by GPS proximity alone.
  - Distinguishes observational event ordering by **largest original buoy significant-wave peak** purely for research triage; those magnitudes are **not rock-exposure probability or an NWS safety threshold**.
  - Future exact original-source pre/post pairs must also pass existing 20 m camera-proximity, 12° heading, four reviewed fixed-landmark and confounder gates. Even passing this check only establishes time- and viewpoint-comparability, **not** a measured shore shift, storm attribution, public safe condition or fresh agates.
- `scripts/rockhounding/build-storm-photo-queue.cjs`: deterministic `--out` and `--verify` frozen report reproduction without extra provider calls. `public/rockhounding-lab/storm-photo-review-2026.json` contains a source-backed eight-event review queue.
- `scripts/rockhounding/watch-commons-camera-sources.cjs`: extends the pre-existing **once-weekly, one-source-request** Wikimedia GeoSearch. It now produces an *additional original-scoped event review annotation* when newly geotagged photos appear. It does not perform a second paid/free request, publish imagery, save restricted media, amend research-buoy history or change any visitor forecast.
- `public/rockhounding-lab/index.html`: existing **noindex** research page includes a responsive, accessible real-offshore-event selector with actual peak/wave timestamps, independent media source link and per-event explanation of the missing photographic evidence. The geographical **Stanton Township/Toivola** mismatch is called out directly.
- Tests prove the July source uncertainty, eight real episodes, only one uncertain post-scene, no same-frame evidence, wrong Michigan beach exclusion, and "during" versus "after" classification. They also verify a hypothetical source-licensed, directly georeferenced, fixed-camera pair **still cannot produce a stone/safety forecast**.

## Current scorecard (not a finding probability)

| Scientific input | Verified count |
|---|---:|
| Sampling-qualified measured offshore episodes | **8** |
| Source-dated Grand Marais media items previously registered | **3** |
| Nearby Wikimedia geotagged sources (not all beach images) | **6** |
| Events with tentative named-place photo timing | **1** |
| Original same-camera, pre/post, storm-bracketing image pairs | **0** |
| Measured sediment redistribution attributed to these waves | **0** |
| New agates validated by independent outcomes | **0** |

The original 2026 Spotter data are offshore. The events' image-review windows are *not* for visitors. The NWS active alert/safety layer and legal collection/access permissions remain separate blockers.

## Future physical proof that matters

A real repeat camera from **the same Agate Beach segment**, with two original time-stamped and georeferenced frames before and after one specific monitored storm, independently reviewed landmarks, water stage, wave runup, lens/perspective and image licensing. Distinguish actual visible aggregate movement from background waterline shifts, seasonal vegetation and snow. At that point the site could cautiously report a separately reviewed **observed beach-change outcome**, while withholding any claim that the storm directly caused it or exposed particular agates until those are independently supported.

No per-visitor external API calls, paid scraping credits, Google Street View/Mapillary tokens, ad implementation changes, indexed SEO pages, or municipal/site contact were added.
