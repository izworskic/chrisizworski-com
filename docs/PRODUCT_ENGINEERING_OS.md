# Product Engineering OS
One operating manual for the chrisizworski.com product network.

Status: CANDIDATE v0.1, 2026-11-24. Proposed coordination layer, not a 43rd skill, replacement framework, activated instruction, or runtime. Existing AGENTS.md, owner instructions, skill-eval, Experience OS and release gates remain authoritative. Scope: 42 distinct skills documented in main AGENTS.md as of b6dbe9c105533842341ef0c82638590e85b140ee; reconcile with actual folder inventory before activation.

## Mission

Create original, useful, trusted digital products for real visitor decisions. Deliver production-level design and accurate intelligence together. Favor computed and sourced answers over generated filler. Standardize the quality. Never standardize away the imagination.

## 1. One entry, existing authorities

| Layer | Authoritative source | Responsibility |
| --- | --- | --- |
| Product Engineering OS (this document) | Proposed routing and evidence index | Decide which process and capabilities a task actually needs. Do not invent another release rubric. |
| Repository governance | [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md), [.github/copilot-instructions.md](../.github/copilot-instructions.md) and the actual owning repo | Ownership, user intent, protected contracts, scope and approval |
| Experience OS | [Experience OS instructions](../design-systems/experience-os-v1/AGENTS.md) | Visitor task, research, design, accessibility and acceptance; resolve current canonical version |
| Experience Investment | [Skill](../.agents/skills/experience-investment/SKILL.md) | Choose which investment and compare two credible concepts |
| Python Intelligence OS | [README](../design-systems/python-intelligence-os-v1/README.md) | Scientific and analytical engineering, model/source validation, smallest capable stack |
| Experience Foundry | [README](../experience-foundry/README.md), [improvement cycle](../experience-foundry/docs/IMPROVEMENT_CYCLE.md) | Implement the selected existing-tool improvement and demonstrate it with replay |
| Production Design Standard | [Candidate standard](PRODUCTION_DESIGN_STANDARD_DRAFT.md), [reference lab](../design-systems/production-design-pilot/README.md) | Proposed art direction, reusable component contracts, visual continuity, anti-slop and visual evidence |
| Search and business | [Search Strategy](SEARCH_STRATEGY.md), [retention](RETENTION_SKILLS.md), cost guard | Useful search-visible answers, comparable measurement, return value, protected ads and bounded cost |
| Creator identity and branded search | [AGENTS.md](../AGENTS.md#2-never-weaken-the-name), [Name SERP Moat](NAME_SERP_MOAT.md), [name-SERP governance](../benchmarks/name-serp-governance.json), [growth playbook](../MILLION_IMPRESSIONS_PLAYBOOK.md) | Protect the primary brand result and canonical Person, reinforce genuine authorship and distinct controlled origins, measure branded outcomes separately |

Field Guide V1 and Journey Atlas V1 are approved patterns where their visitor jobs fit, not default skins. Use the network registry and actual source ownership to avoid competing routes or editing an extracted mirror. Independent repositories require separately reviewed adoption; this document grants no cross-repo authority.

Order of precedence: explicit permitted owner scope and existing owner/repository hard constraints; authoritative source truth, rights and privacy; applicable existing OS/release gates; relevant specialist method; candidate guidance only for authorized evaluation. Never let a visual, SEO, analytics or retention objective override factual accuracy, accessibility, approved ad placement or source/ownership constraints.

## 2. Start every task by routing it, not loading everything

Record one sentence: visitor/owner goal, actual tool/owning repo, task mode and smallest useful outcome. Resolve the current main and open PRs; verify the owner-defined main gate before implementation. A red main is repaired first in its own authorized scope. Unknown CI remains NOT VERIFIED. Do not open a release-ready PR without required checks.

| Mode | Use | Skip |
| --- | --- | --- |
| FIX | Relevant guardrails, targeted regression and owning-repo full gate for changes | Full research cycle for tiny fixes |
| REVIEW | Inspect current source and actual rendered behavior if available; rank improvements; Experience Investment REVIEW if substantial | Production source mutations when review only |
| PROPOSE | Define decision and compare feasible designs, sources, scope, cost and acceptance | Creating a live route without implementation request |
| IMPLEMENT | Review or propose first; choose relevant methods, implement in owner repo and verify | Stopping with a plan; irrelevant capabilities |
| MEASURE | Applicable search, performance, science or return metrics with actual comparable evidence | Invented outcomes or unnecessary production edits |
| SKILL GOVERNANCE | skill-eval, inventory, lint, paired behavioral evaluation | Activation by declaration or wholesale skill rewrites |
| RELEASE | Existing exact-head CI and owner release contract; explicit merge approval required | New design scope, red-gate bypass, conflating merge with deployment |

For substantial new visitor tools or reworks, Experience Investment and Experience OS lead; return-visit-design is the existing additional lens. For existing-tool investment, use Foundry improve/assess/prove. For analytical work, follow Python Intelligence OS, even when the correct implementation is JavaScript or precomputed data. Significant changed interfaces require Playwright; add relevant web-quality checks. Plain-voice is for copy, not a factual rewrite. A request for "all skills" means screen the catalog for relevance, not execute all 42. Explicit-only tools remain explicit-only. Candidate intelligence skills may inform research but must not be claimed validated or adopted without their existing behavioral gates.

### Decision routing

- Is the core visitor decision unclear? Experience Investment first, not animation or layout.
- Is the answer scientifically wrong or missing? Fix the engine or source contract first, select the matching intelligence skill and compare an actual baseline.
- Is the answer correct but hard to use? Select experience/design methods, reuse verified components, inspect the first phone screen and prove the changed journey.
- Is there meaningful changing state that would bring someone back? Apply the return contract. "No return contract" is valid. No push notifications of any kind.
- Is ML actually necessary? Try deterministic or statistical baseline first; keep any approved model experiment bounded/offline. Never assume a connector grants local credentials or deployment permission.
- Is the issue only visual, copy, metadata, a broken control or cost? Choose the narrow method and preserve other contracts.
- Is a specialist external capability explicitly requested? Verify authorized target, runtime, connection and permissions; if absent, mark NOT VERIFIED and use supported local alternatives. Do not invoke REA, Penpot, Stitch or third-party CLI/MCP automatically.

## 3. One execution loop

1. Locate: authoritative source, canonical, generated outputs, open PRs, existing engines/components, source age, main verification and scope.
2. Diagnose: visitor question, first useful answer, observed friction, baseline and uncertainty; distinguish bug, design debt, source failure and opportunity.
3. Route: select only necessary skills from the catalog. State why and name material near misses rejected. Candidate methods require evaluation, and explicit capabilities require permission.
4. Design: compare two credible concepts for substantial work. For current-tool investments examine at least three opportunities under Foundry. Record purpose-driven differences from two related site tools. Choose the least complex technology that solves the problem; compare existing HTML/CSS/JS, backend, Python, Rust and Java as required by Experience Investment.
5. Build: reuse authoritative engines and tested components, change smallest coherent scope. Do not clone layouts or introduce dependencies, APIs, paid services, new build steps, cron, Redis or unapproved infrastructure. Maintain useful static answers, source links, privacy, SEO/Person and Auto ads. Evaluate candidate design guidance only within its approved pilot until activated.
6. Prove: same before/after scenario or holdout, targeted tests, actual render, failure states, full owner CI. Foundry replay must demonstrate at least one gain with preservation; structural evidence is not behavioral proof. Inspect browser screenshots rather than counting them. Existing Experience OS >=90/100, every area >=4/5, and all hard gates remain authoritative for substantial releases.
7. Release and learn: separate committed, PR open, full checks passed, merged, matching deployment READY, live verified and measured visitor outcome. Do not infer any stage from another. Open PR, no auto-merge. Capture proven reusable component or lesson; do not claim traffic, revenue or retention uplift without comparable evidence.

### Permanent search and creator-identity checkpoint

Apply the existing authoritative name-SERP and search governance to **every** product investment, including a small fix, a shared engine change or a release with no SEO intent. This is an explicit routing/evidence checkpoint, not a new skill, duplicate scorecard, title policy, or activation of this candidate framework.

- **Before:** resolve the canonical intent owner and generated source, inspect protected name surfaces and the actual affected page(s), read AGENTS.md section 2 and NAME_SERP_MOAT.md. For growth work read the growth playbook and session log. Record title, H1, canonical, indexability, defined Person and author/creator/publisher relationships, visible creator credit and relevant identity links. Use actual source/production evidence and state any gaps. Preserve existing approved query-first title exceptions; follow the current growth ledger's ship-and-observe mode, not obsolete experiment freeze lists.
- **During:** preserve or strengthen genuine Chris Izworski authorship, the canonical Person `https://chrisizworski.com/#person`, the primary branded homepage and the primary identity surface `/chris-izworski/`. Keep subject-first answers, useful crawlable content, verified source attribution and truthful links to relevant Projects/Works. Prefer the exact creator name in the title when the owning policy permits and length fits; do not force the name into intent-first H1s or weaken approved titles. Never use a product homepage as Person sameAs merely because its creator owns it; do not manufacture profiles, doorway pages or link networks. Changes to protected files require the existing explicit owner approval label, not this manual.
- **Before release:** compare before and after for all materially affected public pages and generated outputs, including shared templates. Record evidence of no regression or an explicitly approved change in the existing PR/release review. Run the existing creator-entity, name-SERP protection, search governance, canonical/freshness and full owning-repo gates; inspect output and production after deployment. Unknown evidence remains NOT VERIFIED. Independent repos must be checked under their own contracts; do not infer coverage from a central green check.
- **Measure separately:** non-branded demand/CTR and revenue are not branded rank evidence. Use comparable 28-day GSC windows and query segmentation where available. For exact-name and close-name SERP observations, use the existing monthly and material-entity-change protocol, distinct controlled-origin/account counting, and top-10/20/30 classifications in name-SERP governance. Preserve credible earned results. Same-root pages and subdomains support the entity but do not add independent moat slots. Report actual snapshots and gaps, not guarantees; do not infer branded rank from CI, metadata, traffic growth or deployment.
- **Owner goals:** primary homepage position 1, controlled independent top-ten target 8 (floor 7), favorable earned target 2 where high-quality authority exists, attributable occupancy targets 15/20 and 20/30. Use the governance JSON as authoritative if targets change. Do not trade product usefulness, factual accuracy or approved search ownership for name repetition.

For each Wave Two release and later portfolio investment, add a short identity/search evidence line in the existing PR record. A no-change result is valid if verified. A separate name-SERP repair, identity surface update or external profile action requires its own appropriate scope and approval.

## 4. Shared craftsmanship: one platform, many products

Four candidate families from the Production Design Standard:
- Live intelligence: freighters, locks, aurora, weather and ice. Lead with dated evidence and the next useful action; preserve distinctions among observation, forecast, inference, simulation and unknown.
- Geographic discovery: waterfalls, beaches, rivers, parks and adventure. Recognizable geography, accurate real photographs, map/list continuity, verified access and useful fallbacks.
- Planning: gardens, holiday travel and journeys. Useful input, explicit tradeoffs, source-backed actionable plan, meaningful saved state where justified.
- Interpretation: locks, bridges, landscapes and physical mechanisms. Source-grounded narrative, explanatory diagrams and meaningful optional motion.

Share semantic type roles, spacing, focus, source/time/status vocabulary, selection behavior, map symbols, controls and failure treatments. Do not enforce one hero, palette, page order, card grid, map placement or graphic treatment. The draft Design Laboratory reuses existing ship icon code and candidate tokens outside public/; Snow Totals Visual V1 remains an approved pilot only, not global CSS. Real photos require actual provenance and permission. Keep copy factual, plainspoken and interpretive where appropriate. No fake scores, generic marketing language, repetitive boxes or distracting decoration. Subtract redundant interface elements without removing protected indexed facts or useful content.

Eight standard responsibilities already mapped to existing authorities (not eight new skills): visual design and art direction (Experience OS candidate); interaction and geography (Experience OS and existing Google Maps standard); editorial voice (plain-voice and interpretive guidance); data presentation (source contracts and visual-data-storytelling candidate); scientific engineering (Python Intelligence OS); performance and accessibility (web quality and Playwright); evidence and release (Foundry and owning-repo gates). These should eventually share the proven component library, not duplicate rules in each skill.

## 5. Skill catalog: all 42 documented capabilities

The linked SKILL.md is the actual method. This index describes routing and expected output, not a substitute for reading it. Candidate means independent behavioral validation is pending; documented or available does not mean proven. Do not infer maturity from a file's presence. Mirror copies remain governed by skill-lint; experience-investment, penpot-design and rea are explicitly exempt from a Copilot folder copy (Copilot can reference the Codex files through its instructions).

### Experience and research (7)

| Skill | Select when | Required output | Routing |
| --- | --- | --- | --- |
| [experience-investment](../.agents/skills/experience-investment/SKILL.md) | Substantial visitor tool, UX review or redesign | Visitor job, two real concepts, design/technology choice, evidence | Automatic for major visitor work |
| [design-reconnaissance](../.agents/skills/design-reconnaissance/SKILL.md) | Compare external design approaches | Dated observations and original alternatives | When relevant; external tools opt-in |
| [editorial-diagrams](../.agents/skills/editorial-diagrams/SKILL.md) | Explain real physical mechanisms | Accessible sourced diagram and static equivalent | When relevant |
| [interactive-2d-scenes](../.agents/skills/interactive-2d-scenes/SKILL.md) | Motion genuinely teaches or changes an answer | Smallest capable rendering stack and fallback | When relevant |
| [penpot-design](../.agents/skills/penpot-design/SKILL.md) | Explicit Penpot request | Verified editable design and review | Explicit owner request only |
| [stitch-concept-review](../.agents/skills/stitch-concept-review/SKILL.md) | Explicit Google Stitch request | Concept comparison, including local alternative | Explicit owner request only |
| [rea](../.agents/skills/rea/SKILL.md) | Explicit authorized reverse engineering target | Reproducible observations, not copied code/assets | Explicit owner request only |

### Scientific and analytical intelligence (11)

| Skill | Select when | Required output | Routing |
| --- | --- | --- | --- |
| [environmental-intelligence](../.agents/skills/environmental-intelligence/SKILL.md) | Weather, ice, wind or shoreline calculations | Source and units ledger, held-out comparison | Candidate; evaluate first |
| [movement-intelligence](../.agents/skills/movement-intelligence/SKILL.md) | Time-stamped tracks or AIS movement | Validated trajectory, observed/inferred/forecast separation | Candidate; evaluate first |
| [calibrated-prediction](../.agents/skills/calibrated-prediction/SKILL.md) | Forecasts, dates, ETAs, probabilities | Out-of-time validation, naive baseline and uncertainty | Candidate; evaluate first |
| [geospatial-intelligence](../.agents/skills/geospatial-intelligence/SKILL.md) | Geometry, proximity, boundaries, spatial joins | Spatially validated output, access caveats | Candidate; evaluate first |
| [journey-optimization](../.agents/skills/journey-optimization/SKILL.md) | Feasible routes and time windows | Constraints, comparison and infeasible fallback | Candidate; evaluate first |
| [hydrological-intelligence](../.agents/skills/hydrological-intelligence/SKILL.md) | Reach, watershed, stage and flow relationships | Gauge provenance and reach validation | Candidate; evaluate first |
| [engine-property-testing](../.agents/skills/engine-property-testing/SKILL.md) | Engine invariants and boundary cases | Seeded reproducible counterexamples | Candidate; evaluate first |
| [data-contract-validation](../.agents/skills/data-contract-validation/SKILL.md) | Source schemas, ingestion, missingness and freshness | Versioned contracts and failure fixtures | Candidate; evaluate first |
| [visual-data-storytelling](../.agents/skills/visual-data-storytelling/SKILL.md) | Scientific charts, history and uncertainty | Legible truthful charts and accessible equivalent | Candidate; evaluate first |
| [historical-data-intelligence](../.agents/skills/historical-data-intelligence/SKILL.md) | Archives, seasonal baselines, backtests | Versioned joins, coverage and reproducible comparisons | Candidate; evaluate first |
| [public-data-scout](../.agents/skills/public-data-scout/SKILL.md) | New external data feed | Primary-source ledger, rights and failure handling | When relevant |

### Hugging Face and machine learning (8)

| Skill | Select when | Required output | Routing |
| --- | --- | --- | --- |
| [hf-cli](../.agents/skills/hf-cli/SKILL.md) | Hub metadata and repository discovery | Pinned revision and usage/rights assessment | Bounded, opt-in |
| [huggingface-best](../.agents/skills/huggingface-best/SKILL.md) | Determine whether ML is justified | No-model and competing-model benchmark | Bounded, opt-in |
| [huggingface-datasets](../.agents/skills/huggingface-datasets/SKILL.md) | Inspect a candidate corpus | Schema, coverage, provenance and rights review | Bounded, opt-in |
| [huggingface-tool-builder](../.agents/skills/huggingface-tool-builder/SKILL.md) | Repeated research requiring local scripts | Bounded reproducible read-only script | Bounded, opt-in |
| [transformers-js](../.agents/skills/transformers-js/SKILL.md) | Consider browser or offline inference | Measured bytes, latency, privacy and fallback | Bounded, opt-in |
| [hf-semantic-discovery](../.agents/skills/hf-semantic-discovery/SKILL.md) | Semantic discovery/search experiment | Held-out query relevance vs lexical baseline | Bounded, opt-in |
| [hf-visual-evidence](../.agents/skills/hf-visual-evidence/SKILL.md) | Already-sourced photo QA | Review-only captions/duplicates, human confirmation | Bounded, opt-in |
| [hf-forecast-benchmark](../.agents/skills/hf-forecast-benchmark/SKILL.md) | Offline forecast model challenger | Out-of-time comparison and calibration | Bounded, opt-in |

### Visitor retention (5)

| Skill | Select when | Required output | Routing |
| --- | --- | --- | --- |
| [return-visit-design](../.agents/skills/return-visit-design/SKILL.md) | Substantial new tool/rework or return problem | Return contract, or no meaningful return job | Automatic inside major Experience Investment |
| [condition-alerts](../.agents/skills/condition-alerts/SKILL.md) | Supported changing condition or dated event | Existing cached calendar/feed, no subscribers or push | Only after valid return contract |
| [my-spots-offline](../.agents/skills/my-spots-offline/SKILL.md) | Useful saved places or low-signal use | Local storage, clear controls and timestamped cache | Only after valid return contract |
| [computed-windows](../.agents/skills/computed-windows/SKILL.md) | Astronomical/light windows | Validated local-time calculations | When relevant; calendar only if justified |
| [return-metrics](../.agents/skills/return-metrics/SKILL.md) | Measure return contract | Comparable GA4 evidence or NOT MEASURED | When relevant; read-only |

### Web and browser quality (8)

| Skill | Select when | Required output | Routing |
| --- | --- | --- | --- |
| [web-quality-audit](../.agents/skills/web-quality-audit/SKILL.md) | Cross-disciplinary audit or major release | Evidence-backed defect priorities | When relevant |
| [web-quality-performance](../.agents/skills/web-quality-performance/SKILL.md) | Load, images, JS and requests | Controlled performance comparison | When relevant |
| [web-quality-core-web-vitals](../.agents/skills/web-quality-core-web-vitals/SKILL.md) | LCP, INP, CLS | Lab vs field metrics separated | When relevant |
| [web-quality-accessibility](../.agents/skills/web-quality-accessibility/SKILL.md) | Changed map, form or interface | Automated plus manual accessibility review | When relevant |
| [web-quality-seo](../.agents/skills/web-quality-seo/SKILL.md) | Metadata, canonical, schema, indexed answers | Search integrity and comparable evidence | When relevant |
| [web-quality-best-practices](../.agents/skills/web-quality-best-practices/SKILL.md) | Storage, embeds, third-party scripts, resilience | Failure, privacy and dependency review | When relevant |
| [playwright-browser-qa](../.agents/skills/playwright-browser-qa/SKILL.md) | Changed interaction, map or major visual redesign | Actual responsive/keyboard/failure evidence and regression tests | Automatic for substantial interface work |
| [agent-browser-qa](../.agents/skills/agent-browser-qa/SKILL.md) | Authorized iterative browser diagnosis | Observed state, snapshots, console and network | Opt-in investigation; not regression replacement |

### Agent governance and editorial (3)

| Skill | Select when | Required output | Routing |
| --- | --- | --- | --- |
| [skill-eval](../.agents/skills/skill-eval/SKILL.md) | Skill creation, edits, audit or suspected misrouting | Fresh-context trigger/paired evidence | Required for skill changes; not a substitute for CI |
| [plain-voice](../.agents/skills/plain-voice/SKILL.md) | Visible copy or generated-sounding text | Human readable copy, unchanged facts and pinned fields | When relevant |
| [vercel-cost-guard](../.agents/skills/vercel-cost-guard/SKILL.md) | Functions, cron, middleware, rewrites, caching, images or build cost | Actual usage and incremental cost record | When relevant |

## 6. Practical routing recipes (examples, not mandatory packs)

| Task | Lead and select as justified | Do not automatically select |
| --- | --- | --- |
| Duluth map visual continuity | Experience Investment, OS, existing Seaway glyphs, Playwright; source contract if actual type data missing | New AIS feed, arrival model, uniform four-port page layout |
| Freighter arrival intelligence | Python OS, movement and calibrated prediction candidate evals, data contracts, Foundry, applicable UI/browser checks | ML or new map stack without benefit |
| Beach Real Feel accuracy | Environmental/property/data candidates, Python OS, held-out shore observations, Foundry, relevant UI checks | Weather design alone, unvalidated model claims |
| Beach map usability | Experience Investment for substantial rework, Playwright, geospatial only if coverage calculation changes | New scientific formula for a pinch-zoom defect |
| Garden decision planner | Experience Investment, relevant environmental/history methods, return contract, saved spots only if useful, plain-voice and Playwright | Mandatory ML, badges or alert prompts |
| Waterfall explorer | Experience Investment, design reconnaissance, geospatial if needed, source/rights, plain-voice, optional already-sourced photo QA | Generated place photos, generic weather dashboard |
| Ice-cover history | Historical and visual storytelling candidates, source/units and chart acceptance | Decorative maps, false live readings |
| SEO correction | web-quality-seo, affected pinned tests and full gate | Experience redesign, ads changes, unnecessary science work |
| Skill audit | skill-eval, directory/mirror/reference inventory, overlapping triggers, evidence registry | Production changes, unrequested external tools |

## 7. One operating record

Reuse the existing Experience Brief, Foundry record and release review where applicable; link them instead of duplicating them. For a small fix, one concise PR paragraph is sufficient. For substantial work, fill this routing summary before implementation and complete the evidence at review:

```text
Task / mode / owner / canonical:
Visitor decision and observed friction:
Baseline SHA and existing PR / main status:
Selected capabilities and reasons:
Rejected near misses / explicit-only permissions:
Relevant existing components and engines:
Two concepts / selected design and technology:
Three opportunities (Foundry when applicable):
Source and data contract / uncertainty / failure path:
Protected facts, SEO, creator identity/name-SERP evidence, ads, privacy, cost, scope:
Before/after scenarios and evidence locations:
Targeted tests / browser and screenshot review / full CI:
Release state / measured outcomes or NOT MEASURED:
Next meaningful investment / reusable lesson:
```

Do not use this record to claim any absent result. A skill evaluation is not scientific proof. A test screenshot is not inspected visual quality. A preview is not production. A measurement gap is not a zero.

## 8. Maturity and activation

- Existing documented method: available for its stated scope, evaluation may be unknown.
- Candidate: specific test cases and pilot needed; ten specialist intelligence skills are explicitly in this category per existing docs.
- Evaluated: fresh-context baseline and with-guidance evidence, no regression, recorded actual trigger results.
- Proven pattern: evaluated method plus successful owning-tool implementation and relevant browser/scientific/CI evidence. Measured visitor impact remains separate.
- Deprecated: duplicate/ineffective method, removal only after review of consumers, mirrors and historical references.

This PR retains all earlier design work and [production design evaluations](skill-evals/production-design-standard.md). [Product Engineering OS evaluation](skill-evals/product-engineering-os.md) defines 25 routing and pressure cases. Before activating either candidate, run the existing skill-eval baseline and paired trials, enumerate all actual skill directories, check mirror/reference parity, reconcile current main and run full CI. If no meaningful behavior changes, keep existing guidance and do not add another instruction layer. If proven, add a short pointer in existing central agent entrypoints and Experience Investment as needed, not 42 copies of this manual. Test separately in each independently owned repository before claiming adoption. Preserve all existing hard gates.

Recommended first product pilot: Duluth vessel symbol consistency, then a contrasting non-maritime tool such as Snow Totals versus waterfall discovery. Reference the lab, inspect actual screens and prove the changed visitor journey. Use approved components only after review. Broader adoption and visual-regression baselines follow actual results, not wholesale reskinning.

## 9. Current status

Consolidates the session's research, design candidate, component lab and repository skill source audit into one navigation and task-routing reference. This manual and its evaluation cases are proposed, not activated. No skill bodies, root agent instructions, public pages, ads, data, infrastructure, or runtime dependencies modified by the manual. Fresh-context paired tests, current main push status, lab browser execution, screenshot review, full local CI and independent repo adoption are NOT VERIFIED. No automatic merge or release.
