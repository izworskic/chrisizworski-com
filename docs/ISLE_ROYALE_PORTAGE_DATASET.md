# Isle Royale official portage dataset

## Purpose

`public/isle-royale-map/data/official-portages-2026.json` is the canonical canoe-portage planning dataset for the Isle Royale map.

It exists to keep three different kinds of truth separate:

1. **NPS published portage facts** — official label, published distance, elevation change, and terrain description.
2. **Mapped trail geometry** — the public trail network used to draw a planning line.
3. **Endpoint search anchors** — approximate waterbody/place centroids used only to decide whether a user-drawn mapped trail leg plausibly corresponds to one of the official portages.

The planner may combine these, but it must never present a search anchor as a landing coordinate or convert an approximate anchor into navigation geometry.

## Primary authority

National Park Service, Isle Royale National Park, **The Greenstone 2026**, page 6, Portages table:

https://www.nps.gov/isro/upload/Web-Accessible_Optimized_2026-Greenstone.pdf

Current Greenstone landing page:

https://www.nps.gov/isro/greenstone-newspaper.htm

The 2026 table contains exactly **16 portages totaling 9.5 published miles**.

## NPS detail pages

Where a current NPS "Thing to Do" page exists, the dataset stores it as `detail_url` for richer terrain/access context:

- McCargoe Cove — Chickenbone Lake
- Chickenbone Lake — Lake Livermore
- Lake Livermore — Lake LeSage
- Lake LeSage — Lake Richie
- Lake Richie — Chippewa Harbor

Those detail pages reinforce the Greenstone distances but do not replace the annual Greenstone as the completeness source.

## Field contract

Each portage record contains:

- `number`: Greenstone portage number, 1–16
- `id`: stable slug
- `official_label`: Greenstone label
- `from`, `to`: endpoint names
- `distance_miles`: NPS-published distance
- `elevation_change_ft`: NPS-published elevation change
- `terrain`: NPS-published terrain wording
- `terrain_tags`: normalized search/planning tags derived from the wording
- `route_family`: internal planning grouping, not an NPS classification
- `endpoint_basis`: whether both endpoints are explicit in the NPS table or one endpoint is map-inferred
- `detail_url`: optional NPS detail page

## Endpoint anchors

`endpoint_anchors` are **not portage landing coordinates**. They are approximate centroids used as a secondary match signal. The runtime requires trail-distance agreement with the NPS published mileage before an anchor match can promote a mapped trail leg to an official portage identity.

The one special case is Greenstone portage #12, "Pickerel Cove." The table does not name the exterior endpoint, so the dataset records Lake Superior as an inferred planning endpoint and marks that fact explicitly.

## Runtime behavior

When the user builds a canoe route:

- the existing trail graph supplies mapped geometry;
- the mapped trail length is compared with the 16 official distances;
- endpoint labels and/or bounded endpoint anchors provide identity evidence;
- only a strong match becomes `officialPortage`;
- for a matched official portage, trip accounting uses the **NPS published mileage** while retaining `mapped_miles` separately;
- elevation change and terrain wording are then shown to the user;
- unmatched portages remain mapped/manual estimates and are not given an NPS identity.

This avoids turning a generic trail segment into an official portage by distance alone.

## Annual update protocol

When a new Greenstone is published:

1. Confirm the current Greenstone from the NPS Greenstone landing page.
2. Compare the portage table against all 16 current records.
3. Update distance/elevation/terrain facts exactly as published.
4. Add or remove portages only when the NPS table changes.
5. Recheck any linked NPS detail pages.
6. Revalidate endpoint anchor usefulness without treating centroids as landing coordinates.
7. Update `source_vintage`, `source_url`, `source_last_checked`, and catalog metadata.
8. Run the Isle Royale test suite and benchmark. The benchmark hard-fails if the 16-portage completeness contract or runtime integration disappears.

