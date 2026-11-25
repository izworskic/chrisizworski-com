---
name: experience-investment
description: "Design-investment director for chrisizworski.com tools. Use for a new visitor-tool proposal, a substantial visual or UX review, or implementing a redesign after review. Select a purpose-built experience instead of repeating the Snow Totals layout. Follow owning-repo, Experience OS, Foundry, source and release gates."
---

# Experience Investment: form follows the visitor's job

This skill is an orchestration and judgment layer, not a page template, theme generator, autonomous publisher, or substitute for Experience OS. Make each tool more useful and more compelling by choosing visual form, information hierarchy and interaction from what the visitor needs to do. **Standardize the quality. Never standardize away the imagination.**

## How to invoke

- "Use experience-investment to propose a new Rideau Canal tool" = PROPOSE.
- "Use experience-investment to review the waterfall explorer" = REVIEW.
- "Use experience-investment to redesign the rocket viewing planner" = IMPLEMENT, including review first.
- A substantial new-tool build or existing-tool rework also triggers this skill automatically in the adopting repository. Tiny copy or bug fixes use only relevant guardrails.
- If the owner requests a design proposal/review only, do not edit production. If the owner requests implementation, proceed through review, selection, code and verification in that same task; do not stop at a generic plan.
- Scope and approval are explicit: preserve any user-imposed visual-only, single-page, data/API, SEO, ads or no-dependency boundaries. Never infer permission to merge or deploy.

## Mandatory read order

1. Read the owning repository's AGENTS.md and relevant tests **before** deciding where or what to change. Identify the real source, generated outputs, canonical URL, existing PRs, overlapping work, owner and current baseline. Deployment mirrors are not source owners.
2. Read design-systems/experience-os-v1/AGENTS.md, docs/ANTI_PATTERNS.md, docs/QA_SCORECARD.md, docs/INSPIRATION_LIBRARY.md, docs/INTERACTION_PATTERN_LIBRARY.md and docs/TECHNOLOGY_DECISIONS.md. Use v1.2 operating kit and release evidence for substantial implementation.
3. Read experience-foundry/README.md and docs/IMPROVEMENT_CYCLE.md for existing-tool execution, proof and replay. Reuse field-guide-v1 or journey-atlas-v1 **only where the visitor job warrants it**.
4. Read the decision and review references at .agents/skills/experience-investment/references/DECISION_LENSES.md and .agents/skills/experience-investment/references/REVIEW_AND_DELIVERY.md.
5. Read .agents/skills/experience-investment/references/TECHNOLOGY_FIT_REVIEW.md **before selecting a stack**. Produce a documented accept/reject judgment for HTML/CSS, browser JS/TS, existing backend, Python, Rust and Java. No language is mandatory.

## Step 1: Diagnose the real job

State the visitor persona, question, decision, urgency, source uncertainty, and the first useful answer. Inspect current rendered phone and desktop experiences for existing tools, not merely CSS or source. Inventory all search-visible content and existing actions. Separate visual debt from missing user utility, data quality or source integrity. Look for: bulky headers, answer below articles, interchangeable bordered boxes, inaccessible contrast, arbitrary radii, weak data hierarchy, empty/failed maps, generic filler imagery, confusing units, inert controls, and irrelevant visual flourishes. Record actual evidence and limitations.

For new tools, first determine whether the job is already solved by an existing canonical tool. An unneeded new page is not an investment.

## Step 2: Choose a design direction, not a skin

Use DECISION_LENSES.md to choose the primary interaction and visual grammar based on the job: e.g. condition dashboard, geographic explorer, interpretive story, comparison bench, event timeline, route planner, or explanatory working model. Families are hypotheses, not presets. A tool may require a new form not in the list.

Produce **two materially different concepts**, each with its first-phone-screen answer, decisive user action, desktop spatial organization, primary evidence visualization, failure state and implementation cost. Compare with the **two closest existing tools**. Reject concepts whose first screen and interaction could be recreated by swapping Snow Totals labels, photos or colors. If neither concept has an observable user benefit, improve the underlying utility first or recommend no redesign.

Choose deliberately. Favor legible type hierarchy, restrained but subject-appropriate color, intelligent whitespace, meaningful charts, exact-place credited imagery when useful, and interactions that change an answer. Do not force the Snow Totals 56px number, full-width map, inline bars, light header, five-step blue ramp, or universal cards on unrelated tools. Its visual-v1 tokens are an opt-in reference for appropriate components, not permission to roll out the pilot.

## Step 2b: Technology Fit Review

Before implementation, use TECHNOLOGY_FIT_REVIEW.md to inventory the owning repository, identify measured visitor or engineering constraints, evaluate competing languages and existing engines, and record a smallest-capable-stack decision. Write down why Python, Rust, Java, HTML/CSS and JavaScript do or do not add value. Do not mistake a technology checklist for a request to introduce it; an unchanged stack can be the winning investment.

## Step 3: Implement only the justified investment

For IMPLEMENT, make the smallest coherent change in the authoritative source and preserve all existing factual, indexed content unless the request explicitly authorizes editorial changes. Preserve canonical and Person schema, ads and ad exclusions, source age and units, rights/credits, map attribution and safe access, privacy, URL contracts, no-Redis/deployment costs and no-JS answer path. Semantic HTML and responsive CSS first; JS only for real state changes; SVG/charts, Python, Rust/WASM, 3D or additional frameworks only when they solve demonstrated visitor problems. Never introduce a Vercel function or build step to repaint a page.

For existing tools, use the Foundry improve → assess → prove workflow when applicable, with the same credible before/after visitor scenarios. Do not claim that its assessment measures aesthetic originality. For new substantial work, fill the Experience OS brief and state matrix. Penpot remains **explicitly opt-in**, under penpot-design/SKILL.md; do not automatically call it.

## Step 4: Prove function and distinctiveness

Review at 360, 390, 768, 1280 and 1440px, with before/after at 390 and 1280 for redesigns. Inspect actual screenshots and changed states, not just generated filenames. Verify first answer and next action, keyboard/focus/touch, WCAG AA contrast, no-JS path, reduced motion, narrow overflow, slow/offline/source-stale behavior, loaded photos and license credits, map tiles and meaningful fallback, and A→B→A state consistency as applicable. Run targeted tests, the owning repository's full gate and verify exact CI status. No test/CI/browser access means NOT VERIFIED, not passed. Use the Experience OS weighted QA scorecard, including its separate distinctiveness veto. Include links to evidence, actual test output, PR, and exact unresolved items.

## Output contract

Follow REVIEW_AND_DELIVERY.md and include the Technology Fit Review for substantive work. Always state which mode ran, the visitor job, concrete design choice and why it differs, the first-screen/mobile treatment, protected constraints, and the next action. For proposals, deliver actionable concepts, not a static page clone. For reviews, rank changes by visitor impact, confidence, effort and risk with evidence. For implementation, make and report source changes and test outcomes rather than ending at a prompt. Do not promise SEO lift, faster interaction, real-time freshness or improved usability without measurements.
