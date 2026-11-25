# Product Engineering OS: Phase 1 execution charter

2026-11-24 | Candidate v0.1 | Status: PREPARED, not started or approved for activation.

## Purpose and scope

Prove that the proposed orchestration and production-design references produce measurably better agent decisions and usable component specimens than the existing instructions, without regressions or unnecessary process. This charter is a validation plan and durable handoff, not another skill, an active instruction override, or a replacement QA rubric.

Read the [Product Engineering OS manual](PRODUCT_ENGINEERING_OS.md), [Production Design Standard candidate](PRODUCTION_DESIGN_STANDARD_DRAFT.md), [orchestration cases](skill-evals/product-engineering-os.md), [design cases](skill-evals/production-design-standard.md), and [lab README](../design-systems/production-design-pilot/README.md). Current owning-repository AGENTS.md, skill-eval and Experience OS acceptance rules control all execution.

Scope: audit, isolated evaluation, candidate refinement, local browser verification, narrow activation pointers if proven, and release review. Excludes production tool changes, Duluth migration, portfolio-wide design rollout, new skills, external services, paid infrastructure, new runtime dependencies, ad/SEO changes, and cross-repository mutations. Phase 2 is separate. No auto-merge.

## Work order and acceptance

| ID | Deliverable | Definition of done | Initial status |
| --- | --- | --- | --- |
| P1.0 | Reconcile checkout and inventory | Verify actual main SHA and latest main Agent branch verification; repair red main separately before proceeding. Reconcile draft PR #1912 with main without losing other work. Enumerate actual skill directories, reconcile 42 documented names, check mirrors and references, document intentional exemptions. Record agent/browser/CI availability and exact revisions. | Pending |
| P1.1 | Behavioral baseline | Run 25 orchestration scenarios and existing design trigger/paired-task cases in fresh baseline contexts under current instructions. Freeze task, fixtures, model/harness, tools, budget and grader before runs. Keep exact loaded instructions and outputs; record missed assertions. | NOT VERIFIED |
| P1.2 | Candidate comparison | Run same cases in fresh candidate contexts, compare to baseline against predefined assertions. Existing skill-eval threshold and both case documents apply: at least 90% trigger/routing accuracy, zero unauthorized explicit-only activations, zero hard constraint violations, no lost baseline successes, and demonstrated incremental value. Evaluate orchestration and design reference independently where practicable. | NOT VERIFIED |
| P1.3 | Component lab | Run python3 design-systems/production-design-pilot/verify.py with real Chromium from a complete local checkout. Inspect screenshots at 390 and 1280 widths and the five-width behavior assertions. Verify local assets, keyboard, selection, stale/unavailable and no-JS paths. Manually inspect all significant states for hierarchy, readable text, overflow and misleading presentation. Preserve WCAG and existing design acceptance rules. | NOT VERIFIED |
| P1.4 | Decide | If baseline meets every assertion or candidate adds no material benefit, do not activate the redundant layer. If a candidate fails or regresses, refine only the failing portion and repeat matched evaluations. Record separate KEEP / REVISE / REJECT decision and evidence for orchestration and design. | Pending |
| P1.5 | Integrate proven guidance | Only after P1.0-P1.4 pass for the relevant candidate: propose concise links in root AGENTS.md, CLAUDE.md, Copilot instructions and Experience Investment/Experience OS references where needed. Avoid duplicating all 42 bodies. Follow existing skill-eval and mirror rules for any skill change. Keep old authorities and existing release scorecard. | Blocked on evidence |
| P1.6 | Release review | Run skill lint, relevant tests, full npm run verify:all, inspect exact-head PR CI and conflicts. Check no public, ads, data, canonical, dependency or runtime changes. Present evidence and owner merge decision; merge only with explicit approval and all required gates. | Blocked on evidence |

The current draft reference and source audit are useful inputs, not passing results. Earlier static verification found 42 unique named skills and seven contrast pairs above 4.5:1; no independent agent runs or browser runs have yet been established. Main push workflow status remains unverified in the prior connector session. Recheck current state at execution time.

## Evidence record and resume contract

Maintain one dated Phase 1 results document under docs/skill-evals/ containing:
- Current step, status (NOT STARTED / IN PROGRESS / PASS / FAIL / NOT VERIFIED / BLOCKED), exact baseline and candidate SHA, open PR and last successful checkpoint.
- Per-case ID or prompt, expected skill selection/forbidden actions and task assertions, actual baseline and candidate outputs, score, regressions, and artifact links or redacted excerpts. Denominator includes unrun cases for completeness; do not report unrun as passing.
- Browser command, executable and version, exit status, viewport and screenshot paths, actual visual observations, defects and retest results. Do not claim visual review from a script alone.
- Targeted tests and full CI command, exit code, run URL, head SHA and observed conclusions. Separate merge, deploy and production verification.
- Decision per candidate, changes made, blockers, remaining tasks and one next action.

Use fresh independent contexts; a single agent reading both versions cannot stand in for a blinded paired trial. If the current environment has only repository read/write tools, do the supported inventory and static checks, record the missing execution capability, and provide the precise handoff to an authorized coding-agent environment. Do not fabricate behavioral results, bypass required tests, install tooling without authorization, or keep expanding the framework to fill time. Keep any sensitive traces or screenshots out of public commits.

Resume after interruption by reading this charter, the latest results document and current PR state, then continue the earliest unfinished gate. Never rely solely on conversation memory. New work that changes acceptance criteria must be documented and reviewed before rerunning.

## Exit and next phase

Phase 1 completes only when both candidate decisions are evidence-backed, required gates for accepted guidance pass, and the owner has approved any merge. An evidence-backed rejection is a valid result. A blocker is not completion. Phase 2 begins with a separate scoped Duluth pilot only after relevant approval; it is not included in Phase 1.

Success means better, narrower decisions, real design quality and verifiable product improvements, not more instructions, more skills or more files.
