# Lake Superior Circle Tour — Place & Story pilot

**Date:** November 9, 2026 · **Owner:** `izworskic/chrisizworski-com`
**Canonical:** https://chrisizworski.com/lake-superior-circle-tour/
**Base:** `d78a8bbdca3a02e636ead41a31ac0ae3226783b6`
**Scope:** Independent Circle Tour bridge and optional shared standards. No change to 31-stop planner, map, journey atlas, approved tool registry, specialist tools, ads, Person or canonical.

## Visitor need and source diagnosis

The Foundry 0.3 decision pass already answers **which specialist to check first**. For a visitor choosing among Lake Superior Provincial Park, Sleeping Giant and Pukaskwa, the selected decision does not convey the park's distinctive physical setting or scale. Bare place names and a link leave the visitor unable to picture the experience they are choosing. This is observed interface content, **not** a visitor complaint or measured abandonment.

Three opportunities reviewed:

| Candidate | Outcome | Existing reuse | Effort and uncertainty |
| --- | --- | --- | --- |
| Place-specific photographic and interpretive vignette **chosen** | Visitors understand the shore, landscape and time commitment before following the specialist | Circle Tour stop IDs; independent decision; existing licensed photos | Moderate; verified metadata and long-image mobile QA required |
| Paired itinerary mood comparison | Compare two very different stops side by side | Journey Atlas and route choice | Higher risk of duplicating Journey Atlas and diluting the next check |
| Date-specific seasonal photo and actual access | Show what the park will look like on the visitor's date | Operator status and photograph libraries | Not supportable from dated static photographs; could invent forecast conditions |

### Two credible compositions

**A. Decision-anchored photo field note — selected.** The existing practical question/CTA remains first. Immediately after that action, two complementary documentary photos and short landscape interpretation describe *the selected park only*. Date, license and credits visible beside each photo. No photo on an unresearched stop. Direct official source link.

**B. Collapsible photographic stop journal — deferred.** A slim “Open the field notes” invitation keeps the decision denser and supports longer galleries, multi-season visual comparisons and user-selected themes in a drilldown. Distinct and feasible, but makes first-time sense of place an extra tap and creates more disclosure density beside the existing “Other specialist checks”.

**Editorial fit:** Unlike the Circle Tour's original stop map and Journey Atlas's general destination inspiration, the field note is tied to the *current decision state* and combines exact-place image provenance, narrative and a scale/access distinction. It is not a third map, itinerary or live conditions engine.

## Photography rights and verified subjects

Six exact-location images, each from an individual Wikimedia Commons source file with explicit CC license:

| Stop | Photograph and file-level rights | Intended subject |
| --- | --- | --- |
| 15 | [Old Woman Bay, Beckettlc, CC0 1.0](https://commons.wikimedia.org/wiki/File:Old_Woman_Bay.jpg) | Beach and enclosing cliffs |
| 15 | [Nokomis Trail, Beckettlc, CC0 1.0](https://commons.wikimedia.org/wiki/File:Nokomis_Trail.jpg) | Elevated coastal overlook |
| 20 | [Top of Sleeping Giant, Tariq Hossenbux, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:View_from_the_top_of_the_Sleeping_Giant_Trail.jpg) | High viewpoint, not a roadside stop |
| 20 | [Sea Lion rock, Mcdougallgregor, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Diabase_dyke_formation_known_as_the_sea_lion_in_Sleeping_Giant_Provincial_Park_in_Ontario_02.jpg) | Distinctive diabase shoreline arch |
| 18 | [Horseshoe Bay Beach, Hirgax, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Horseshoe_Bay_Beach,_Pukaskwa_National_Park.jpg) | Near-Hattie Cove beach, June 2025 |
| 18 | [Mouth of Hattie Cove, Andre Carrotflower, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:20150708_-_30_-_Pukaskwa_National_Park,_Ont._-_Mouth_of_Hattie_Cove_as_seen_from_Southern_Headland_Trail.jpg) | Southern Headland shore, July 2015 |

Verified Commons file descriptions and licenses on November 9, 2026. **Credits and licenses on the rendered page are part of the reuse contract.** The display uses cover cropping; source is linked. Photo-level date is not a visitor's intended travel date; no image is called live. Use a photo-free fallback if external thumbnails fail.

## Source-backed narration

- [Ontario Parks, Lake Superior activities](https://www.ontarioparks.ca/park/LakeSuperior/activities): Old Woman Bay, Nokomis Trail, the raised shoreline vantage; park notices and actual trails remain a separate current access source.
- [Ontario Parks, Sleeping Giant activities](https://www.ontarioparks.ca/park/sleepinggiant/activities): Top of the Giant official **21.8 km round trip from parking** and the distinction between coastline and high overlook.
- [Parks Canada, Pukaskwa visitor guide](https://parks.canada.ca/pn-np/on/pukaskwa/visit): Hattie Cove and Highway 627; backcountry routes are separate visitor commitments. [Parks Canada operating hours](https://parks.canada.ca/pn-np/on/pukaskwa/visit/heures-hours) show season-dependent services and the need for current verification.

We deliberately avoid invented personal visits, “open today,” sea conditions, estimated trip duration and unverified cultural stories.

## Owner contracts and tests

- Correct stop ID drives narrative, both photographs, credits, official reference and existing independent check; switching to an unresearched stop removes the photograph instead of mislabeling one.
- Supports the saved trip's forward/backward navigation and selection from route chips/stop dropdown, with the original `CircleTourPage` remaining authoritative.
- Static catalog unavailable/no JavaScript leaves the original independent guide links and 31-stop plan available.
- No injected tracking event for a passive render. User-initiated link action is a distinct event.
- Responsive images lazy-loaded, intrinsic dimensions, alt descriptions and captions; inspect actual loads at 360/390/768/1366/1440 after scrolling.
- Node contracts and browser evidence are **not** a claim of actual visits, improved conversion or GSC uplift. Public smoke must check real loaded images; outside-CDN failures are a known dependency and must not hide the written answer.

## Release scorecard

Before sign-off: decision/CTA retained; six rights verified; no generic photos; mobile credits legible; slow/image failures readable; browser selection A → B → A works; original SEO/ads untouched; owner CI green; live public verification separate from PR success.
