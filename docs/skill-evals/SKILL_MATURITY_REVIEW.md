# Phase 7: skill maturity and overlap review

2026-11-24. Source inventory audited at 5a8fc9ba1ddd94718aebd9061d5bc246b82262d4. Candidate governance record, not a new skill, instruction override or authority to activate, edit or retire skills.

## Actual findings

- 42 logical skills in the Product Engineering OS catalog and 42 Codex directories; 42 Claude Code and 39 Copilot SKILL.md files, 123 total. No missing expected file or differing applicable SKILL.md blob. Intentional Copilot exceptions: experience-investment, penpot-design and rea.
- Experience Investment owns three shared references in .agents/skills/experience-investment/references; Claude points to the existing owner. Do not clone them to force directory equality.
- 10 specialist intelligence skills are documented candidates with individual case suites; five retention and three tooling skills have grouped dedicated cases. 18 of 42 skills have dedicated cases located. The other 24 have no dedicated suite located in docs/skill-evals; cross-skill scenarios are not a full per-skill suite.
- Existing orchestration (25), design trigger (20) and paired design (8) cases remain unexecuted in independent contexts. No behavioral accuracy, incremental effect, regression rate or retirement decision is established. Zero verified behavioral evaluations in this registry is not proof that no other agent has ever used a skill.
- Source/fixture/browser tests and observed product improvements are separate evidence. Duluth, the design gallery and editorial examples are useful artifacts, not proof that an instruction caused better agent performance.
- Reviewed 12 potentially overlapping groups. The routing boundaries are in skill-maturity-registry.json. Retain all 42 for now: there is no paired evidence supporting removal or instruction changes. Four groups merit targeted overlap trials. Do not consolidate on name similarity alone.

## Evidence and maturity dimensions

Keep documented state, inventory, case coverage, behavioral effectiveness, implementation proof and visitor outcome separate. The registry is an audited snapshot; it does not imply mandatory use. A skill can be well-formed and useful without independent effectiveness evidence. A candidate can pass a product test while remaining NOT VERIFIED behaviorally.

Use the existing skill-eval process. New/changed descriptions require trigger trials; a body edit requires a failing baseline and a matched with-skill run. Preserve the existing >=90% routing target, zero unauthorized explicit-only triggers, zero hard constraint violations, no baseline regressions and demonstrated incremental value. No extra weighted score. An evaluated skill still needs real owning-tool proof before any proven-pattern claim. An evaluated redundant skill is a possible retirement candidate only after checking references, consumers, all mirrors and owner approval.

## Execution sequence

1. Run the already-authored orchestration and production design cases first, in independent fresh contexts. Do not skip this prerequisite because the reference has been merged as a candidate.
2. Prioritize engine-property-testing and data-contract-validation for correctness, then environmental-intelligence and movement-intelligence on the existing proposed pilots. Use existing cases and identical frozen fixtures. Evaluate calibrated prediction only when eligible held-out outcomes exist.
3. Evaluate the design/QA boundary (Experience Investment, Playwright, web audit and plain voice) using real repository tasks. Add dedicated trigger and paired cases where none exist before altering a skill. Compare a narrow task to a major redesign and a pressure-to-ship task.
4. Run the overlap trials for performance vs CWV, domain prediction vs HF challenger, diagrams vs visual storytelling, and generic HF discovery vs task-specific benchmarks. Require correct exclusions as well as inclusions.
5. Expand dedicated coverage for the other skills in relevant groups, not a single expensive 42-skill run. Mark unrun cases explicitly, then decide retain, refine, retire-candidate, or activate-candidate on evidence.

## Fresh-context handoff (blocked here)

The current connector environment can inspect and modify GitHub and execute bounded scripts. No independent coding-agent runner with fresh matched contexts was located. Do not simulate independent trials inside a single context, invoke a paid API, install another agent runtime, or add a new workflow that consumes model credentials. Use the owner's authorized coding-agent environment when available.

For each trial use the same exact repository commit, task prompt, fixtures, model/harness/version, tool access and budget. Run baseline first in a fresh session, then with the relevant skill in a separate fresh session. Preserve the exact loaded instructions, selected/excluded skills, tool actions and redacted outputs; keep assertion definitions fixed before the run. Record a distinct session identifier, case ID, variant, observed assertion results, evidence references, unauthorized triggers, hard violations and any baseline regressions. Record the denominator including unexecuted cases. Follow the existing per-skill and framework evaluation documents. No invented agent outputs or credentials in the repository.

## Maintenance

The registry and structural audit are read-only evidence, not an agent instruction. Run `node --test tests/skill-maturity-registry.test.js` alongside existing skill-lint. The test detects catalog/registry mismatch, changed skill blob, broken mirror or missing case file, invalid authorization boundary and unsupported maturity claims. A legitimate skill update must refresh the affected audit entry with an evidence-backed review; this test is not an independent behavioral evaluation. Do not change an audited hash just to silence the test. Keep exact-head full CI and owner merge approval. No public source, ad/SEO, active skill or production dependency changed.

Phase 7 inventory and readiness completed; independent evaluation and decisions BLOCKED, not complete. Phase 8 broad activation must not proceed on the basis of this snapshot.
