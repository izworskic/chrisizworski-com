# Grand Marais rockhounding: Independent shoreline evidence gate

**October 16, 2026.** This stage tests whether genuine, independently dated images document a **change at Agate Beach** after independently observed wave episodes. Offshore waves are not a measure of the actual shoreline. We do not require an onsite visit, contacting a photographer, paid imagery, or citizen-submitted user content.

## Original 2026 source media actually located

| Candidate | Date as documented | Location verification | Available use | What it demonstrates |
| --- | --- | --- | --- | --- |
| [Wikimedia Commons: Grand Marais Agate Beach](https://commons.wikimedia.org/wiki/File:Grand_Marais_Agate_Beach.jpg) | **July 5, 2026**, Nikon D3400 date in page EXIF (original clock timezone unknown); uploaded **July 12** | Camera GPS **46.675190, -85.987480**, *inside* the independent OSM Agate Beach **research** polygon, not a surveyed wetline or collecting permission boundary | **CC BY 4.0**, credit **TCP04**, link original file and license | A genuinely dated *single beach scene*; by itself no change outcome |
| [Flickr: Agate Beach](https://www.flickr.com/photos/cowofchange/55385027738) | **July 4, 2026** (taken); July 10 uploaded | Publisher labels Agate Beach, Grand Marais. Exact camera GPS and matching frame unknown | **All rights reserved; source link only** | Another dated site photograph, but not a controlled same-vantage comparison |
| [Reddit r/rockhounds: Happiness is…](https://www.reddit.com/r/rockhounds/comments/1v6qg50/happiness_is/) | **July 26, 2026** post/comment with statement **"Agate Beach, Grand Marais, Michigan two days ago"**. Conservatively assign capture uncertainty **July 23–25 UTC** | Named place and video context, **not** verified camera GPS or exact original media capture timestamp | Link only, no scraping/copying/embedding or retained account handles | **Possible July 24 post-event site scene**, not verified sediment movement or a new agate finding |

Published date is **not** necessarily the original photography time. An EXIF date without timezone is retained at **day** precision, not fabricated UTC seconds. A community post with “two days ago” has a wider uncertainty window.

## Date-crosscheck against real GLOS offshore waves

The source-audited 112-day Grand Marais Spotter historical ledger contains **5,243 original observations**, **11 conservatively grouped elevated episodes**, **8 sampling-qualified episode groups**. A real episode peaked **July 21 at 23:46 UTC**, **1.62 m**, and its last >=1 m reading was **July 22 at 07:16 UTC**.

The July 26 Reddit statement about a video from “two days ago” might fall within 72 hours after this elevated episode, but the approximate capture window only **partially overlaps** the post-wave research interval. Classify **`POST_EVENT_POSSIBLE_TIME_OVERLAP_UNCERTAIN`**, not confirmed.

The July 4–5 photos are **too far before the July 21 storm** to serve as a controlled pre-storm baseline, and none of the sources has verified matching camera geometry, stable landmarks, and tide/water-level/light/occlusion corrections. The result is **zero verified comparable before/after photographic pairs**, **zero attributed shoreline changes**, and **zero independently documented newly exposed agates**.

This is a real finding that prevents us from claiming a post-storm opportunity merely because people have photographed pebbles or visited the beach.

## Research sources explicitly rejected as event-to-pebble proof

- **Sentinel-2**: [USGS original product documentation](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-sentinel-2) documents 10 m visible-band pixels, useful for broad shoreline and land/water context but **not individual small beach stones**. A [2026 USGS study](https://www.usgs.gov/publications/resolving-uncertainty-satellite-derived-shorelines-a-reef-lined-beach-using-high) highlights waterline-proxy uncertainty even when satellite positions are corrected. Those Hawaiian error results should **not** be assumed to transfer numerically to Lake Superior.
- **USDA NAIP**: [USGS overview](https://www.usgs.gov/faqs/how-often-orthoimagery-national-map-updated-and-what-are-acquisition-dates) notes high-resolution roughly 1 m imagery with typical ~3-year refresh, **not a before/after for every 48-hour wave event**. Good for long-term beach geometry and human orientation, not newly exposed agates.
- **Local webcams**: [Grand Marais Chamber camera directory](https://grandmaraismichigan.com/webcams/) lists **Bay View**, **Marina View**, and **North Street**; neither a historically archived fixed-view Agate Beach camera nor its comparable, independently date-verified before/after frames have been established. Harbor views must not be assigned to Agate Beach.
- **USACE July 2026 original entrance-channel depth data** does not overlap either Agate Beach or Bayshore study polygon. It cannot establish pebble exposure or beach-wave transformation.

## Implemented

1. **Provenance registry** `data/rockhounding/grand-marais-dated-shoreline-evidence-2026.json`: three actual dated site sources, metadata quality, original source links, owner/license and media reuse restrictions. Contains explicit no-publication and no-claimed-rock-change flags. No user handles or copied Reddit/Flickr media.
2. **Independent evidence/geometry engine** `lib/rockhounding/shoreline-photo-evidence.cjs`: validates registry identity, original photo time windows, camera GPS vs unverified OSM research polygon, event source IDs and shoreline no-claim safeguards. It computes 48-hour pre-episode and 72-hour post-episode **time-matching candidates**, but **demands same-vantage reviewed waterline scenes** before a real visual change can be counted. Partial date overlaps are flagged uncertain. A positive reviewed *sediment-change* pair still cannot prove storm causality or new agates.
3. **Reproducible research digest** `scripts/rockhounding/audit-shoreline-photo-evidence.cjs` and `public/rockhounding-lab/shoreline-evidence-2026.json`: source-verified and deterministic, can be regenerated and compared. Only the noindex lab fetches the local digest, never per-visitor Wikimedia/Reddit/Flickr API data.
4. **Noindex research visual**: a real licensed CC-BY photograph (TCP04, Wikimedia source/attribution), documented July wave/media timeline and transparent counts **3 dates / 1 provisional connection / 0 verified changes**. The restricted Flickr and Reddit sources are plain links only. Existing simulated storm scenarios and authentic GLOS chart remain separated; ads, canonical and sitemap unchanged.
5. **CI tests**: exact date matching against July 21 original Spotter event; OSM camera coordinate; absence of pre-event controls; no unsupported GPS or timestamp invented; fabricated rock/safety claims rejected; hypothetical fully reviewed pairs **still do not** become agate-exposure probability or beach safety.

## Next meaningful technical priority

**Dated event-scale, same-vantage Agate Beach comparison that is remotely obtainable and correctly licensed**. Existing webcams do not yet fulfill this for Agate, and medium-resolution satellites cannot distinguish loose pebbles. The engine is prepared for fixed-landmark human-reviewed image pairs and can automatically match their capture intervals to the appropriate real offshore wave episode without claiming causality.

To advance further without a human on site, research online publicly archived shore-facing fixed-camera stills or independently geotagged photo sets of the **same coastal segment** taken before and after one of the eight measured storm episodes. A genuine pair needs timestamps, original viewpoint geometry, stable landmarks, water-level/lighting/occlusion controls, permission for image use and a reviewed observable change class. No field submission, paid imagery subscription or contacting local agencies is required to keep the research gate.
