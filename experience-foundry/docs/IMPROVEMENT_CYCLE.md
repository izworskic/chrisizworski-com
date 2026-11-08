# Foundry improvement cycle 0.3

The output of an improvement assignment is an implemented, reviewable change with evidence of a useful new visitor capability. The agent does research, design and coding. Foundry supplies captured source, an explicit assignment, gap detection and executable before/after evidence. It is not an autonomous coding service or a compulsory interface template.

## Choose work before choosing a layout

Start with the actual unfinished visitor task. Read the source, use the existing experience, inspect current PRs and identify reusable intelligence. Record dated evidence, including uncertainty. Investigate at least three opportunities; name the changed outcome, existing capabilities, effort and risks for each. Select using an explicit tradeoff, not invented traffic estimates or a numerical score with no measured basis.

Compare two **credible** designs for the selected opportunity. Both must be feasible and useful. A deliberately misleading GO indicator is not a credible alternative to a cautious link. Review what a visitor sees first, what choice they make, what changes in response, what they can finish and why the design fits this particular tool. The structural checker catches missing and duplicate descriptions; it cannot certify imagination or detect a sophisticated strawman. The agent must perform and record the substantive review required by Experience OS.

## Commands and files

`improve --slug NAME --owner REGISTRY_ID --question QUESTION --files PATH,PATH` captures source from `HEAD` by default. `--baseline REF` selects another committed baseline. Use the full-history authoritative owner checkout; extracted-tool mirrors are not acceptable. The current registry provides intent ownership, not repository ownership. Verify `owningRepository` independently.

The eight-file packet includes the existing five planning files plus `run.json`, `baseline.json` and `inventory.md`. The `IMPLEMENT.md` assignment explicitly requires implementation and replay. Existing outputs are not overwritten.

`--files` names existing tracked UTF-8 source files and all local dependencies needed for replay. `--add-files NEW_PATH,NEW_PATH` reserves files that are absent at baseline but will be added by the implementation. An absent baseline file is recorded as absent, never replaced with a fake implementation. Scope is intentionally bounded to at most 80 files of 2 MB each. To expand it, start a new run at the same original baseline and carry over researched decisions. Keep the old evidence. Unsupported file deletion or binary/browser assets require a separately reviewed harness; this runner is not a whole-repository sandbox or replacement for browser QA.

`assess --run PATH/run.json` returns all blockers in work order and exactly one next action. Exit zero means the assignment is structurally ready to implement; it does not mean the evidence, design or release is approved. An incomplete assignment exits 1.

`prove --run PATH/run.json --out build/experience-foundry/UNIQUE` executes the configured adapter twice. It writes immutable proof artifacts even when outcomes remain unmet and returns 1 if no complete improvement is demonstrated. Adapter crashes, invalid JSON, omitted/duplicate cases and timeouts are execution errors and cannot count as baseline failures. An unchanged implementation cannot demonstrate a gain.

`assess --run PATH/run.json --proof PATH/proof.json` checks the recorded comparison against the current assignment, adapter and captured implementation hashes. Changes require a new proof. Baseline content is checked against actual Git blobs. Hashes detect drift, not intentional forgery; review adapter code and CI artifacts rather than accepting an editable JSON file as a signed attestation.

## Run schema

| Field | Required content |
| --- | --- |
| `owningRepository` | Verified `owner/repo`; do not infer from canonical host |
| `diagnosis.visitorTask` | What the visitor is trying to finish |
| `diagnosis.currentFriction` | Observed obstacle, not a suggested feature |
| `diagnosis.capabilities[]` | Existing useful engines, sources and interactions to reuse |
| `diagnosis.evidence[]` | Unique `id`, `kind`, `observation`; source or external reference below |
| `opportunities[]` | At least three unique `id`, `outcome`, `evidenceIds`, `reuse`, `effort`, `risk` |
| `selection` | `opportunityId` and reasoned `rationale` |
| `concepts[]` | At least two unique `id`, selected `opportunityId`, `firstScreen`, `interaction`, `completedAction`, `feasibility`, `tradeoff`, `evidenceIds` |
| `design` | Selected `conceptId`, `reviewer`, substantive `rationale` |
| `scenarios[]` | Unique `id`, `role` (`improvement` or `preservation`), `journey`, `input`, observable `expected` |
| `measurement` | `event`, `distinguishingProperty`, `completionSignal`, actual `baseline` or explicit reason it is unavailable |
| `verifier` | Reviewed local Node adapter path under `tests/`, `scripts/` or `experience-foundry/` |

Source evidence has `kind: source`, `file`, `startLine`, `endLine`, and must point into captured baseline text. External evidence has `kind: external`, HTTPS `url`, timezone-aware `checkedAt`, and `limitation`. Source observations and external checks are authored evidence: line existence or a timestamp does not independently verify their interpretation. Normal source rights, freshness and Experience OS requirements still apply.

The [Rocket diagnostic example](../examples/rocket-improvement.mjs) populates a complete assignment, including three opportunities and two credible concepts, without modifying product source:

```bash
node experience-foundry/examples/rocket-improvement.mjs
node scripts/experience-foundry.mjs assess --run experience-foundry/drafts/rocket-continuity-review/run.json
node scripts/experience-foundry.mjs prove --run experience-foundry/drafts/rocket-continuity-review/run.json
```

It pins the PR #1565 baseline and compares with the current source. Failure while the handoff remains broken is the correct diagnostic result. If a later product change repairs the outgoing link, this narrow replay may demonstrate that specific gain; it still cannot establish end-to-end regional continuity.

## Write a meaningful replay adapter

Use a standalone `.cjs` or `.mjs` adapter. The runner passes `--source-root PATH` for each isolated copy. Resolve implementation imports and local helpers through that root. Include dependencies and module-type configuration in the captured file list. Use identical dated fixtures and desired outcomes in both passes. Never branch on the baseline/candidate directory name, silently import the live working tree, fetch changing live data or adapt expectations to make the candidate pass.

Emit only this JSON shape to stdout:

```json
{"cases":[{"id":"selected-mission-link","passed":false,"observed":"Selected mission B; outgoing URL lacks launchId."}]}
```

Return every declared scenario once. A valid but unmet outcome is `passed:false` with the actual observation. A broken import, missing test dependency or broken harness must exit nonzero. Each pass has a 60-second limit and a 1 MB output limit. Run broader browser and full repository suites separately.

The same adapter bytes execute twice using Node without a shell, with `NODE_OPTIONS` cleared and the rest of the process environment inherited. **This is trusted local code with local process privileges, not a sandbox.** Review it as carefully as any repository test; the manifest cannot supply shell commands. Hashes and source-mutation checks are accidental-drift safeguards, not protection from malicious adapter code.

The proof reports GAIN, PRESERVED, REGRESSION or UNMET per scenario, with both observations. `BEHAVIOR_DEMONSTRATED` requires a changed scoped implementation, at least one declared improvement that fails before and passes after, every candidate case passing, and every preservation case passing in both versions. A previously broken preservation case must be correctly classified as an improvement, not relabeled just to get green.

Check outcomes, not labels. For linked tools, assert the selected entity in the **loaded destination response**, plus return and missing-ID behavior. An outgoing URL alone proves only the URL. For progressive decisions, show that newly supported evidence changes the next useful action and that conflicting or expired evidence reverses it appropriately. For visual improvements, use rendered interaction and inspected screenshots; model tests alone cannot establish visual quality.

## Completion and learning

Proof bundles retain `run.json`, `baseline.json`, `candidate.json`, the executed adapter, `proof.json` and readable `review.md`. These are local artifacts, not public pages. Retain appropriate artifacts in CI; avoid checking large snapshots into source control.

Keep the release record separate: browser/visual review, full owner CI, production deployment, public smoke and measured visitor outcomes each need their own evidence. Local replay leaves them explicitly unverified. A source-link click is not a completed trip plan. Analytics must distinguish the new interaction and its completion signal; low traffic is a limitation, not permission to fabricate uplift.

After a real pilot, record reusable lessons in Foundry. Keep domain logic in the owning product and shared standards here. Repairs and creative enhancements can both be valuable, but name what was accomplished honestly. A packet, a checklist or a renderer preview is never the end of an improvement assignment.
