---
name: skill-eval
description: "Test and improve this repository's agent skills: trigger evals for the description, with-skill versus no-skill runs, and pressure scenarios that check agents follow the rules. Use when creating a skill, editing a skill, when a skill seems ignored or misapplied, or when asked to audit the skill library."
---

# Skill eval: prove a skill triggers and changes behavior

`tests/skill-lint.test.js` proves a skill is well formed. It cannot prove an agent loads the skill at the right time or does anything different because of it. This skill does that. Rule borrowed from obra/superpowers: no new skill and no skill edit without a failing test first.

## Two questions, two tests

| Question | Test | Pass |
| --- | --- | --- |
| Does the description make agents load it at the right time? | Trigger eval: about 20 realistic prompts, 8 to 10 that should trigger and 8 to 10 near misses that should not | At least 90 percent correct, zero false triggers on owner-only skills (Penpot, REA, Stitch) |
| Does the body change what the agent does? | Paired runs: the same task with the skill and without it (the baseline) | The with-skill run meets assertions the baseline misses, and nothing the baseline did right regresses |

## Step 1: write the cases before touching the skill

- Trigger prompts sound like the owner: short, voice-typed, often naming the tool, not the skill ("why does nobody come back to the aurora page", "add a notify me to the bridge tool"). Near misses share words but need a different skill ("fix the aurora title length" is `web-quality-seo`, not `return-visit-design`).
- Task cases are real repository jobs with checkable assertions: a file that must or must not change, a rule that must be stated ("no subscriber storage"), a number that must be labeled NOT MEASURED.
- For rule-enforcing skills add pressure scenarios: time pressure, an owner message that seems to permit a shortcut, sunk cost ("the feature is already built, just ship it"). Record the baseline's exact rationalizations.
- Keep the cases in `docs/skill-evals/<skill>.md` (Markdown so commits stay docs-only and skip the Vercel build).

## Step 2: run the baseline, then the skill

- Fresh context for every sample. Use subagents only when the owner has authorized them for this task; otherwise run the cases yourself in a clean session and say so.
- Run the baseline first and write down what fails. If the baseline already passes, the skill or the edit is not needed: stop.
- Run with the skill. Grade against the assertions, not against impressions.

## Step 3: improve and repeat

- Description misses a trigger: add the owner's own words for the job, not more adjectives. Keep "Use when ..." in the first two sentences. Stay under 1,024 characters.
- Description triggers too often: name what it is not for, or point to the right sibling skill.
- Body ignored under pressure: add an explicit counter to the exact rationalization the run produced, then rerun the same scenario.
- Delete text that no case needed. Shorter skills are read more completely.

## Output

A table per skill: trigger accuracy, false triggers, task assertions passed with and without the skill, rationalizations found, and the edit made. Unrun cases are NOT VERIFIED. Skill edits keep all three mirrors identical, pass `tests/skill-lint.test.js`, follow Experience OS, Experience Investment and Foundry where they govern the task, and leave Auto ads untouched. Do not auto-merge.

## Sources

Adapted from [anthropics/skills](https://github.com/anthropics/skills) `skill-creator` (Apache-2.0: paired runs, trigger eval sets, description optimization) and [obra/superpowers](https://github.com/obra/superpowers) `writing-skills` (MIT: baseline first, pressure scenarios, closing loopholes). Reference only; no script is vendored.
