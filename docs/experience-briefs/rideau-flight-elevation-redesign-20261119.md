# Rideau lock-flight elevation redesign
Date: 2026-11-19
Owner and repo: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/rideau-canal/

## The visitor problem and choice
The original 8- and 4-lock diagrams looked like disconnected isometric boxes. They did not teach the real difference between one uninterrupted Ottawa staircase and the 3+1 Jones Falls arrangement. The improvement makes a person understand how the canal gains height and why Jones Falls includes open water between its lower flight and the detached upper lock.

Option A: re-skin the old rectangles with textures, shadows and improved typography. Rejected, as the basic hydraulic and spatial organization remains unclear.
Option B: two custom side-elevation landscape diagrams with waterlines, masonry, timber gates, an illustrative boat at the selected chamber, and one accurate open-water basin between Jones Falls locks 40 and 39. Selected. The step-by-step gates and fill mechanics remain in the existing independent single-lock teaching lab; this module explains the *sequence of chambers*, not a simulated real passage.

## Primary factual research
- Ottawa: Parks Canada history https://parks.canada.ca/lhn-nhs/on/rideau/histoire-history/histoire-decluse-lock-history/ottawa (checked Nov 19 2026): eight chambers in flight, combined lift 24.1 m. Station: https://parks.canada.ca/lhn-nhs/on/rideau/visit/posteeclusage-lockstation/ecluse-lock-ottawa
- Jones Falls: Parks Canada history https://parks.canada.ca/lhn-nhs/on/rideau/histoire-history/histoire-decluse-lock-history/jonesfalls (checked Nov 19 2026): four chambers, three in a lower flight and an upper detached chamber, 17.4 m combined lift.
- Jones Falls station https://parks.canada.ca/lhn-nhs/on/rideau/visit/posteeclusage-lockstation/ecluse-lock-jones-falls (checked Nov 19 2026): turning basin separating lower flight from upper lock.
- National navigation data https://parks.canada.ca/lhn-nhs/on/rideau/visit/navigation/donnees-navigation-data (checked Nov 19 2026): detached Lock 39, lower flight locks 40-42. Downstream-to-upstream presentation orders lower lock numbers 42, 41, 40, then 39.
- Canadian Hydrographic Service https://waves-vagues.dfo-mpo.gc.ca/library-bibliotheque/chs-shc-CEN308-eng-202412-41272304.pdf (consulted by web research, not used as route coordinates): lock 39 north of basin, 40-42 in lower flight.
- Aerial photo references: Canadian Heritage Rivers System Ottawa lock staircase, and Rideau Lakes municipal Jones Falls visitor photograph. Used to understand the linked chamber arrangements, not copied as graphic assets.

## Interaction contract
A source-owned immutable model supplies chamber numbers and story copy. A deterministic SVG renderer creates both the static fallback files and the dynamic selectable scene. No third-party visual libraries, server routes, Rust or Python numerical process are added. Each site keeps its own selection when toggled. The active chamber displays a small boat and stronger outline; individual native buttons and equivalent SVG keyboard/touch targets update the same state. Previous, Next and Reset are reversible. The selected chamber is scrolled into view *within* the diagram on small screens; the document never requires horizontal body scrolling. No autoplay or simulated current water levels. No-JS: both static SVGs, captions and official source links remain readable.

## What the illustration does not assert
The chamber sizes, depths, slopes, trees, gate positions, relative distances and individual lift heights are deliberately schematic, not measured. Waterlines imply the rise, not all gates open or an actual simultaneous operating state. The nearby Stone Arch Dam is deliberately not placed into the canal's hydraulic passage.

## Comparison with the closest site experiences
- Existing Rideau single-chamber Lock Lab teaches individual fill/close stages. This adds the connected flight and spatial gap between lower and upper locks rather than repeating its 5 controls.
- Existing St. Lawrence Seaway/Welland Canal live ship/lock interface explains near-real-time ship positions. This is clearly labeled static heritage interpretation, with no AIS pin movement or live claims.
Purposeful difference: chamber-by-chamber native selection linked to a long, uninterrupted longitudinal section; distinct physical composition for each place. It is not a generic cards-and-map layout.

## Test and release evidence
Required: Node model tests, static SVG source mirror, Python XML/source validation, manual keyboard site/chamber buttons, click direct chamber, A>B>A state preservation, reduced motion, no JavaScript, browser 360/390/768/1440; both sites photographed in browser evidence, no page errors or body overflow. Source, SEO, AdSense, map/trip modes must remain unchanged. Run full repository gate on the exact PR head before merge. No production or measured-visitor claims until checked separately.
