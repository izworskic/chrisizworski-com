# NYC Crossing: live 511NY advisory truth audit — November 10, 2026

## Why the second pass was necessary

At **20:30 EST on November 10, 2026** (01:30Z November 11), the production 511NY collector finally returned a verifiably successful incident-source poll after PR #1619. The public read-only diagnostic was `state: LIVE`, `eventsStatus: UPDATED`, `eventsCount: 34`, `signsStatus: UPDATED` with a source-specific refresh timestamp.

**This establishes ingestion, not 34 currently obstructed bridges.** Inspection of all 34 normalized public records revealed:

- Three agency placeholders explicitly said **“No Active Reporting”** but were counted as roadway incidents and assigned small advisory penalties.
- Several construction records described work scheduled for later dates or only certain hours, despite being included by an API that returns **active and future** records.
- Much of I-95 near the Cross Bronx Expressway was attributed to the George Washington Bridge; I-278 work miles from a crossing was similarly treated as a crossing disruption.
- Each event `updatedAt` showed the literal **`[object Object]`**, because CARS uses `ZonedDateTime { time, utcOffset, timeZoneId }` objects, not date strings.
- Records covered real roadwork, closures and operational notices, not just accidents; the visitor label **“mapped incidents”** was misleading.

Reference: [CARS API model and event-list semantics](https://mn.carsprogram.org/carsapi_v1/console/). It documents `category: PLANNED/CURRENT/FORECAST`, `details[]`, `scheduleOccurrences[]`, `recurrent-times[]`, and `ZonedDateTime.time`. The New York provider uses the same versioned CARS schema. The verified 511NY source timestamp says the feed was read, **not that every individual notice applies now**.

## Integration with the parallel production credibility fix

Another main-branch change independently tightened CARS current-status validation, source observation timestamps, and stale normalized-cache safety. This release preserves those checks and adds **verified recurring-work windows**, tighter per-event crossing proximity and accurate nearby-advisory labels. No main-branch cache validation is removed.

## Release changes

1. **Actual event dates.** Parse CARS `ZonedDateTime.time` as an epoch value (milliseconds for current CARS records) and retain ISO timestamps, with an explicit null/blank fallback for malformed values. Legacy ISO strings remain supported.
2. **Current status.** Never call an event a current crossing disruption when it is `PLANNED`, `FORECAST`, `ENDED`, `POSTPONED`, `CANCELED`, or explicitly reports no active restrictions.
3. **Recurrence.** Require at least one validated active `scheduleOccurrences` window when supplied. Do **not** treat a broad month-long work-project date range as a 24-hour lane restriction when there are unexpanded recurrent weekday/time rules.
4. **Geographic restraint.** Only attribute reports within approximately **2.3 km** of a documented crossing reference, rather than stretching every highway report across the original 7.5 km matching envelope. Broader corridor reports can still be checked directly at 511NY; a tool cannot infer a visitor's actual approach route.
5. **Language.** Call these **nearby roadway advisories**, not all “incidents,” and explain that a nearby approach is not the bridge itself.
6. **No false all-clear.** A verified feed with zero qualifying local reports means *no qualifying local advisories in this product's vetted scope*, not that the crossing is incident-free. The independent highway-sign and traffic feeds remain separate.

## Evidence-backed acceptance

- Nested CARS details and epoch-millisecond ZonedDateTime values yield a readable date, never `[object Object]`.
- Synthetic future and expired work, planned/forecast events, reopenings and “No Active Reporting” notices do not enter active summaries.
- A recurring project without an explicitly current occurrence is excluded, even if its overall date range spans today's date.
- Roadway locations more than 2.3 km from the documented crossing cannot create a crossing card.
- Live event feed, sign feed and valid nearby ongoing restrictions remain available.
- Existing crossing ETAs, price/vehicle comparisons, no-fabricated-fastest rule, toll arithmetic, source freshness, canonical URL and ad wiring are unchanged.

## Limitations

The official API does not provide a driver's origin/destination. The 2.3 km scope is a conservative **product matching rule**, not a transportation authority boundary. A road report can still be stale or directionally irrelevant; the UI remains source-qualified and links the official 511NY map. Recurring schedules without independently expanded occurrences are intentionally *not* elevated into “currently active” restrictions. This is a tradeoff toward truthful current warnings, not an assertion the future construction does not exist.

**No production outcome is claimed until this release is merged and the public live endpoint is rechecked after a new five-minute refresh.** Do not compare pre/post raw event counts as though they were counts of crashes, closures or blocked crossing lanes.
