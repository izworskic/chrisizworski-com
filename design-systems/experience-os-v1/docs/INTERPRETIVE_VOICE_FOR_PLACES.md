# Interpretive field-guide voice — EXPERIENCE_OS_V1

**When it applies:** state/provincial/national parks, waterfalls, wildlife viewing, scenic routes, cultural landscapes, trails and place-based guides. It is **not** a substitute for terse status-first writing in traffic, safety, weather and live-operational decision engines.

**First verified case:** Tahquamenon Falls Visit Planner, [editorial research and rules](https://github.com/izworskic/tahquamenon-falls-live/blob/main/docs/TAHQUAMENON_INTERPRETIVE_EDITORIAL_20261031.md), [owning repository PR #23](https://github.com/izworskic/tahquamenon-falls-live/pull/23). The merged release and its checks must be verified before describing the style as a measured success; the source link is a method, not a user-engagement result.

## The north star

Write like an extraordinarily informed, thoughtful park interpreter walking beside a visitor, **without claiming to be a park employee or speaking for an agency**. Not a press release, not a dry inventory, not purple tourist prose. Help someone see, understand and decide.

For every important location, answer three questions:
1. **What am I looking at?** Describe the exact place with grounded sensory detail that the available evidence supports.
2. **Why is it this way?** Explain the landscape, ecology, geology, history or visitor-access design, citing an authoritative source.
3. **How do I experience it responsibly?** State where to go, what to notice, time or ability tradeoffs, and what must be checked closer to the date.

### Micro-example

**Weak:** “Upper Falls has a new accessible boardwalk. Best for short visits.”  
**Stronger:** “Follow the boardwalk beneath the old trees and listen as the Tahquamenon grows louder. The Upper Falls spreads across a wide ledge and drops almost 50 feet into the gorge. You can experience the main views from the accessible approach without committing to the steep stairs below.”

Do not copy this description into another park page. Transfer the *technique*, not Tahquamenon-specific detail.

## Three-layer writing system

| Layer | Size and placement | Goal |
| --- | --- | --- |
| First answer | Compact, visitor-question led; above controls where needed | The visitor immediately knows what the tool solves |
| Interactive details | 40–100 words at each selected place/route, tied to actual data and actions | A meaningful selection explains why that location is distinct |
| Deeper interpretation | Short chapters after the first answer and core experience; link source evidence | Visitors who want to learn can appreciate the landscape without burying the action |

- **No giant hero paragraph.** Enrich the journey below, not the first-screen height.
- **No shapeless brochure.** A paragraph belongs to the visitor's place/decision, not to a generic wall of text.
- **No fake ranger voice.** Don't write “As a DNR ranger I recommend...” or invent interpretive quotations.
- **No unsupported assertions.** Avoid predicted animal encounters, “open now,” accessible-completely claims, danger guarantees, made-up origin stories and historical anecdotes without primary sources.
- **No interchangeable adjectives.** Words like breathtaking, hidden gem, spectacular, idyllic add little. Named features, changing river sounds, real vegetation, historic routes and verified viewpoints are the story.
- **Keep seasonal boundaries.** Historical photos, generic winter descriptions, actual observed measurements, forecast guidance and present access are distinct.
- **Never equate colored or clear water with water safety.** Geologic/ecologic context is not a health or swimming recommendation.
- **Explain accessibility honestly.** Differentiate paved/boardwalk routes from rough or stair-heavy alternatives; confirm closures and mobility amenities.
- **Mobile typography matters.** Long descriptions at 9–11px are not an acceptable field guide. Check 360/390/768px, actual computed styles, line length and no horizontal overflow. Aim for at least 14px for meaningful body copy as a local design floor; WCAG requirements and reading performance still govern.
- **Preserve control semantics.** Longer text must not change plan IDs, source states, date/time logic, official links, canonical schema, ads or route ownership.

## Before the authoring commit

Locate the authoritative repository and page. Read its existing source and visitor journey, this document, the relevant EXPERIENCE_OS patterns (P01, P02, P06, P07 and P10), and place-specific primary evidence. Write an editorial source ledger for every new factual claim. Avoid copying tourist-board paragraphs verbatim.

Think in scenes: Where does the visitor first stop? What do they notice while walking? What will change on the next trail or viewpoint? If there is a real interpretation program/park employee present, refer visitors to it without claiming it is staffed or open right now.

## The QA gate for an interpretive rewrite

1. **Truth:** every assertion traces to a primary source or is clearly an ordinary first-hand-style interpretive observation rather than a live guarantee.
2. **Placement:** the question/action remains visible early. New content is attached to meaningful places and states, not bolted on as filler.
3. **Originality:** human, inviting prose with precise details, not clichés and not replicated official text.
4. **Accessibility:** 360/390/768/desktop screenshots and body-text sizes checked, focus and screen-reader usability preserved.
5. **SEO and ads:** old canonical/page title/identity/structured data preserved unless explicitly authorized; answer snippets and accessibility details remain crawlable.
6. **Regression:** existing data, route, map, season and planner tests pass. Inspect live canonical after owner release.
7. **Learning:** capture a source-linked successful paragraph and a rejected weak draft, plus measured results only when measurement actually exists.

## Source example (no new data rights granted)

Tahquamenon official park: https://www.michigan.gov/recsearch/parks/tahquamenonfalls  
Michigan DNR education: https://www.michigan.gov/dnr/places/v-centers/tahquamenon

Those verify the local Tahquamenon claims. They do **not** authorize assumptions about Pukaskwa, Porcupine Mountains, Sleeping Giant, Sleeping Bear Dunes or any other park. Every tool needs its own research.

## Transferable lesson from screenshot review

Even excellent prose fails when it is unreadable. In the Tahquamenon pilot, existing comparison paragraphs and live-condition captions were rendered at only **9–11px**, which survived source checks but was visibly wrong in mobile screenshots. Fix typography alongside writing, and assert computed sizes in actual browser QA rather than judging only content strings. The same applies to a map panel that hides the changed answer below the fold.
