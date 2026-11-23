# Return-visit skills (2026-11-23)

Three small, adapted agent skills that help Codex, Claude Code and Copilot build tools people come back to. They live identically in `.agents/skills/`, `.claude/skills/` and `.github/skills/`.

| Skill | Question it answers | Adapted from | License | Pinned commit |
|-------|--------------------|--------------|---------|---------------|
| `return-visit-loops` | Why would a visitor come back tomorrow, this weekend and next season? | [wondelai/skills](https://github.com/wondelai/skills) `hooked-ux` + `improve-retention` | MIT | c37678106e63ef1c5472d848fb3d8b8c5b33fafe |
| `live-conditions-trust` | Will the visitor believe the live data enough to check again? | [openai/plugins](https://github.com/openai/plugins) `build-web-data-visualization` / `dashboards-and-real-time-visualization` | MIT | 981b02c0c44058b595f3b4180002c3ae3c806d40 |
| `remembered-state` | Does the second visit start where the first left off, without accounts? | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `web-design-guidelines` | MIT | 5a37a6329fbad3666c3207392a6a7c0110e92efb |

## When agents use them

- `return-visit-loops` runs alongside Experience Investment for every new visitor tool, substantial redesign or new interactive mode, and whenever repeat visits, retention, saved places, reminders or alerts are discussed.
- `live-conditions-trust` applies to any tool showing live, forecast or periodically refreshed data.
- `remembered-state` applies to any tool with a region, place, date, filter, tab or map selection.

## What was adapted

Each skill is a short project-specific rewrite, not a vendored package. Upstream book links, author bios, SaaS onboarding examples, streaming and WebGL material were removed. House rules were added: computed or sourced data only, no account walls or email capture, no fake urgency or streaks, client-side persistence first, no new Vercel Function, Middleware, cron, Redis or paid API without written owner approval, no em or en dashes in visitor copy, and the repository Auto ads policy stays authoritative.

## Considered and not adopted

- `anthropics/skills` `frontend-design` (Apache-2.0): overlaps Experience OS and Experience Investment, which already govern visual direction.
- Generic PWA and push skills (for example `secondsky/claude-skills` `progressive-web-app`): push needs a server, VAPID keys and a cron, which adds Vercel cost. The Mackinac Bridge tool is the existing push precedent; extend it only with owner approval.
- `wondelai/skills` `grow-app` orchestrator: a multi-phase framework that writes planning documents, the sprawling shape this repository avoids.

Run `npm run verify:all` before release. These skills do not authorize merging; open a PR and do not auto-merge.
