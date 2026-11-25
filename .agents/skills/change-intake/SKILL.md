---
name: change-intake
description: "Check open pull requests before starting or opening any change, so one tool never has two open PRs and agents stop opening PRs while Codex review is unavailable. Use when about to open a PR, push a new branch or start work on a tool, when Codex reports its review usage limit, or when several open PRs touch the same tool."
---

# Change intake: one open change per tool

Run this skill before any other work on a change. Check the current open PRs and review status. Every push to a PR also builds a Vercel preview unless the change is Markdown only.

## 1. Look before you start

1. Name the tool: its folder or route, and its id in `benchmarks/tool-network-registry.json` if it has one.
2. List open PRs and the files each one changes. Agent sessions often cannot use GitHub GraphQL; the REST form works:

   ```
   gh api "repos/izworskic/chrisizworski-com/pulls?state=open&per_page=100" -q '.[] | [.number, .head.ref, .title] | @tsv'
   gh api "repos/izworskic/chrisizworski-com/pulls/NUMBER/files?per_page=100" -q '.[].filename'
   ```

3. An open PR overlaps yours when it changes a file in the same tool folder, the same engine, data file or test, or names the same tool in its title.

## 2. Decide

| Situation | Action |
| --- | --- |
| An open PR already covers this tool | Push to that branch if your session owns it; otherwise comment the proposal on it. Do not open a second PR. |
| Your change replaces an open PR | Write `Supersedes #N` in the new PR body and ask in the same body for #N to be closed. Never leave both open without that line. |
| The repository is at the open agent PR cap | Do not open another. Extend, consolidate or report instead. |
| Codex review is unavailable | Open nothing new. See section 3. |
| `main` is red | Fix `main` first in its own PR (AGENTS.md 1b). Exempt from the caps. |
| Production is broken | Follow incident-rollback. Its fix or revert PR is exempt from the caps. |

## 3. Review gate

Codex review is unavailable when either is true:

- The newest comment from `chatgpt-codex-connector[bot]` on any open PR says the account reached its Codex usage limits for code reviews.
- No Codex review summary (the `codex-pull-request-review-summary` comment) has appeared on any PR in the last 3 hours while PRs were waiting.

While unavailable, put new work as a comment on the existing PR for that tool, or in the task notes, and open nothing new. Resume after a newer Codex review lands.

## 4. Shape of a change

- One tool, one purpose, one PR. Related fixes for the same tool go into that PR.
- Push once per review round. Each push builds a preview and can reset review.
- Research-only work stays Markdown under `docs/` so it skips the Vercel build. Scripts, data and tests go in a separate PR only when implementation was requested.

## 5. Limits

Owner-confirmed defaults (2026-11-25):

- Open PRs per tool: 1.
- Open agent PRs across the repository: 5.
- Review gate window: 3 hours.

## Output

The first line of every PR body: `Intake: checked N open PRs; overlaps: none`, or the overlapping numbers and what you did about each.

## Boundaries

This skill never closes, merges or force-pushes someone else's PR; it asks. AGENTS.md, Experience OS, owning-repository rules and the full gate still apply to the change itself. Do not auto-merge.

## Historical context

In November 2026, overlapping PRs and review usage limits motivated this rule. That history is not evidence about which PRs are open now.

## Sources

GitHub Agentic Workflows (github/gh-aw, MIT) rate-limiting controls: concurrency groups, per-user run caps and a daily AI credit ceiling. Reference only: none of them caps open PRs, and they govern only agents run as gh-aw workflows.
