# Retention skills: reasons to come back

Added 2026-11-24. Five single-purpose skills that give visitors a true reason to return to a conditions tool. Each `SKILL.md` is identical in `.agents/skills`, `.claude/skills` and `.github/skills` and is checked by `tests/skill-lint.test.js`.

| Skill | Job | Built on (reference, not vendored) | Vercel cost |
| --- | --- | --- | --- |
| `return-visit-design` | Write the return contract: trigger, changed answer, what is saved, how it is measured | [wondelai/skills](https://github.com/wondelai/skills) hooked-ux and improve-retention (MIT) | None |
| `condition-alerts` | Subscribed `.ics` calendars and RSS/Atom feeds when an answer changes | [ics](https://github.com/adamgibbons/ics) (ISC), [feed](https://github.com/jpmonette/feed) (MIT) | None: cached routes or the existing build |
| `my-spots-offline` | Saved places, since-your-last-visit line, offline last-known reading | [idb-keyval](https://github.com/jakearchibald/idb-keyval) (Apache-2.0), [Workbox](https://github.com/GoogleChrome/workbox) (MIT) | None: browser only |
| `computed-windows` | Dark hours, moon, twilight, golden hour as dated windows | [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT), [suncalc](https://github.com/mourner/suncalc) (BSD-2-Clause) | None: browser or build |
| `return-metrics` | Returning-visitor share per tool, before and after | Existing `lib/growth/auto-ingest.mjs`; optional [google-analytics-mcp](https://github.com/googleanalytics/google-analytics-mcp) (Apache-2.0, read-only) | None |

## Order

1. `return-metrics` baseline for the pilot tool (needs the owner's GA4 read-only credential; otherwise NOT MEASURED).
2. `return-visit-design` contract.
3. `condition-alerts`, `my-spots-offline`, `computed-windows` as the contract calls for them.
4. `return-metrics` again after one full trigger cycle.

## Owner decisions

- No push notifications of any kind (decided 2026-11-24, permanent).
- GA4: a Google service-account credential is still missing on the hub project (the daily analytics job reports `missing GSC credentials`), so `return-metrics` reports NOT MEASURED until one exists.

Contracts written so far: [`docs/return-contracts/northern-lights-michigan.md`](return-contracts/northern-lights-michigan.md).

No package is installed, no route is added and no page changes in this PR. Implementations go through Experience OS, Experience Investment, Foundry, Playwright and `npm run verify:all`. Nothing auto-merges.

## Consolidated legacy retention proposal (#1871)

The older return-visit-loops, live-conditions-trust and remembered-state proposal is retained in Git history, not installed as three additional skills. Route repeat decisions to return-visit-design; source cadence and per-feed failure to freshness-watch and data-contract-validation; saved state to my-spots-offline; URL/share state to share-and-embed; context-aware next steps to tool-handoffs; measured outcomes to return-metrics. The 46-skill catalog and maturity registry are unchanged. The older proposed push exception conflicts with the owner's standing no-push decision and is not adopted.

Useful review prompts from that proposal, subordinate to the existing owning methods and source/safety contracts:

- Is the changing answer readable at phone width before optional saved-state prompts? Can the visitor skip or clear saved state without losing the core answer?
- For independently usable feeds, distinguish observed, modeled, forecast, stale and unavailable values; show source time and age. Withdraw unsupported forecasts or safety verdicts rather than retaining them as live. Pause unnecessary polling in a hidden tab and validate recovery on return where appropriate.
- For meaningful shareable selections, test URL precedence over saved defaults, invalid parameter handling, back navigation and opt-in location with a manual alternative. Do not store precise location without consent or send saved state to a server.
- No unvalidated retention score or implied traffic uplift. Use existing evidence and actual comparable measurements, or NOT MEASURED.

Historical reference points: wondelai/skills (MIT), openai/plugins dashboard guidance (MIT), vercel-labs/agent-skills navigation/state guidance (MIT). No vendoring, dependency, instruction activation or infrastructure change in this reconciliation.
