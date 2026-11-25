---
name: vercel-cost-guard
description: "Check what a change adds to Vercel builds, function invocations and usage before it ships, and audit existing usage from real metrics. Use when a PR adds an API route, cron, cache rule, rewrite, middleware, image work or scheduled commits, or when asked why Vercel usage or cost went up."
---

# Vercel cost guard: say plainly what a change adds

The owner's standing rule: keep builds and Vercel resources minimal and state what every change adds. This skill turns that into a checklist for each PR and a metrics-first audit when usage rises.

## Per-PR checklist (put the answers in the PR body)

| Question | How to answer |
| --- | --- |
| Does it add or change a function? | List new or changed files under `api/` and `middleware.ts`. Each one is a function. |
| Is every new route cached at the edge? | `Cache-Control` with `s-maxage` and `stale-while-revalidate` on anything public and repeatable. Uncached public JSON is a defect. |
| Does it schedule anything that commits to `main`? | A timer that commits is a build per run. Move it to a data branch excluded by `scripts/ignore-docs-build.mjs`, a cached route, or off Vercel. |
| Does it add a build step? | New work in `build:site` runs on every deploy. Prefer generating once and committing the output, if it rarely changes. |
| Will it skip builds it should skip? | Commits touching only `docs/*.md`, `README.md`, `AGENTS.md`, `CLAUDE.md`, copilot instructions or skill Markdown skip the build. Check the PR's changed files with `documentationOnly()`. |
| Does it call Vercel features that bill separately? | Image optimization, KV/Redis, Blob, Edge Config writes, cron jobs in `vercel.json`. Name each one. |

State the result as one line: "Adds 0 functions, 0 builds per day, 0 billed features", or the real numbers.

## Usage audit (when costs rise)

Follow the order from vercel-labs `vercel-optimize`: metrics first, code second.

1. Pull production signals before reading code: the top routes by invocations and duration, cache hit ratio, builds per day and their triggers. Use the Vercel MCP tools or `vercel metrics` and `vercel usage` with the owner's session; if access is missing, report NOT VERIFIED and ask once.
2. Only investigate routes the numbers point to. Read the route and its imports, nothing repo-wide.
3. For each finding give the evidence, the fix, and an order-of-magnitude effect (never an invented dollar figure).
4. Check builds separately: count deploys per day by trigger (pushes to `main`, data commits, bots). Scheduled data commits are the usual cause on this repository.

That skill targets Next.js, SvelteKit and Nuxt; this hub is mostly static with Node and edge functions, so use its method, not its framework-specific checks.

## Never

- Remove a route, cache rule or cron that a tool depends on without the owner's approval.
- Trade correctness for cost: a cached safety reading still shows its observation time.
- Change Auto ads, analytics or Experience OS behavior as a cost fix.

Run the owning repository's full gate; unrun checks are NOT VERIFIED. Do not auto-merge.

## Sources

Method adapted from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `vercel-optimize` (MIT). Reference only.
