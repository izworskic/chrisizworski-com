---
name: remembered-state
description: "Make a tool remember the visitor without accounts: URL query state for filters, regions and dates, deep links and sharing, a saved spot in localStorage, and a quiet 'since your last visit' change note. Use when building or reviewing any tool with a region, place, date, filter, tab or map selection."
---

# remembered-state

Upstream: [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `web-design-guidelines` (Web Interface Guidelines, Navigation and State, Content Handling) at commit 5a37a6329fbad3666c3207392a6a7c0110e92efb (MIT). This is a project-specific adaptation for chrisizworski.com, not a vendored package. For a full interface review, the upstream rule list is at `skills/web-design-guidelines/references/command.md` in that repository.

The fastest second visit is one where the tool already knows what the visitor cared about. Do it without accounts, servers or tracking.

## Rules

1. **URL reflects state.** Region, place, date, filter, tab, expanded panel and map view live in query parameters (`?region=up&date=2026-12-14`). Read them on load, update with `history.replaceState` on change, and keep the canonical URL parameter-free per existing SEO rules.
2. **Deep link and share.** Every meaningful view can be copied as a link. Offer `navigator.share` where supported with a copy-link fallback. The shared view must render the same answer for the recipient.
3. **Remember one choice locally.** Store the visitor's chosen spot or region in `localStorage` under a namespaced key (`ci:<tool>:region`). Wrap every read and write in try/catch; storage can be blocked or empty. URL parameters win over stored values. Never store personal data, precise location without consent, or anything sent to a server.
4. **Ask after the answer.** Offer "Save this spot" only after the first answer is shown, and show what was saved with a one-tap way to clear it.
5. **Since your last visit.** When a saved spot exists, a single quiet line may compare now with the visitor's last visit using stored timestamp and last value ("Kp was 3 on Tuesday, now 6"). Only show real, sourced changes; skip the line when nothing changed.
6. **Location is opt-in.** Request geolocation only from a visitor tap on an explicit "Use my location" control, never on load, and always offer a manual place picker.
7. **Empty and error states.** Unknown or removed URL values fall back to a sensible default with a visible note, never a broken page.
8. **Back button works.** Do not trap history; restoring state must not create redirect loops or duplicate entries.

## Review output

List each stateful control, whether it is in the URL, whether it survives reload and share, what is stored locally and how to clear it. Mark unrun browser checks NOT VERIFIED.

## Boundaries

Read AGENTS.md first. Experience OS, Experience Investment, Foundry, Playwright Browser QA, canonical and Person identity, owning-repository tests and the repository Auto ads policy remain authoritative. Client-side only: no new Vercel Function, Middleware, database or paid API without written owner approval. No em dashes or en dashes in visitor copy. Run `npm run verify:all`, open a PR and do not auto-merge.
