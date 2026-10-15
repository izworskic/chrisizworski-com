# Grand Marais rockhounding operator verification gate — 2026-10-15

**Status: documentary research complete; affirmative owner confirmation outstanding.** This remains research-only. No collection recommendations, turn-by-turn parking or rockhound-wave verdicts may be published for Agate Beach or Bayshore Park.

## Findings grounded in official sources

| Question | Agate Beach | Bayshore Park |
| --- | --- | --- |
| Public beach facility | Burt Township confirms Lake Superior public beach and boardwalk. | Burt Township confirms downtown harbor public beach, bathhouse, pavilion and accessible parking provision. |
| Public approach | Grand Marais Chamber: head north from main street. OSM way 369178056 traces candidate boardwalk, not a municipally certified legal path. | Michigan Water Trails lists park GPS 46.672790,-85.983480, a parking lot/on-street options and under-50-yard shore access. OSM mapped footpath/steps; GPS is NOT exact parking gate. |
| Exact legal parking gate + shore path | Unverified. Do not route to third-party candidate GPS. | Unverified. Do not route to generic park GPS. |
| Rock collection permission | **Unknown.** Chamber promotes agate hunting but cannot authorize removing municipal beach material. | **Unknown**, and no primary evidence that this swim beach is a worthwhile agate deposit. |
| 2026 construction | Feb 1 bid proposed replacing boardwalk-to-beach stairs with ADA ramps, intended 2026. September 15 board minutes refer to an installed Mobi-mat and unfinished stairs, but **do not identify the specific beach**. | Township confirms bathhouse and public beach; Sept minutes' mat/stairs passage is not attributable here either. |
| Surface direction for NOAA evaluation | Open-Lake-Superior-facing *qualitative candidate*, no reviewed waterline normal or wet model cell. | Sheltered harbor *qualitative candidate*, no reviewed waterline normal or wet model cell. |

### Critical construction nuance

The Sept 15, 2026 Township Board **DRAFT** minutes state that a Mobi-mat had been installed, an existing beach bathhouse was open and new stairs should be completed by the end of September. This corrects the older February *bid-only* impression that nothing was done, **but it does not establish** a completed ramp, step-free route to sand or which facility received the mat and stairs. Do not turn the reported improvement into an accessibility badge without dated owner confirmation.

- Draft minutes: https://burttownshipacmi.gov/wp-content/uploads/2026/09/09-15-26-regular-meeting-minutes.pdf
- Feb boardwalk bid: https://burttownshipacmi.gov/wp-content/uploads/2026/02/Bid-boardwalk-renovate.pdf
- Township Agate Beach: https://burttownshipacmi.gov/recreation/agate-beach-lake-superior/
- Township Bayshore Park: https://burttownshipacmi.gov/recreation/bayshore-park-public-swimming-areas/

### Collection rules are still an actual block

- Michigan EGLE: https://www.michigan.gov/egle/public/learn/geology/rockhounding — general 25 lb annual limit on state-owned/public-trust lands, **with local rules to check**. Township municipal property may have its own posted regulations and boundaries.
- Burt Township published ordinance index: https://burttownshipacmi.gov/departments/planning-zoning/ordinances/ — a beach-specific rock removal ordinance is **not listed** there. Absence from the electronic index **cannot be interpreted as collecting permission**. The index says original township clerk documents take precedence.
- Tourist board: https://grandmaraismichigan.com/visit-us/attractions/beaches/ — explicitly promotes Agate Beach for agate hunting; good stone-interest evidence, **not legal authorization**.
- Michigan Water Trails Bayshore: https://www.michiganwatertrails.org/location.asp?aid=4911&ait=av — public facilities, site GPS and less-than-50-yard water access, **not an exact surveyed parking gate**.
- NOAA NCEP GLWU: https://nomads.ncep.noaa.gov/gribfilter.php?ds=glwu — operational wave source candidate, **not** evidence that a model wet cell/bearing has been validated for either beach.

### Exact code audit

`data/rockhounding/grand-marais-operator-gate-2026-10-15.json` stores two site gates and nine source records. `lib/rockhounding/grand-marais-verification.cjs` separates: (1) public beach documented, (2) operator-sourced exact parking gate, (3) operator-sourced lawful walking path, (4) operator-approved collecting rule and area, (5) confirmed step-free access, and (6) validated wave-model wet cell plus shoreline normal. Tests in `tests/rockhounding-grand-marais-verification.test.js` enforce fail-closed decisions. `node --test tests/rockhounding*test.js` is the focused run; standard repository verify gate still applies.

No exact navigable gate, legal collecting route, municipal beach extraction permission, wheelchair-to-sand route or local waterline model normal has been verified as of this review. Public beach visiting descriptions may be published with caveats, but collection verdicts remain BLOCKED.

## Municipal operator inquiry ready for review (not sent)

A Gmail draft was prepared for office@burttownshipacmi.gov asking the owner to confirm:
1. Noncommercial loose-stone removal rules and limits **separately** for Agate Beach and Bayshore Park, including boundaries;
2. Exact current public parking locations and lawful walking routes;
3. Agate Beach boardwalk/ramp/stair and Mobi-mat completion;
4. Which beach the Sept 15 draft minutes refers to;
5. Nighttime use, digging/raking, seasonal closures, protected areas.

No answer has been received, and no direct field inspection has been performed. The draft must be reviewed and sent by the user if they want the township to respond. Do not mark the gate as passed before an attributable dated owner response or equivalent published operator rule.

**Exactly one next action:** obtain the township's affirmative written response about the two beaches' collecting rules, parking/access and September construction details; only then approve or deny collection eligibility and proceed to shoreline normals / NOAA wet-cell validation.
