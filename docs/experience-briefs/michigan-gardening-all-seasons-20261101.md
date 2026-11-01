# Michigan gardening: an all-season garden notebook

Owner: `izworskic/chrisizworski-com`. Canonical: `/michigan-gardening/`. Experience OS 1.2.1. Work in progress, 2026-11-01.

## Gardener's decision
What can I do in my own garden now, and how can I make a plan for another season? A city or ZIP selects one of the 78 existing frost stations. The seasonal notebook defaults to Michigan's current month but allows a visitor to browse each season. The fall calculator takes the visitor's packet days and chosen buffer and counts back from a published station median. A median is not a prediction or a freeze warning. Some stations have no sourced fall reference and never receive an invented one. Garlic depends on the onset of hard freezing, not the first fall frost. Packet values differ in when maturity begins, and slower growth and germination must be considered.

## Evidence, checked 2026-11-01
- [MSU: Fall Vegetable Crops for Your Garden](https://www.canr.msu.edu/uploads/files/E3172_-_Fall_Vegetable_Crops_for_your_Garden.pdf): fall crop list and count-back method; days given there are estimates from germination. Cabbage head crops should use transplants; do not infer that other crops have the same start method. Some crops tolerate light frost, which this simple calculator does not model.
- [MSU: Organic Garlic Production](https://www.canr.msu.edu/uploads/resources/pdfs/e3371_wcag_2.08.pdf), p. 5 and 7: three to five weeks before hard freeze, typically October–November; watch leaf change and bulbs at harvest. Ground-freeze timing is not a first-air-frost date.
- [MSU: How to Plan Your Garden](https://www.canr.msu.edu/uploads/resources/pdfs/gardenplanning1.pdf): sketch beds, perennial placement, sowing seasons, and recordkeeping.
- [MSU: How to Plant Vegetables](https://www.canr.msu.edu/ingham/uploads/files/VegetablePlantingGuide.pdf): crop families, soil, seed packets, and planning for fall.
- [UMN: Planting vegetables in midsummer for fall harvest](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/planting-vegetables-in-midsummer-for-fall-harvest): independent comparison showing season-extension, crop-specific hardiness and maturity variation. It is not used to calculate Michigan engine statuses.
- Site-owned image `public/assets/garden/chris-izworski-zone-6a-garden-september-2023-bay-city.jpg` visually inspected: Chris holding carrots; credited on the page. The filename is not relied on for the photograph's subject or date.

## Alternatives and differentiation
A. A long list of 12 monthly task cards: easy to skim, but it leaves the visitor to reconcile a packet, local frost reference, and planting timing. B. A garden notebook with four freely selectable seasons, a practical action, a packet-based fall estimate and a crop story. Selected B: it ties a real choice to an answer while keeping the original plant-now engine and chart. Compared with the existing frost-probability page it focuses on the gardener's next task, not an odds chart; compared with the 47-crop planting calculator it explains the garden year and lets the gardener use their own packet. No map or synthetic photography is needed.

## Decision state and limitations
Location and selected crop remain in the original engine; notebook season is an independent exploration choice. The fall estimate recomputes on location or input changes; an unavailable frost reference has a distinct message. Crop-story choices and selected station remain linked. The expanded vegetable/herb/flower selector explicitly marks plants without verified Michigan rules, rather than applying the unverified offsets from the older 47-crop calculator. The existing calculator is linked as a separate, clearly labeled general estimate. No forecast, current soil measurement, crop success or expected visitor uplift is claimed. The gardener chooses the extra-day buffer; it is not a sourced universal rule or a guarantee.

## Verification status
Focused engine tests and garden benchmarks run locally. Browser screenshot verification, full repository gate, PR, exact-head CI, deployment and public smoke remain pending until actually completed. No visitor outcomes have been measured.
