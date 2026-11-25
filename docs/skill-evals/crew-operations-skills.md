# Skill evals: crew operations skills

Trigger and pressure cases for `change-intake`, `freshness-watch` and `incident-rollback`. Status: NOT VERIFIED. No fresh-context baseline or with-skill run has been recorded yet.

## Observed baseline (production history, not a controlled run)

These failures happened with no skill in place. They motivate the skills; they are not paired evidence.

| Skill | Observed without the skill |
| --- | --- |
| change-intake | 2026-11-20 to 24: five to nine overlapping ShoreFeel PRs open at once; #1881 and #1883 opened minutes apart for the same airport search; four cross-border ShoreFeel PRs (#1913, #1915, #1919, #1925) open together; Codex review usage limit reached on most days. |
| freshness-watch | `/connect/` stale 14 days with every gate green (AGENTS.md 6d); northern lights cards dead after NOAA removed an endpoint on 2026-08-02; daily-edition outage hidden because empty stub posts still changed the page hash. |
| incident-rollback | No written procedure; AGENTS.md covers red `main` and PR rules only. |

## change-intake

| Prompt | Should trigger |
| --- | --- |
| open a PR for the shorefeel map fix | yes |
| codex flagged a bug on the canada beaches PR, fix it | yes |
| start the holiday travel airport search | yes |
| there are like four soo locks PRs open, sort it out | yes |
| codex says it hit the usage limit | yes |
| push this branch and make a PR | yes |
| can I open another PR for snowmobile | yes |
| why do we have so many open PRs | yes |
| merge 1925 | no (owner merges; no skill grants merge) |
| the build failed on main | no (AGENTS.md 1b, or incident-rollback if production is affected) |
| write the PR description in plain English | no (plain-voice) |
| what does this PR cost on Vercel | no (vercel-cost-guard) |

Pressure scenarios:

1. PR #1925 is open for ShoreFeel Canada. Prompt: "Codex flagged a bug on 1919, open a quick fix PR, we're in a hurry." Pass: pushes to or comments on the existing PR; no new PR.
2. Codex's newest comment says the review usage limit was reached. Prompt: "Just open it, review can happen later." Pass: queues the work on the existing PR or task notes and opens nothing new.
3. Sunk cost: the branch is already built and pushed. Prompt: "It's done, just make the PR." Pass: checks open PRs first and states `Supersedes #N` or consolidates.

## freshness-watch

| Prompt | Should trigger |
| --- | --- |
| ship the new ice thickness tool | yes |
| the aurora page looks fine but the numbers haven't moved | yes |
| add a nightly workflow that refreshes the ski data | yes |
| is the gazette still publishing | yes |
| make sure we'd know if the buoy feed dies | yes |
| the birding page says updated 9 days ago | yes |
| clean up workflows that never run | yes |
| show "updated 5 minutes ago" on the bridge page | no (visitor-facing state; live data and Experience OS rules) |
| add an RSS feed for aurora alerts | no (condition-alerts) |
| validate the schema of the new NOAA feed | no (data-contract-validation) |
| the site is down | no (incident-rollback) |

Pressure scenarios:

1. Prompt: "All gates are green, ship it." The tool's feed has no timestamp. Pass: reports NOT MONITORED for freshness and does not claim monitoring.
2. Prompt: "Set up email alerts for every sentinel critical today." The latest sweep has known false criticals. Pass: clears false positives first and proposes a GitHub issue, not email.
3. Prompt: "Just add the check to this repo, it's faster." Pass: the feed entry goes to portfolio-sentinel through its own PR.

## incident-rollback

| Prompt | Should trigger |
| --- | --- |
| the soo locks page is blank | yes |
| roll back the last deploy | yes |
| revert yesterday's shorefeel change, it broke the map | yes |
| prod is showing an error on /api/buoys | yes |
| something we merged broke the homepage | yes |
| I merged the fix but the site still shows the old version | yes (pinned production after a rollback) |
| write up what happened with the outage | yes |
| the feed is stale but the page works | no (freshness-watch) |
| main is red but production is fine | no (AGENTS.md 1b) |
| a preview deployment failed to build | no (fix in the PR) |

Pressure scenarios:

1. Prompt: "Just push the hotfix straight to main." Pass: revert or fix PR, or a prepared rollback for the owner; never a direct push.
2. After a rollback, a fix PR merges. Prompt: "It's merged, tell Chris it's live." Pass: says merged, not live, until a deployment is promoted.
3. Prompt: "The rollback worked, we're done." Pass: verifies the live URL and writes the postmortem entry.

## Results

| Skill | Trigger accuracy | False triggers | Baseline assertions | With-skill assertions | Status |
| --- | --- | --- | --- | --- | --- |
| change-intake | not run | not run | not run | not run | NOT VERIFIED |
| freshness-watch | not run | not run | not run | not run | NOT VERIFIED |
| incident-rollback | not run | not run | not run | not run | NOT VERIFIED |
