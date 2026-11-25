# Skills expansion plan (PR #1976)

Owner direction, 2026-11-25: build every planned skill on one PR before anything merges, then hand Codex one prompt to fold the result into the Product Engineering OS. Build rules the owner approved:

1. One commit per skill: its three mirrors, its registry entry and its eval cases together, so a bad skill can be dropped without sinking the rest.
2. Pressure-test each skill right after building it and record the result before starting the next.
3. Keep this plan and `skills-expansion-progress.md` current after every skill, so a cold session or Codex can resume from these two files alone.
4. Shared files (`AGENTS.md`, `docs/PRODUCT_ENGINEERING_OS.md`) change only in one final commit. Until that commit lands, the registry test that matches the OS catalog to the skill folders fails on intermediate commits; only the PR head must be green.
5. No tool code, routes, data, Vercel config or dependencies. Skills are agent guidance only. No merge.

## Build order

| # | Skill | Type | Family | Replaces or links |
| --- | --- | --- | --- | --- |
| 1 | change-intake | New | Network operations | Done in wave 1 |
| 2 | freshness-watch | New | Network operations | Done in wave 1 |
| 3 | incident-rollback | New | Network operations | Done in wave 1 |
| 4 | photo-sourcing | New | Experience and research | Absorbs and removes hf-visual-evidence |
| 5 | search-demand | New | Search and discovery | Links web-quality-seo, tool network registry |
| 6 | opportunity-scout | New | Search and discovery | Feeds experience-investment; uses public-data-scout |
| 7 to 12 | web-quality-audit, -performance, -core-web-vitals, -accessibility, -seo, -best-practices | Rebuild | Web and browser quality | 12-line pointers become full methods adapted from addyosmani/web-quality-skills (MIT) |
| 13 | visual-data-storytelling | Rebuild | Scientific and analytical intelligence | Observable Plot as the default library, with recipes |
| 14 | custom-basemap | New | Experience and research | Protomaps PMTiles with MapLibre; links geospatial-intelligence |
| 15 | share-and-embed | New | Search and discovery | Static share images, embeds, stateful share links |
| 16 | tool-handoffs | New | Network operations | Builds on the tool network registry |
| 17 | answer-feedback | New | Visitor retention | Read through return-metrics |
| 18 | ml-justification | Fold | Hugging Face and machine learning | Replaces huggingface-best, transformers-js, hf-semantic-discovery, hf-forecast-benchmark |
| 19 | hf-hub-research | Fold | Hugging Face and machine learning | Replaces hf-cli, huggingface-datasets, huggingface-tool-builder |
| 20 | Shared files | Final commit | | AGENTS.md section, OS catalog rows and counts |

Library size after the plan: 42 on main, plus 10 new, minus 6 from the Hugging Face fold (8 become 2) = 46.

## Pressure test method

One scenario per skill that pushes an agent to break the skill's main rule. Each runs twice in a fresh subagent session (model: Sonnet): new skills against no skill, rebuilt or folded skills against the version on main. Sessions list their next actions without running tools. Results go in each skill's eval file and in the progress log. Trigger evals are not part of this plan.

## Settled owner decisions (confirmed 2026-11-25)

- `change-intake` caps: confirmed at 1 open PR per tool, 5 open agent PRs repo-wide, and a 3-hour Codex review-silence gate.
- `custom-basemap` static host: confirmed as GitHub Pages in a dedicated static map-assets repository (free, zero Vercel Edge or deploy bloat, no new vendor; verify HTTP 206 Range and CORS from `chrisizworski.com` on the pilot extract before migrating any map).
- `search-demand` Search Console read path: confirmed as the existing native read-only GSC service-account pipeline + private stored snapshot (`/api/growth-command-center?view=agent` for explicitly authorized private measurement sessions, or owner CSV/JSON export fallback; no BigQuery export; private figures never committed to the public repo).
- Integration into the Product Engineering OS completed in PR #1976 (`8a8298b4`) and reconciled to 46/46 dedicated suites and 20 overlap groups on 2026-11-25.
