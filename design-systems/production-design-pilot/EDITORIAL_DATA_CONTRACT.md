# Editorial and data presentation reference, Phase 6

Candidate extension of the existing Production Design reference. Not a new skill, copy generator, universal page template or active site-wide gate. The existing plain-voice, data-contract-validation, visual-data-storytelling, Experience OS and owning repository rules remain authoritative. This reference brings those rules together at the point where data becomes a visitor-facing answer.

## Source baseline and approach

Reviewed plain-voice, visual-data-storytelling, data-contract-validation and the Experience OS scorecard. Read actual Duluth, Snow Totals and Circle Tour source on the Phase 5 branch. The reference fixtures are fictional, not source observations. The fixture index records specific existing source statements to demonstrate the distinctions already supported by our tools; it does not edit, grade or freeze those pages.

Option A: globally rewrite copy or add a generic readability score. Reject: risks pinned search answers, safety caveats and source facts; a short sentence can still be false.
Option B: create a new runtime formatter for all data. Reject: existing engines have different contracts and timestamp meanings.
Option C: choose source-aware editorial roles, contrast good and bad examples, and validate bounded offline fixtures. Selected. Use source-specific product PRs when adopting; do not rewrite every page.

## The visitor answer

Lead with the decision, place and useful reading when one exists. Put units, time period, evidence category and age next to the reading. Place the shortest necessary limit where it affects the decision. Then offer a relevant next action only when it helps. No mandatory four-part card, duplicate disclaimer or filler. A ranger voice names a place, what to notice, and why the conditions matter without sales language, theatrical introductions or invented experience. A live decision desk may need a more direct operational voice than a trail guide.

| Evidence category | Honest presentation |
| --- | --- |
| Observation | Reported or measured, source, observation time and interval; distinguish direct measurements from reports of estimates |
| Estimate | Say estimated, state method or source and the relevant interval; no manufactured precision |
| Forecast | Forecast, issue time and valid period; not observed |
| Model | Modeled output and scale, source and valid time; not an observation or probability unless calibrated as such |
| Inference | Evidence-backed possible window or interpretation; do not turn a candidate into confirmation |
| Simulation | Demonstration or simulation, assumptions and limits; not the current real-world state |
| Editorial | Published or authored planning advice; distinguish estimate from routed duration, official access and actual conditions |

Availability is separate from evidence category. Available can be explicit zero. Partial names what is known and missing. Stale retains original observation time and explicitly denies a current reading. Unavailable says unknown or unverified, not zero, closed, safe, good or open. Never invent a universal freshness cutoff; use the owning source contract. Do not replace evidence classification with a color, badge or confidence score.

## Typography, time and data

Use a primary reading with adjacent unit and meaningful precision. Keep the scale readable; align comparable values using tabular digits. Prefer a short date or age near the result, with time zone when ambiguity matters. An issue time is not an observation time or fetch time. Do not aggregate stations into one measured storm total unless the underlying method supports it. Never join missing observations as if measured. An interval has two endpoints; preserve both, along with units and uncertainty. A probability requires a calibrated probability source.

## Examples and acceptance

See editorial-fixtures.json for ten paired before/after cases. These are explicitly synthetic and are not paste-ready live copy. The offline test checks the curated examples for unchanged numeric tokens, protected facts and explicit evidence/availability wording; verifies deliberately defective rewrites are detected; and checks that named production source files exist. The source anchors are historical audit references, not immutable copy pins. A reviewer must independently check meaning, source truth, chronology, units, accessibility and tone. Text matching cannot prove a factual rewrite correct. No automatic copy scoring, production-wide banned-word gate or additional release rubric.

The existing plain-voice process governs actual rewrites, including no en/em dash connectors, no unsupported authority and no change to pinned SEO answers or JSON-LD. Keep all numbers, source names, dates, safety wording and original factual constraints. Read nearby copy, compare the actual diff, and preserve useful static answers. For a substantial live change, record representative normal, missing, stale and error states and inspect the actual rendered reading. Run source-specific tests, relevant browser and existing full CI.

No public pages, ads, URLs, engines, schema, network access or production dependencies changed. Independent skill evaluation remains outstanding. Next: controlled adoption on a contrasting live product only after owner review, then evaluate whether this reference actually improves decisions.
