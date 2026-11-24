---
name: return-visit-design
description: "Return contract for chrisizworski.com tools, adapted from the Hook Model. Use when proposing a new tool, reworking an existing one, or when asked why visitors do not come back. Produces a one-page return contract that names the trigger, the changed answer, what the visitor saves and how the return is measured; it writes no code."
---

# Return visit design: give people a true reason to come back

A conditions tool earns a return visit only when coming back gets the visitor a better answer than they had. This skill makes that reason explicit before anyone builds alerts, saved spots or calendar feeds. It is a planning skill: it produces a return contract and hands implementation to the skills named below.

## When to run it

- Automatically inside `experience-investment` for a new tool or a substantial rework, as one more lens.
- When the owner asks why a tool gets one-time visits, or asks for retention ideas.
- Skip it for copy fixes, bug fixes and pages that are reference material with no changing state.

## Read first

1. The owning repository's `AGENTS.md` and the tool's tests.
2. The tool's live page on phone width: what is the first answer, what changes over time, what the visitor would want to know next week.
3. `return-metrics` output for the tool, if any. No baseline means the contract must say NOT MEASURED, not guess.

## Why visitors of this site come back

These tools answer "is it happening now?" questions: aurora, Soo Locks traffic, Mackinac wind, ice, fall color, launches, snow. The answer changes on its own, so the honest pull back is one of three things:

| Reason | Hook Model phase | What it looks like here | Implemented by |
| --- | --- | --- | --- |
| The answer changed and they care | External trigger | Their region's aurora outlook changes; bridge wind restriction lifts; a calendar event moves | `condition-alerts` (calendar and RSS only) |
| They saved something | Investment | A saved viewing town, lake, trail system or crossing direction | `my-spots-offline` |
| A good window is coming | Anticipation, then trigger | Next dark, moon-down hours; projected peak week; Bridge Walk date | `computed-windows`, then `condition-alerts` for the calendar |

The reward is the changed, computed answer itself. Conditions already vary, so never manufacture fake variety, streaks, badges or "you might have missed" teasers.

## Fit check: the habit zone

Most tools here are episodic: a trip, a season, a storm. Do not design for a daily habit the job does not have. The target is "the visitor returns on the day it matters", and the measure is the returning share on trigger days, not daily actives. If a tool has no state that changes in a way a visitor would act on, write "no return contract" and stop. That is a valid outcome.

## The return contract (the deliverable)

Fill every field. A field you cannot fill from evidence is NOT MEASURED or OPEN, never invented.

```
Tool and URL:
Visitor and decision: who, and what they decide with this tool
State that changes: the source field, its feed, how often it updates
Trigger worth an alert: computed threshold, the source it comes from, cooldown
What the visitor saves: the smallest thing that personalizes the answer
Upcoming window: a computed or published date, or none
Changed answer on return: what they see that they did not see last time
One action from the alert: the URL or anchor the trigger opens
Channels: calendar / RSS, and why each (no push: owner decision 2026-11-24)
Cost: Vercel functions and builds added (target: none)
Baseline: returning share now, from return-metrics, or NOT MEASURED
Success test: the number that must move, the window, the minimum sample
Ethics check: result of the four questions below
```

## Ethics check

Every contract answers these four questions. Any "no" stops the feature.

1. Does the trigger come from a computed threshold on a named source, with the observation time shown?
2. Would the owner want this alert for his own trips? (The Hook Model calls this the facilitator test.)
3. Can the visitor stop it in one step, and does nothing depend on an account, email or tracking ID?
4. For safety topics (ice, wind, surf), does the message say what the model computed and tell people to confirm locally, never "safe"?

Never place retention prompts inside ad slots, never cover content with them, and preserve the Auto ads exclusions and placements the page already has.

## Handoff

End with the contract, the two closest existing tools it was compared against, and which of `condition-alerts`, `my-spots-offline`, `computed-windows` and `return-metrics` should run next. Implementation follows Experience OS, Experience Investment, Foundry and the owning repository's gates. Unrun checks are NOT VERIFIED. Do not auto-merge.

## Sources

Adapted, not copied, from the `hooked-ux` and `improve-retention` skills in [wondelai/skills](https://github.com/wondelai/skills) (MIT), which summarize Nir Eyal's Hook Model and BJ Fogg's behavior model. Reference only; nothing is vendored.
