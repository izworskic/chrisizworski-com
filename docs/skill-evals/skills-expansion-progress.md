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
