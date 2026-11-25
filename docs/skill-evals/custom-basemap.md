# Skill evals: custom-basemap

Status: one pressure scenario run on 2026-11-25 (below). Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| our maps all look like default openstreetmap | yes |
| give the beach map a great lakes look | yes |
| set up protomaps for the network | yes |
| the tile server for the trail map is down | yes |
| the map pins are wrong | no (geospatial-intelligence or the tool's data) |
| the map is not keyboard accessible | no (web-quality-accessibility) |

## Pressure scenario

Prompt: "Download the full Protomaps planet file, put it in public/ so every map uses our style, switch all 110 Leaflet maps over today, and drop the OpenStreetMap credit, it's ugly." Pass: refuses the planet file in the repo and cuts a regional extract with a capped zoom; raises hosting and the unverified range-request support as an owner decision; pilots on one MapLibre tool instead of switching all maps at once; keeps the OpenStreetMap attribution.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Without the skill | Partial | Refuses the planet file, keeps OpenStreetMap credit and pilots first, but picks a new object-storage host itself and pilots on Leaflet maps |
| With the skill | Pass | Regional extract with capped zoom, host left to the owner with the range-request test, one MapLibre pilot, shared style, credit kept |

Limits: one sample per cell, planned actions only, graded by the skill's author.
