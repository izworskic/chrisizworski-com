# Great Lakes Winter Layup — editorial experience rebuild (2026-10-25)

## Why the prior page failed visitors
The previous experience opened with a generic, unrelated hero background and multiple successive summary widgets before a visitor could use the map. Ship stories appeared only after an exhaustive card wall. The harbor map, archive selector and ship narrative did not feel connected.

## Design references researched
1. National Museum of the Great Lakes, https://nmgl.org/exhibits/ : foreground real maritime artifacts and vessel stories, guided visitor entry.
2. Flightradar24 feature overview, https://www.flightradar24.com/blog/product-features/ : keep map and selected object detail in one coherent environment.
3. MarineTraffic live-map guide, https://support.marinetraffic.com/en/articles/9552654-live-map : meaningful map iconography, geographic drilldown and strong map context. This layup archive is HISTORICAL, never current AIS.

## Implemented
- Authentic 2017 winter freighter photograph in immersive first screen, bundled locally at approximately 180KB, appropriate photographer/license/date credit on hero and clear historical context.
- Three locally hosted, rights-verified ship story images (Lee A. Tregurtha, James R. Barker, American Spirit), each with attribution and license links adjacent to story gallery. Photographs cropped to display; no AI imagery.
- One uninterrupted atlas environment containing season picker, sample count, harbor map and selected-harbor notebook.
- Gallery prioritizes three editorial journeys leading to permanent biographies. Historic roster follows with smaller, clearer discovery controls and more readable cards.
- Existing source registry, integrity model, six biography pages, static no-script fallback and historical confidence status unchanged.
- Responsive 390px mobile design, keyboard semantics, reduced-motion support, source disclosures and dedicated UI assertions.

## Source and reuse
- Hero, Mesabi Miner in Duluth, December 31, 2017: Sharon Mollerus, CC BY 2.0, https://commons.wikimedia.org/wiki/File:Mesabi_Miner_in_the_Canal,_Duluth_12_31_17_-shipping_-subzero_-winter_-ice_-lakesuperior_-laker_(25546396848).jpg
- Lee A. Tregurtha, U.S. Army Corps of Engineers Detroit District, public domain, https://commons.wikimedia.org/wiki/File:Lee_A._Tregurtha_in_Soo_MI.jpg
- James R. Barker, Levi Gates, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:James_R_Barker.jpg
- American Spirit, USACE Detroit District/Michelle Hill, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:American_Spirit.jpg
The locally hosted JPEG assets are photographic viewport crops/resizes of these same source images. Attribution and alteration are identified in page markup.

## Functional and experience acceptance rubric (100 pts)
- Entrancing first viewport (20): immediately recognizable real winter freighter photo, title and CTA; no unrelated portraits, no invented current status.
- Map-to-harbor discovery (25): interactive pins + selector + harbor notebook share context; filter selection accurate; keyboardable.
- Ship discovery (20): search by canonical name or curated aliases; clear/reset; reported-versus-verified color and language.
- Depth of ship stories (15): 3 editorial jumping-off points and 6 complete permanent biographies with reliable direct links.
- Mobile/accessibility (15): no horizontal overflow at 390px or 1320px; all touch targets and controls usable; reduced motion respected.
- Provenance/trust (5): image author/license links and dated berth evidence retained.
Pass/fail gates (not subjective points): 0 JS exceptions; 0 invented future layup positions; 14 native node assertions + design assertions; biography build --check; full repository verification and public audit; all images render locally in browser smoke.
Browser smoke uses a local static server and intentionally blocks external network access to ensure images and primary UX are self-contained. Source links open normally outside this test.
