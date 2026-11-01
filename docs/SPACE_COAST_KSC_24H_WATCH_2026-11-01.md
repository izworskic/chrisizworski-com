# Space Coast KSC 24/7 Announcement Watch + Verified Mission Chronicle
Released design: November 1, 2026

## Problem and operational choice

The existing on-page KSC checker refreshed while someone viewed the tool; it did
not detect overnight operator announcements. The existing LL2-based launch list
must not be polled every 15 minutes to look for new KSC viewing details.

Official Vercel Cron policy checked November 1, 2026:
- Hobby: at most once per day; minute-level cron requires Pro/Enterprise.
- Account plan is not assumed. Do **not** add */15 to vercel.json.
- GitHub Actions scheduled workflow can run every 5 minutes at minimum.
  Scheduled runs can be delayed or missed, and may auto-disable on an inactive
  public repository after 60 days.

Use .github/workflows/space-coast-ksc-watch.yml with the UTC schedule
7,22,37,52 * * * * (nominal 15-minute cadence) and workflow_dispatch.
Each job has id-token: write permission, mints an OIDC token with audience
https://chrisizworski.com/api/space-coast-ksc-watch, and POSTs to the live
Vercel endpoint. The backend verifies the GitHub signature, audience, repository,
owner, workflow filename, main ref, event, token age and job runner. No long-lived
GitHub or Vercel bearer secret and no workflow checkout are required.

## Data and trust model

1. Fetch only KSC official public event calendar.
2. Parse its published structured event records, accepting only official HTTPS
   /event/<slug>/ URLs with recognizable mission identifiers and launch type.
3. Inspect at most four event pages in one cycle, prioritizing new pages before
   least recently checked known pages. Requests to the operator are bounded.
4. Verify the official event page itself contains the same specific mission,
   current NET date, compatible calendar date and actual viewing sections.
5. Persist only normalized validated evidence: event title, date, pad, official
   URL, named viewing locations, ticket type, check-in, boarding, open/close
   times and timestamps. Raw HTML and unverified ticket inventory never persist.
6. Compute a bounded diff with evidence links and detection time; only a
   successfully parsed official page can cause a timeline change. Mere
   disappearance from the calendar, a failed fetch, or a non-match cannot
   establish a cancellation, closed viewing area or sold-out package.
7. Read existing state via lib/tool-state.js in its existing Vercel OIDC-
   authenticated private Postgres namespace. Keys:
   - space-coast:ksc-watch:v1: ~120-day TTL, capped missions/history
   - space-coast:ksc-watch:lease:v1: atomic SET NX EX 120-second lease
   Release uses atomic compare-and-delete to protect concurrent retries.

The collector is independent of visitor sessions and never calls LL2, NPS, or
NWS. The existing LL2 launch API continues to populate the trusted mission ID
snapshot on its own cache. When a visitor selects a mission, the read-only API
matches verified KSC history to that selected LL2 mission using exact identity,
date proximity and compatible pad. If those checks fail, history is not linked.
Therefore KSC's event date is not misrepresented as a schedule feed agreement.

## Public endpoint and UI

- POST /api/space-coast-ksc-watch: scheduled authenticated collector
- GET /api/space-coast-ksc-watch: monitor health, no private storage leak
- GET /api/space-coast-ksc-watch?launchId=<UUID>: verified mission chronology
- API responses are noindex; public GET cache is ~90s. POST/failures no-store.
- On the Space Coast page, the "What changed for this launch?" chronology
  shows exactly when the website first detected each verified change and links
  to KSC's official page. Mission history is separate from ticket status and
  never implies real-time inventory or an approved flight.
- The UI displays overdue or partially verified monitor checks honestly.

## Failure semantics

- Calendar unavailable/malformed: no state/history change; collector fails,
  GitHub Actions logs the failure.
- Page unavailable/stale/unmatched: no new event; old evidence remains dated;
  monitor health indicates partial verification.
- No record for the selected mission: "No verified changes recorded", not
  "there will be no viewing".
- State unavailable: fail safely, do not downgrade to local in-memory or Redis.
- Overlapping jobs: second call exits harmlessly (leased).
- No verified page updated in 45 min: mark timeline page evidence stale.
- On-page KSC five-minute checks continue separately without LL2.

## Verification and operational guardrails

Tests:
- node --test tests/space-coast-ksc-watch.test.js
- node --test tests/space-coast-ksc-watch-route.test.js
- node --test tests/space-coast-ksc-viewing.test.js
- npm test, existing CI and Vercel build gate

After deploy:
- GET endpoint health (may initially be "not-initialized" until first job).
- Trigger workflow_dispatch for Space Coast KSC official announcement watch,
  or allow scheduled invocation after deployment. A scheduled workflow only
  executes from the default branch.
- Verify GitHub workflow run successfully authenticated and produced a KSC
  calendar check. Confirm GET health shows recent lastCalendarCheckedAt.
- Verify current mission ID timeline links only to actual verified KSC pages.
- Audit no LL2 requests in collector source or runtime logs.
- Observe logs, frequency/usage and KSC source changes; pause monitor if the
  official site withdraws automation permission or requests a lower rate.

Future work is actual user opt-in notifications after demonstrated accurate
history and measured source load; none are built or claimed here.
