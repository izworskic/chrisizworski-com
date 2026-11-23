---
name: return-visit-loops
description: "Design and review why a visitor comes back to a tool tomorrow, this weekend and next season. Use for every new visitor tool, substantial redesign, or when asked about repeat visits, retention, habit, saved places, reminders or alerts. Applies the Hook Model and B=MAP to honest live-conditions tools."
---

# return-visit-loops

Upstream: [wondelai/skills](https://github.com/wondelai/skills) `hooked-ux` and `improve-retention` at commit c37678106e63ef1c5472d848fb3d8b8c5b33fafe (MIT, Copyright 2025 Wondel.ai sp. z o.o.). This is a project-specific adaptation for chrisizworski.com tools, not a vendored package. Book links, author bios and generic SaaS examples were removed.

## When to use

Run this alongside Experience Investment for every new visitor tool, substantial redesign or new interactive mode. Run it alone when the owner asks why visitors do not come back, or asks for saved places, reminders, alerts or a "check back" feature. Skip it for tiny repairs.

## The loop for a conditions tool

A tool earns repeat visits when a real-world change keeps asking the visitor's question again. Write the loop down before designing.

1. **Trigger.** Name the internal trigger (the question in the visitor's head, for example "is it worth driving out tonight?", "is the ice safe yet?", "has color peaked up north?") and the real-world event that fires it (Kp spike, wind closure, cold snap, peak week, ice-on, a dated annual event). If neither repeats, the tool is a one-visit reference page: say so and do not bolt on engagement features.
2. **Action.** The answer must be readable in one glance above the fold on a phone, with no sign-up, modal or settings step before it. Remembered choices (see remembered-state) remove the repeat setup.
3. **Variable reward.** The reward is the honest, changing answer: tonight differs from last night. Never fake variability, invent urgency or reshuffle content to look fresh. Every value shown is computed or sourced (see live-conditions-trust).
4. **Investment.** After the answer, offer one small, optional investment that makes the next visit faster: save my spot or region, pin a tool, bookmark a shareable URL, add a dated event to a calendar. Each investment must load the next trigger.

## External triggers, in order of preference

Use only triggers the visitor explicitly asks for.

1. Bookmarkable, shareable URL state and Add to Home Screen via the existing site manifest (no runtime cost).
2. A downloadable `.ics` file for events whose date is computable (Bridge Walk, peak windows, season openers). Generate client-side or at build time.
3. RSS for a recurring written report that already exists.
4. Web push only where infrastructure already exists (the Mackinac Bridge tool is the precedent) or the owner approves the added Vercel Function, cron and maintenance cost in writing. Push fires only on a meaningful, threshold-crossing state change the visitor chose.

No email capture, account wall, countdown pressure, fake streaks or "don't miss out" copy.

## Ethics gate (Manipulation Matrix)

The tool must materially improve the visitor's decision and be something the owner would use himself. If a mechanic exists only to inflate sessions or ad impressions without helping the decision, drop it and cap the score at 3. Never fire triggers on fear the data does not support, and never hide the answer to force scrolling past ads.

## Score (goal 10/10)

Rate each row 2 (yes), 1 (partial) or 0 (no). Score = round(total / 10 x 10).

| Row | Question |
|-----|----------|
| 1 | Is the internal trigger named and does a real-world event repeat it? |
| 2 | Is the answer visible in one glance on mobile with zero setup? |
| 3 | Does the answer genuinely change between visits, sourced and timestamped? |
| 4 | Is there one optional investment, offered after the answer, that speeds the next visit? |
| 5 | Is there a visitor-chosen path back (URL, home screen, calendar, existing alert) with no new paid infrastructure? |

State the score and name each row that blocks 10/10 with a specific fix.

## Situational next step

End each visit with one context-aware link to the tool a visitor in this situation needs next (aurora tonight to the Soo Locks freighter schedule, fall color this weekend to the drive conditions), following existing internal-linking rules. This raises pages per session honestly; never add a mega-menu or unrelated cross-links.

## Measure

Prefer measured repeat-visit share or returning users from Vercel Web Analytics or GA4 when available. If the data is not available in the session, mark the claim NOT VERIFIED and do not promise retention or revenue gains.

## Boundaries

Read AGENTS.md first. Experience OS, Experience Investment, Foundry, owning-repository tests, canonical and Person identity, source rules and the repository Auto ads policy remain authoritative. No new Vercel Function, Middleware, cron, database, Redis or paid API without written owner approval. No em dashes or en dashes in visitor copy. Run `npm run verify:all`, open a PR and do not auto-merge.
