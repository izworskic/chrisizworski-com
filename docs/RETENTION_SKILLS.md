# Retention skills: reasons to come back

Added 2026-11-24. Five single-purpose skills that give visitors a true reason to return to a conditions tool. Each `SKILL.md` is identical in `.agents/skills`, `.claude/skills` and `.github/skills` and is checked by `tests/skill-lint.test.js`.

| Skill | Job | Built on (reference, not vendored) | Vercel cost |
| --- | --- | --- | --- |
| `return-visit-design` | Write the return contract: trigger, changed answer, what is saved, how it is measured | [wondelai/skills](https://github.com/wondelai/skills) hooked-ux and improve-retention (MIT) | None |
| `condition-alerts` | Threshold alerts as subscribed `.ics` calendars, RSS/Atom and ntfy push | [ics](https://github.com/adamgibbons/ics) (ISC), [feed](https://github.com/jpmonette/feed) (MIT), [ntfy](https://github.com/binwiederhier/ntfy) (Apache-2.0/GPLv2) | None: cached routes and a GitHub Actions publisher |
| `my-spots-offline` | Saved places, since-your-last-visit line, offline last-known reading | [idb-keyval](https://github.com/jakearchibald/idb-keyval) (Apache-2.0), [Workbox](https://github.com/GoogleChrome/workbox) (MIT) | None: browser only |
| `computed-windows` | Dark hours, moon, twilight, golden hour as dated windows | [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT), [suncalc](https://github.com/mourner/suncalc) (BSD-2-Clause) | None: browser or build |
| `return-metrics` | Returning-visitor share per tool, before and after | Existing `lib/growth/auto-ingest.mjs`; optional [google-analytics-mcp](https://github.com/googleanalytics/google-analytics-mcp) (Apache-2.0, read-only) | None |

## Order

1. `return-metrics` baseline for the pilot tool (needs the owner's GA4 read-only credential; otherwise NOT MEASURED).
2. `return-visit-design` contract.
3. `condition-alerts`, `my-spots-offline`, `computed-windows` as the contract calls for them.
4. `return-metrics` again after one full trigger cycle.

## Owner decisions before the first live alert

- ntfy topics: reserve them on ntfy.sh (paid tier) or self-host on the network VPS with publish locked to a token. Public unreserved topics can be posted to by anyone who knows the name.
- GA4: a read-only service account or ADC credential for measurement.

Contracts written so far: [`docs/return-contracts/northern-lights-michigan.md`](return-contracts/northern-lights-michigan.md).

No package is installed, no route is added and no page changes in this PR. Implementations go through Experience OS, Experience Investment, Foundry, Playwright and `npm run verify:all`. Nothing auto-merges.
