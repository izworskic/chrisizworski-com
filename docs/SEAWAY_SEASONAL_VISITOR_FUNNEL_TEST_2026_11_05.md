# St. Lawrence Seaway seasonal planning funnel: measurable visitor-journey test

**November 5, 2026** · Existing canonical `/st-lawrence-seaway/` · Existing GA4 tag `G-Y5D2V2W7HN`. No new SDK, production endpoint, user identifiers, cookie, ad placement, or indexable page.

## Question being tested

When a person encounters the 2022–2024 BTS historical passage comparison, do they deliberately select a month, and does that action lead to a meaningful trip-planning or ship-watching next step?

**The available evidence today cannot answer actual user behavior.** Windsor.ai's GA4 connector reported reads paused due to its free plan's connected-account limit (9 connected, 1 allowed). Vercel's custom-event endpoint reported Web Analytics not found for the project. These are reporting-access limitations, not evidence that nobody interacted. The new seasonal fieldbook was just deployed on November 5; there is no defensible before/after outcome.

## Instrumented event taxonomy (GA4 via existing site gtag)

| Name | Trigger | Fields | Interpretation |
|---|---|---|---|
| `seaway_seasonal_exposed` | Seasonal heading at least 50% visible, once per page load, when IntersectionObserver is available | `page_family=seaway`, `feature=seasonal_fieldbook` | Opportunity to notice the comparison, not proof that content was read |
| `seaway_seasonal_month_selected` | User explicitly clicks one of 12 calendar month buttons | `selected_month` (1–12) | Active manual comparison; automatic current-month display is excluded |
| `seaway_seasonal_next_step` | User clicks a verified link *inside* the seasonal planning section | `destination`, `destination_kind`, `after_manual_compare=yes/no`, `selected_month` or `none` | A click indicating interest, NOT confirmed travel, a booked visit, a viewed destination page, or a ship arrival |

Destinations are strict and allowlisted:
- `eisenhower`: verified visitor destination, lock guide
- `ship_watch`: intra-page Seaway recent-report map
- `welland`: another ship/lock guide
- `operator_hours`: official Seaway Visitor Center information
- `official_queue`: operator order-of-turn information
- `seaway_notices`: operator notices

No MMSI, ship name, precise coordinate, raw URL query, unique session token, IP, or user-entered text is transmitted by this code. GA4 already manages its own platform identity/consent. Same-tab navigation sends with transport_type=beacon. The source-to-destination flow is scoped to the seasonal section and **never** inferred from unrelated links across the site.

## Analysis specification

Primary descriptive funnel in GA4 Explore (open funnel, *unique sessions*, same-session event order):
1. Seasonal section exposed.
2. One or more manual month selections.
3. Clicked next step with `after_manual_compare=yes`.

Compute:

```
Compare reach = unique sessions with a manual month selection / unique sessions with seasonal exposure
Planning follow-through = unique sessions with a next-step click after manual comparison / unique sessions with manual comparison
Tools follow-through = same-session next-step clicks for ship_watch, eisenhower, welland / manual-comparison sessions
```

Those are **descriptive engagement diagnostics**, not causal effects. Do not divide raw event counts: one person may click multiple months and links. Segment mobile vs desktop, and differentiate official operating-information links from first-party tools. Test subsequent destination `page_view` and engaged-session metrics separately; a link click alone is not a successful landing-page view. The in-page ship-watch link has no distinct destination pageview.

Use the *actual* release timestamp, 2026-11-05, as a cohort boundary. Start with 14 calendar days for early path QA; wait for at least 100 exposure sessions and 30 manual comparison sessions before treating rates as directional. Compare subsequent non-overlapping 28-day GSC windows **only** for discoverability, not engagement, with Seaway vs Welland intent ownership held constant. Avoid extrapolating from a few minutes or treating local synthetic tests as user traffic.

### Decision thresholds (heuristic, not statistical proof)

- Exposure low relative to Seaway landing-page sessions: investigate section depth and finding the historical tool, not the traffic model.
- Many exposures, but fewer than 10% manually compare: research confusing month controls or historical value proposition before adding more data.
- Many comparisons, but fewer than 10% make a next-step click: test the wording, relevance and placement of verified visit/ship-watching CTAs.
- High next-step clicks but low engaged destination sessions: inspect actual destination UX and load reliability before adding more links.
- No meaningful sample or inaccessible GA4 data: status **UNMEASURABLE**. Do not call this a conversion win or failure.

GA4 custom dimensions needed for breakdowns (register as event-scoped): `destination`, `destination_kind`, `after_manual_compare`, `selected_month`. Standard event_name event totals are visible without those definitions, but the detailed conversion breakdown is not guaranteed without registration. Data prior to event deployment cannot be retroactively attributed.

## Engineering verification

- Synthetic event-sequence tests verify the distinct steps, the "no manual comparison" classification, no false exposure, strict destination URL matching, event transport and no broken UI when GA4 is blocked.
- GitHub Seaway workflow validates JavaScript syntax, deterministic Python fieldbook, generated HTML, existing AIS behavior and the funnel unit tests.
- Real browser smoke check after deployment: 390px mobile and desktop, click October (published median 279, observed 204–292), follow the Welland link, use Eisenhower visiting guide, confirm that the Seaway recent-report link returns to `#ship-watch`, test focus and without-JS table.
- Synthetic interactions validate instrumentation and destination routing; they do **not** establish real user conversion, increment revenue, or prove search ranking improvement.

## Release / rollback

Scope: `public/assets/seaway-seasonal-funnel.js`, `scripts/enhance-seaway-journey.mjs` (generates page CTA metadata and script tag), generated Seaway HTML, `tests/seaway-seasonal-funnel.test.js`, dedicated CI. Revert this set together to remove tracking if events duplicate or interfere. Seasonal fieldbook and live map continue without the tracking module. No production behavior changes outside Seaway; no ads touched.
