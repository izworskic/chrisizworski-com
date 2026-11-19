# Experience Investment skill

**Status:** Repository coding-agent skill. Source-only design direction; no deployed page, URL, ad edit, data feed, build step, or new dependency.

**Purpose:** Make new and existing outdoor tools more useful, legible and memorable without forcing them into one format. The Michigan Snow Totals visual refresh is a successful example of answer-first hierarchy, **not** a default skin for the other tools.

## Agent entry points

- Codex: .agents/skills/experience-investment/SKILL.md
- Claude Code: .claude/skills/experience-investment/SKILL.md
- Shared decision guidance: .agents/skills/experience-investment/references/DECISION_LENSES.md
- Review and delivery agreement: .agents/skills/experience-investment/references/REVIEW_AND_DELIVERY.md

The skill applies automatically for a new substantive visitor-facing experience, a major redesign or a meaningful new interaction **in this adopting repository**, or on explicit invocation. Minor bug fixes are exempt from the full review. Separate extracted repositories do not inherit this skill until each owner adopts a reviewed pointer.

## Example prompts

**New proposal:** "Use experience-investment to propose a visitor-focused Rideau Canal lock experience. Research what visitors actually want to know and compare two designs. Don't code yet."

**Review:** "Run experience-investment on the UP Waterfalls explorer. Inspect the actual 390px and desktop page, compare it to the closest existing tools, and rank the best visual and functional investments. Don't change source."

**Redesign:** "Use experience-investment to rebuild the Rocket Launch Live first-screen experience. Review first, choose the best design for launch-day visitors, implement in the owning repo, create a PR and show before/after browser evidence."

**Strict visual-only:** "Use experience-investment on Michigan Snow Totals, visual-only. Keep all data, source HTML text, APIs, canonicals, AdSense and release mechanics unchanged. Compare before/after at 390 and 1280."

A request for a proposal or review remains non-mutating. An explicit build/redesign request includes implementation and evidence, not just a work plan. Do not merge without an explicit merge instruction.

## What it chooses

The skill picks visual form from visitor decisions and evidence: e.g. a report comparison, verified geospatial explorer, chronological event board, lock operating diagram, hiking decision desk, field guide or other original interaction. It can combine ideas, but only when they are useful. It explicitly vetoes lookalike layouts that differ only by labels, photos and accent colors.

Shared code should standardize accessibility, identity, source freshness, type legibility, performance, navigation and QA. The page's hierarchy, graphic treatment, story and interaction should be subject-specific. All designs still obey the Experience OS distinctiveness hard gate.

## Integration with current systems

- Experience OS v1.2.1 remains the research, interaction-truth and release-quality authority: design-systems/experience-os-v1/.
- Experience Foundry 0.3 remains the existing-tool improvement and proof infrastructure: experience-foundry/.
- Visual V1 tokens are scoped to the approved Snow Totals pilot unless a later per-tool design deliberately adopts compatible tokens: design-systems/visual-v1/tokens.css.
- The on-demand Penpot skill retains its **explicit request only** rule; this skill does not automatically open or edit Penpot.
- Root AGENTS.md, owning repositories and their tests always outrank this guidance, especially ads, Person/canonical, source fidelity, visitor directions, data rights and full CI.

## Acceptance and review

The author must show why the selected design helps the named visitor more than alternatives and explain two material differences from the two most comparable existing tools. For reworks, record 390px and 1280px before/after screenshots if browser access permits. Also inspect 360/768/1440, keyboard/touch, no JS, reduced motion and relevant stale/photo/map failures. Run the owning repo's tests and full verify:all. A structural test does not prove the visual result; an absent browser run is NOT VERIFIED.

**Scope of this PR:** Add the skill, operating explanation, agent routing and structural tests only. No production page is changed. No claim of improved traffic, CTR or conversion is made.
