# Space Coast: independent official KSC announcement checks (Nov 1, 2026)

## Visitor problem
KSC can publish mission-specific event/viewing details after the 15-minute cached
LL2/NPS/NWS schedule response has been generated. A new event must be visible
on the tool without causing a costly new Launch Library 2 fetch.

## Implementation
- Existing **/api/space-coast-launch** remains the source of mission selection,
  schedule precision, NPS access and NWS forecasts. It stores a narrow, trusted
  snapshot of up to eight normalized Florida launches in the **existing private
  Postgres tool-state service** (two-hour storage TTL). State write failures do
  not interrupt the ordinary schedule endpoint.
- New **/api/space-coast-ksc?launchId=<UUID>** retrieves only that trusted
  snapshot and verifies KSC's calendar plus mission-specific page under the
  existing bounded five-event-page limit, without fetching LL2/NPS/NWS.
- New KSC responses with successfully checked official calendars have a
  three-minute CDN cache and one-minute stale-while-revalidate window.
  Unavailable calendars/failures are **not cached**.
- On the Space Coast tool, a visible tab checks the KSC-only endpoint immediately
  after a normal schedule load and around every five minutes thereafter.
  A tab returning from the background checks again when due. Main schedule data
  renews at most about every 45 minutes while a tab is active.
- All venue/pad/date/identifier/clock-conflict verification remains server-side
  in **lib/space-coast-ksc-viewing.js**; an official calendar event by itself
  is *not* a confirmation of tickets or viewing access. Only HTTPS KSC event
  URLs can be displayed as matched notices.

## Failure behavior and resource controls
- Missing, expired (>75-minute), or unknown LL2 snapshot => KSC-only endpoint
  returns **503/no-store**, leaving the dated main-API evidence on the page.
- Tool-state unavailable => primary API still works; faster KSC refresh does
  not claim verified viewing. The error does not trigger a new LL2 poll.
- New KSC page cannot be matched to a different mission, pad or stale date.
- Frontend ignores late responses for earlier selected missions and aborts
  obsolete KSC fetches when the mission changes.
- **No Redis**, new secrets, separate database, alerts subscription, or
  GitHub Actions cron. This is a **visitor-visible on-demand monitor**, not
  an always-on offsite watch service. Notice latency depends on KSC publishing,
  client visibility, and CDN refresh; it is not instantaneous.

## Verification
Run:

    node --test tests/space-coast-ksc-fast.test.js tests/space-coast-ksc-viewing.test.js
    npm test

Production smoke:
1. Open /national-tools/space-coast-launch/ and check the KSC evidence timestamp.
2. Confirm /api/space-coast-ksc?launchId=<id-from-current-launch-list> returns
   selectedLaunchId, scheduleSnapshotAt, and KSC-only checkedAt.
3. Verify 400 for an invalid ID, 503/no-store if the trusted snapshot cannot
   be found, and no cached "verified" claims when KSC is unreachable.
4. Confirm a newly published mission page is linked only after the KSC
   verification gates and the page updates without a new LL2 request.
5. Confirm the existing SEO/ads/personal attribution controls and maps are
   unchanged. Check the site release gate before merging.

## Future investment
A genuinely **always-on** operator notice watch (even when zero users have the
page open) would require a scheduled server-side job and change log, with
measured upstream load/quotas. Do not claim this release provides notifications,
real-time inventory or offsite proactive monitoring.
