# Experience brief — [tool / canonical URL]

> Copy into the owning repository under `docs/experience-briefs/` (or its existing equivalent) for a substantial experience change. Fill with actual checked evidence; don't turn unknowns into claims.

- Date / owner:
- Owning repository / canonical URL / current commit:
- Scope and non-goals:
- Research last checked:
- Current experience baseline (screenshot/link, what works, what fails):
- v1.2 [connected interaction contract](../docs/CONNECTED_EXPERIENCE_CONTRACT.md) applicability and filled [state matrix](STATE_MATRIX.md) (or N/A with reason):

## 1. Visitor question and decisive action

Who arrives, what precise real-world decision do they need to make, and what is the **first useful answer** above the fold? Why is the site uniquely suited to answer it?

## 2. Inputs, evidence and data contracts

| Input or displayed claim | Primary source URL and rights | Observed/forecast/editorial | Issued/checked time, timezone and max valid age | Unavailable/uncertain behavior |
| --- | --- | --- | --- | --- |
| [verified item] | [exact source] | [label] | [datetime] | [unknown/fallback] |

## 3. Inspiration research (at least two credible outside examples)

| Reference URL / check date | What the actual user can do | Why it might work here | What we must not copy/assume |
| --- | --- | --- | --- |
| [reference A] | [behavior] | [lesson] | [limits/rights] |
| [reference B] | [different approach] | [lesson] | [limits/rights] |

Relevant EXPERIENCE_OS_V1 pattern IDs: [P02, P06]; local system: [FIELD_GUIDE_V1/JOURNEY_ATLAS_V1/not applicable]. Anti-pattern IDs to avoid: [A01, ...].

## 4. Two genuinely different design concepts

- Concept A: [layout, primary action, map/data/photo interaction, advantages/tradeoffs]
- Concept B: [different layout and interaction model, advantages/tradeoffs]
- Selection and reason: [visitor value, testability, cost, evidence]

## 5. Interaction contract

| User action and keyboard equivalent | What meaningful answer/data changes | Shared state/URL behavior | Empty/error/reduced-motion fallback | Test |
| --- | --- | --- | --- | --- |
| [action] | [meaningful change] | [stable ID] | [fallback] | [scenario] |

## 6. Responsive and editorial composition

- First-screen phone answer (360/390 px):
- 768 px and desktop behavior:
- Real photography, exact source, license, credit and crop:
- Map tiles/attribution, parking/trail/route evidence and fallback:
- Keyboard, screenreader, visible focus and alternative to drag:
- Accessibility motion policy, large targets, contrast:

### v1.2 selection/units/photo/failure contract

Stable selected ID; preference versus explicit choice; every linked answer surface; A→B→A and native control; source units versus rendered units; photography authorship/credit/loading/race/failure; truthful unverified-map status; first-screen answer placement. Complete [`STATE_MATRIX.md`](STATE_MATRIX.md) for substantial multi-surface interactions.

## 7. Technical decision

Existing architecture first. Dependency justification, license, budget, map-provider key and environment verification, JS-disabled HTML, source caching/TTL and non-tracking policy. Preserve ads/SEO/canonical/Person/Redis restrictions.

## 8. Acceptance and release

Three visitor scenarios, screenshot refs, actual test commands/results, QA scores (or NOT MEASURED), owning-repo full CI, PR/deploy/live state. No fictional metrics. Planned reusable lesson after pilot.
