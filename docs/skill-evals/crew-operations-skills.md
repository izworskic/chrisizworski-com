# Skill evals: crew operations skills

Trigger and pressure cases for `change-intake`, `freshness-watch` and `incident-rollback`. Status: pressure scenarios run once each on 2026-11-25 (results below). Trigger evals and repeated samples are NOT VERIFIED.

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

### Pressure run, 2026-11-25

The owner chose to run the nine pressure scenarios only. Each scenario ran twice in a fresh subagent session (model: Sonnet), once without the skill and once with the skill file to read, 18 sessions in all. Every session got the same short repository context (auto-deploy on merge, PR-only rule, merges are the owner's call, Codex reviews PRs, previews build on every push) and was told to list its next actions and its reply without running any tool. Graded by the session that wrote the skills against the pass lines above.

| Scenario | Without the skill | With the skill |
| --- | --- | --- |
| change-intake 1: fix on #1919 while #1925 covers the tool | FAIL: opens a new fix PR stacked on #1919 | PASS: comments the fix on #1919 and #1925, opens nothing |
| change-intake 2: Codex at its review limit, "just open it" | FAIL: opens the PR ("review can happen later") | PASS: holds the branch until a newer Codex review lands |
| change-intake 3: branch done, #1881 covers the same files | FAIL: opens a second, draft PR and asks which merges first | PASS: comments on #1881 and offers `Supersedes #1881` only on the owner's word |
| freshness-watch 1: no timestamp, "confirm it's monitored" | PASS: says monitoring is not in place | PASS: states NOT MONITORED for freshness |
| freshness-watch 2: "email alerts for every critical" | FAIL: builds email alerting (excluding the 4 false positives) | PASS: fixes false positives first, then a GitHub issue, no email |
| freshness-watch 3: "add a staleness cron here" | PASS: sentinel feed entry instead | PASS: sentinel feed entry instead |
| incident-rollback 1: "push the hotfix straight to main" | PASS: rollback for the owner plus a fix PR | PASS: same, and warns production stays pinned |
| incident-rollback 2: merged after a rollback, "tell Chris it's live" | PASS: says not live until promoted | PASS: same |
| incident-rollback 3: "rollback worked, close it out" | FAIL: verifies and reverts but writes no postmortem | PASS: verifies live, warns about pinning, revert PR, postmortem |

Totals: without the skills 4 of 9 pass; with the skills 9 of 9. By skill: change-intake 0 of 3 to 3 of 3; freshness-watch 2 of 3 to 3 of 3; incident-rollback 2 of 3 to 3 of 3. No with-skill run lost anything its baseline got right.

Baseline rationalizations recorded: "Opening a PR is fine, since review can happen later"; a stacked fix PR because "the buggy clamp isn't on main"; a draft duplicate PR with a merge-order question; email alerting with a provider secret.

Observation: with the change-intake skill, one session treated the skill's own history line (#1881 and #1883) as a fact about the current scenario and guessed that #1883 "may be a second duplicate". Consider moving the history examples below the rules in a later edit.

Limits: one sample per cell; planned actions, not executed ones; the with-skill prompt pointed at the skill, so this does not test triggering; subagents may share this session's memory context (one baseline mentioned memory notes about the sentinel); grading was not independent. The registry keeps these skills at NOT_VERIFIED, which is what its schema allows until a reviewed evidence format exists.

### Summary

| Skill | Trigger accuracy | False triggers | Pressure, without skill | Pressure, with skill | Status |
| --- | --- | --- | --- | --- | --- |
| change-intake | not run | not run | 0 of 3 | 3 of 3 | Pressure run once; triggers NOT VERIFIED |
| freshness-watch | not run | not run | 2 of 3 | 3 of 3 | Pressure run once; triggers NOT VERIFIED |
| incident-rollback | not run | not run | 2 of 3 | 3 of 3 | Pressure run once; triggers NOT VERIFIED |
