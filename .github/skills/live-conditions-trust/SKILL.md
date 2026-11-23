---
name: live-conditions-trust
description: "Make a live or near-live conditions tool trustworthy enough to check again: update cadence, last-updated stamps, stale, partial and offline states, scan-first layout and graceful feed failure. Use when building or reviewing any tool that shows live, forecast or periodically refreshed data."
---

# live-conditions-trust

Upstream: [openai/plugins](https://github.com/openai/plugins) `build-web-data-visualization/skills/dashboards-and-real-time-visualization` at commit 981b02c0c44058b595f3b4180002c3ae3c806d40 (plugin license MIT). This is a project-specific adaptation for chrisizworski.com, not a vendored package. Streaming, WebGL and enterprise monitoring material was removed.

A visitor returns to a conditions tool only if they believe it. Trust comes from showing exactly how fresh each value is and behaving honestly when a feed fails.

## Before building, answer

1. What is the update model for each feed (periodic poll, daily model run, event bursts, full snapshot)? What is the source's own cadence?
2. What decision does the visitor make, and what must they understand at first scan before touching any control?
3. What happens on a phone with a weak signal, a backgrounded tab, or a feed that returns 404 (NOAA has removed endpoints before)?

## Rules

- Current state first, then supporting context, then controls. The most important value keeps a stable position and encoding.
- Show "Updated" time and the source next to each value, in the visitor's local time zone, plus the cadence ("NOAA updates every 15 minutes").
- Distinguish live, forecast, modeled, historical normal and stale data visually and in words.
- Keep the last known good value visible during reconnects and failures, labeled stale with its age. Never show a blank, a spinner forever, or a silent zero.
- Each feed fails on its own (`Promise.allSettled` or equivalent); one dead source must not break the page.
- Poll no faster than the source updates. Pause polling when `document.visibilityState` is hidden and refresh once on return.
- Static HTML must carry the recurring facts and a useful answer with JavaScript off, so search engines and slow phones get the answer.
- Prefer cached or ISR responses over per-request rendering so crawlers do not block on government APIs.
- Alerts, vibration or push only for visitor-requested, meaningful threshold changes, always with an in-page accessible equivalent.
- Keep chart keys with their charts. Use small sparklines for trend context with labeled values.
- On mobile, controls must not push the live state below the fold; return focus to the affected view after a filter change.

## Output for a review

Describe the update model, each failure mode and its visible state, what the visitor sees first on mobile, and how the page degrades. Report unrun browser or network checks as NOT VERIFIED.

## Boundaries

Read AGENTS.md first. Experience OS, Experience Investment, Foundry, Playwright Browser QA, owning-repository tests, source verification and the repository Auto ads policy remain authoritative. Computed or sourced data only; never generate placeholder conditions. No new Vercel Function, cron, Redis or paid API without written owner approval. No em dashes or en dashes in visitor copy. Run `npm run verify:all`, open a PR and do not auto-merge.
