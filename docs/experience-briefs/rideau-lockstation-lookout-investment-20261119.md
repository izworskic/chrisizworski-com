# Rideau Canal | Lockstation Lookout investment
Date: November 19, 2026
Mode: Experience Investment REVIEW -> IMPLEMENT
Skill: .agents/skills/experience-investment/SKILL.md (PR #1780 source; not assumed merged)
Owner: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/rideau-canal/
Baseline head: 441349ece5acce39036213ad9def4fafef253861

## Visitor job and verified baseline
A visitor decides which historic lockstation to watch, confirms the source-backed place and public approach information, then opens the Parks Canada page or Google Maps place-search link. They do not need a driving route or live lock status from this tool.

Actual 390px live first-screen screenshot reviewed: season qualification and three visit/cruise/paddle modes appear in the first phone screen; preserve that hierarchy. Actual 1280px live .workspace screenshot reviewed: location filters and three short choices occupy a narrow left column, while a long right-hand guide pushes the real photograph and seven-location map far below; much of the left column is blank as the reader scrolls. The map already has reliable Leaflet pins and an OSM tile fallback.

**Additional functional defect discovered in source:** selecting a pin outside the visit filters sets the selected place, then renderCandidates silently changes selectedPlaceId back to the first filtered candidate after renderPlace already showed the map-selected place. This produces an inconsistent detail, map pin and query string.

## Alternatives
**A. Lockstation Lookout, selected.** Keep the useful visit/cruise/paddle chooser at top. Put the interactive audited seven-pin map first in the right-side visitor workbench, followed by an immediately recognizable real credited place photograph, then original source-backed guide. Desktop choice controls remain visible while viewing the long story in visit mode on sufficiently tall screens. A direct jump link aids mobile. A pin outside filters remains selected and is explicitly labeled as outside the editorial suggestions. Only explicit changes to filters reset to the first matching suggestion. The map is an orientation tool, not a route chart.

**B. Longform photographic lockstation chapters.** Keep the map below the story, but swap stacked destination blocks for full-screen image chapters with scroll-triggered transitions. Rejected: it hides the decision, adds motion and layout cost, and still makes geographic choices less accessible. An exact-place photo matters after a location is chosen, not as a decorative hero.

## Why this is a distinct Rideau experience
Closest tools considered: Welland Canal trip desk and Soo Locks vessel viewing. Their visitor decisions concern ship movement, transit and timing. This tool's spatial context is static historic lockstation choices; it does not imply real-time AIS, launch windows, queues or navigable route lines. Compared with Michigan Snow Totals, the primary evidence is a real selected-place map and credited location photograph, not ranking magnitudes or generic charts. This is not a CSS repaint of the lock simulator or Snow Totals.

## Source, access and rights
Parks Canada visit overview: https://parks.canada.ca/lhn-nhs/on/rideau/visit (checked November 19, 2026).
Parks Canada lockstation directory: https://parks.canada.ca/lhn-nhs/on/rideau/visit/posteeclusage-lockstation (checked November 19, 2026).
Independent Rideau Canal visit planning example: https://www.visitrideaucanal.com/plan-your-visit (checked November 19, 2026).
Original source-linked visitor viewpoints remain in data/rideau-canal/watch-v1.json. The image remains a credited Wikimedia Commons photo. No new ratings, coordinates, routes, exact parking entrances, accessibility claims, navigation hours or current observations were added.

## Implementation boundaries and state matrix
Changes are limited to Rideau HTML/CSS/visitor JS, one isolated browser acceptance addition, tests and CI source policy, and this decision brief. Map source URLs, pin coordinates, location inventory, ads, Person/canonical, navigation graph, Lock Lab, videos, URLs, and server functions remain unchanged. No dependency or Vercel function added.

States:
- Visit initial: first recommended stop selected on map, selected text, list and detail.
- Select an eligible pin: the same place in marker, detail, URL and suggestion list.
- Select an out-of-filter pin: keep that place in marker, detail, URL and an explicitly non-recommendation extra row; suggestions and their count do not change.
- Change visit time/interest: reset to first matching editorial recommendation and resynchronize; no false drive-time or condition claim.
- Cruise/paddle: preserve the existing journey decisions and all original caution notes. Map jump is hidden because it is not a navigational line.
- Map tiles unavailable: original fallback and official links, no blank map.
- Source data unavailable / JS unavailable: original static seven-station list and Parks Canada links. No new dependence on map tiles.
- Reduced motion: native transitions and scroll policy remain controlled; no autoplay introduced.

## Evidence requirements
Browser 360/390/768/1280/1440 checks, including leaflet pin click outside filters, A -> B -> A after filter adjustment, screen-width overflow, keyboard selection, map tile/photo load and failure, no JS fallback. Capture new 390 and 1280 map-first screenshots; compare to the live baseline inspected earlier. Full npm run verify:all (via Agent branch verification), Rideau Python/Rust/JS and browser workflow, plus Vercel preview. Mark any unrun gate NOT VERIFIED, not passed. No measured CTR or revenue impact claim.
