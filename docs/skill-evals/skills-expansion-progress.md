# Skills expansion progress log (PR #1976)

Read `skills-expansion-plan.md` first. Update this log in the same commit as each skill. Status: Done means the skill, its mirrors, registry entry and eval file are committed and its pressure test is recorded.

| # | Skill | Status | Pressure test (without, with) | Notes |
| --- | --- | --- | --- | --- |
| 1 | change-intake | Done | 0 of 3, 3 of 3 | Wave 1 commit f16e91e |
| 2 | freshness-watch | Done | 2 of 3, 3 of 3 | Wave 1 commit f16e91e |
| 3 | incident-rollback | Done | 2 of 3, 3 of 3 | Wave 1 commit f16e91e |
| 4 | photo-sourcing | Done | Partial, Pass | Folds hf-visual-evidence. Commit fae5153 |
| 5 | search-demand | Done | Partial, Pass | Commit eb32122 |
| 6 | opportunity-scout | Done | Partial, Pass | Open: its scoring table should defer to the registry bestFitScoring. Commit 1ac8ccb |
| 7 | web-quality-audit | Done | Fail, Pass | Rebuilt. Commit 44fecaa |
| 8 | web-quality-performance | Done | Pass, Pass | Rebuilt. Commit 95be9d9 |
| 9 | web-quality-core-web-vitals | Done | Partial, Pass | Rebuilt. Commit 547396f |
| 10 | web-quality-accessibility | Done | Pass, Pass | Rebuilt. Commit 87fedda |
| 11 | web-quality-seo | Done | Partial, Pass | Rebuilt. Commit b8e83bf |
| 12 | web-quality-best-practices | Done | Pass, Pass | Rebuilt. Commit fe56d7a |
| 13 | visual-data-storytelling | Done | Pass, Pass | Rebuilt. Commit 86e6fe1 |
| 14 | custom-basemap | Done | Partial, Pass | Commit 940370e |
| 15 | share-and-embed | Done | Fail, Pass | Commit 096334c |
| 16 | tool-handoffs | Done | Partial, Pass | Roll out one tool per PR. Commit a34515e |
| 17 | answer-feedback | Done | Fail, Pass | Commit 10ec7ce |
| 18 | ml-justification | Done | Pass, Pass | Folds huggingface-best, transformers-js, hf-semantic-discovery, hf-forecast-benchmark. Commit de666b7 |
| 19 | hf-hub-research | Done | Pass, Pass | Folds hf-cli, huggingface-datasets, huggingface-tool-builder. Commit "Fold three Hugging Face skills into hf-hub-research" |
| 20 | Shared files commit | Done | | AGENTS.md, OS manual section 5 (46 skills), capability library, HF adoption note |

## Next action

All twenty items are built and committed on PR #1976. Nothing is merged. The owner's next step is the single Codex prompt that merges these skills into the Product Engineering OS; settle the open notes below and the open questions in `skills-expansion-plan.md` in that pass.

## Open notes for the Codex merge

- opportunity-scout has its own scoring table; the registry already has a 100-point bestFitScoring. Pick one when merging into the OS.
- change-intake: one pressure agent misread the history line; keep the history wording plain.
- tool-handoffs: roll the handoffs out one tool per PR, not all at once.

## Integration decisions, 2026-11-25

- Base check: main was `6c894fa18690f7c0f80227a4708bd4e72cb4156d` and the PR was 20 commits ahead, zero behind. No rebase or other PR merge was needed at inspection; preserve all main work and recheck before release.
- 3a: `benchmarks/tool-network-registry.json` `bestFitScoring` is the only 100-point scoring standard. Removed the competing opportunity-scout scoring table; feasibility, source rights, ownership and cost remain eligibility checks, not extra points.
- 3b: #1871 is still open. If #1976 lands first, #1871 must add registry entries and catalog routing for return-visit-loops, live-conditions-trust and remembered-state, resolve overlaps, and pass mirror and registry checks. Do not merge #1871 in this task.
- 3c: change-intake now opens with the current-state instruction. Historical motivation is separate, plainly labeled, and not evidence of today's open PRs.
- 3d: tool-handoffs explicitly rolls out one tool per PR, never the entire network at once.
- Refined the OS catalog routing boundaries and synchronized registry skill blob hashes without changing the NOT_VERIFIED behavioral status. Trigger evals remain unrun by owner direction; the original pressure tests were single planned-action samples and were not rerun on these edits.
- Owner decisions remain open: keep the intake defaults (1 per tool, 5 agent PRs, 3-hour review gate); choose a static basemap host (Vercel static, GitHub Pages, Cloudflare R2) with no new Vercel function; choose read-only Search Console API or BigQuery export and supply credentials separately. No runtime, routes, crons, config, dependency or paid-service change.
- Release: require the full verify:all and skill-lint checks on the new head before squash merge. No skill dropped during integration.
