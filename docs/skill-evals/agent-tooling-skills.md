# Skill evals: agent tooling skills

Trigger cases for `skill-eval`, `plain-voice` and `vercel-cost-guard`. Status: NOT VERIFIED until runs are recorded below.

## skill-eval

| Prompt | Should trigger |
| --- | --- |
| write a new skill for the beach report data | yes |
| the seo skill never loads, fix it | yes |
| test whether agents actually follow the alerts skill | yes |
| audit all our skills | yes |
| I edited experience-investment, make sure it still works | yes |
| why do agents ignore the playwright skill | yes |
| tighten the public-data-scout description | yes |
| add pressure tests for the no-auto-merge rule | yes |
| run the test suite | no (npm test) |
| the skill-lint test failed on a mirror | no (fix the mirror; lint already explains) |
| install the Hugging Face CLI | no (hf-hub-research) |
| build the aurora alert | no (condition-alerts) |

## plain-voice

| Prompt | Should trigger |
| --- | --- |
| this answer block sounds like AI, fix it | yes |
| clean up the copy on the snowmobile page | yes |
| make the fall color intro sound like me | yes |
| rewrite the PR description in plain English | yes |
| remove the dashes and fluff from the soo locks FAQ | yes |
| proofread the new beach page | yes |
| the alert message reads robotic | yes |
| tighten the rocket launch summary | yes |
| write a Freighter View Farms post | no (fvf-writer) |
| shorten the aurora title to 60 characters | no (web-quality-seo) |
| change the Kp threshold for Traverse City | no (data change, not copy) |
| translate the page to Spanish | no |

## vercel-cost-guard

| Prompt | Should trigger |
| --- | --- |
| why did our Vercel bill go up | yes |
| does this PR add any functions | yes |
| too many builds today, what's triggering them | yes |
| add a cron that refreshes the ice data every hour | yes |
| is the new api route cached | yes |
| move the data commits off main | yes |
| check what this change costs on Vercel before we merge | yes |
| we're adding middleware for redirects | yes |
| the page loads slowly on mobile | no (web-quality-performance) |
| deploy the preview | no |
| set up a custom domain | no |
| measure returning visitors | no (return-metrics) |

## Runs

| Date | Agent | Skill | Trigger accuracy | False triggers | Notes |
| --- | --- | --- | --- | --- | --- |
