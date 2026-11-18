# Rideau Canal interpretive experience: the lock lab and viewpoint desk
Reviewed: 2026-11-18. Owner: izworskic/chrisizworski-com.
Parent release: PR #1763. New phase is a stacked review, not production.

## Visitor task and diagnosis
The original tool could locate and describe seven historic sites but could not demonstrate how a lock operates or distinguish a publicly described viewpoint from an ordinary lockstation place pin. The selected experience gives visitors a manual five-stage cutaway and a station-specific published viewpoint or trail, with a verified visitor-source handoff.

## Competing concepts
A: full-screen WebGL/Blender model with camera animation, physical water simulation and a new runtime. Rich spatial appearance, but unverified gate dimensions and high mobile performance cost would delay a useful answer.
B: first build a source-backed SVG sectional instrument with manual steps, accessible narrative, an optional recorded film, and separately published visitor approaches. Selected. It teaches the sequence with no third-party rendering dependency. A Blender diorama remains a possible later improvement after source modeling and mobile evaluation.

## Three opportunities
1. Replace static lock trivia with a causal rise/fill/open demonstration.
2. Give selected Ottawa and Jones Falls stops concrete places to watch, with verified source and map searches that do not claim driving directions.
3. Add a recorded real-world video handoff without confusing it with an unverified live webcam.

## Primary research and limitations
- Parks Canada locking sequence: https://parks.canada.ca/lhn-nhs/on/rideau/visit/navigation/ecluser-lock-through
- Parks Canada historic lock brochure, including gravity fed water/gates: https://parks.canada.ca/~/media/lhn-nhs/on/rideau/pdf/lock_e.ashx
- Parks Canada Jones Falls walking tour: https://parks.canada.ca/lhn-nhs/on/rideau/activ/sentier-trail/jonesfalls
- Ottawa Tourism Plaza Bridge and canal-level viewpoints: https://ottawatourism.ca/en/ottawa-insider/best-places-to-photograph-this-summer-in-ottawa
- Parks Canada 2026 season hours/closure: https://parks.canada.ca/lhn-nhs/on/rideau/visit/heures-hours
- Parks Canada official recorded passage: https://www.youtube.com/watch?v=pqRibZT_9Ls
- Parks Canada gate-building recorded film: https://www.youtube.com/watch?v=rHE4291qpWQ
All above reviewed 2026-11-18. No verified public live lock camera, exact parking gate coordinates, wheelchair access route or dining venue status. They are not represented as verified.

## Architecture
Existing HTML/CSS/JavaScript for a tiny static cutaway and five native steps, no autoplay, no new dependencies or Java backend. Offline Python validates a versioned source-grounded viewpoint manifest and its public mirror; existing Rust remains the journey arithmetic reference, not an animation runtime. A first-party page owns the only YouTube embed, loaded by explicit click with youtube-nocookie.com. Preserve map/list fallback, map attribution, ads, canonical, Person, author and current season language.

## Connected states
- Lock lab stage: enter, close, fill, upper open, exit. Previous and reset reverse the same sequence. Text and gate, water, boat attributes derive from one state.
- Location selection: exact selected station ID resolves independently reviewed viewpoint text, source links, optional food place-search query and the existing station map selection.
- Failed viewpoint request: original source-linked lockstation card remains, no fabricated fallback parking directions.
- No JS: static diagram, explanatory text, official links, seven documented station location cards remain.
- No third-party video: official links remain readable and the rest of the tool functions.
- Reduced motion: CSS transitions disabled; the five manual stages remain.

## Honest release
New interaction syntax/source checks and workflow checks are required. Browser proof at 360/390/768/1440, mapped selection, real external source links and inspected screenshots remain to be verified on this exact stacked head. Live/public, analytics and search outcomes are not measured. Do not merge PR #1763 or this PR without owner review.
