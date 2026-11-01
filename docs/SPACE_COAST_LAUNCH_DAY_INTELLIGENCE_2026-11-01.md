# Space Coast launch-day intelligence: schedule observations and departure decisions
Design, sources and implementation: November 1, 2026

## Goal: do I still have a launch worth traveling to see?

A launch-day visitor needs answers about target updates, explicit holds and scrubs,
the recency of the evidence, and whether the published T-0 has passed. These
questions are distinct from three already-implemented sources:
- KSC mission-specific official viewing/ticket notices, checked independently
  every 15 minutes by a signed GitHub Actions workflow.
- NPS present-day park restrictions and the 30-minute-before-liftoff
  *published entry policy*, which is not a live closed-gate signal.
- NWS location-specific spectator surface forecasts, which are not range weather
  clearance or rocket trajectory visibility.

## Official and third-party source verification

Launch Library 2 API documentation:
https://ll.thespacedevs.com/docs
LL2 anonymous quota: 15 calls per hour; shared caching is necessary. Its
production 2.3 endpoint is an independent third-party schedule aggregator, NOT
an official launch operator source or countdown control system. It exposes
mission ID, target NET, target time precision, source last_updated, status,
launch window, provider and pad.

Official Kennedy Space Center launch-viewing FAQ:
https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing/
KSC publishes ticketed viewing and states launch dates and times are subject to
changes by NASA, the Space Force or commercial operators. It is not the actual
launch-control authority for a commercial mission.

Official KSC scrub and hold explanations:
https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/what-to-expect/
Scrub cancels the current attempt, hold interrupts countdown; technicians and
range controllers may change readiness at any time. Do not infer a scrub from
a mission vanishing from an "upcoming" feed. Do not infer a launch from the NET
being earlier than current time.

## Scheduled architecture without 15 requests/hour per user

The already-live signed GitHub Actions workflow
.github/workflows/space-coast-ksc-watch.yml runs nominally at minutes
7,22,37,52 each UTC hour and signs a short-lived GitHub OIDC request to the
existing /api/space-coast-ksc-watch POST. That endpoint already performs a
fully independent KSC official listing/page collector.

This release adds a separate bounded LL2 schedule collector to that **already
authenticated** backend POST. Both collectors run under independent
Promise.allSettled protection and each handles its own source state. No new
public write endpoint, scheduled job, public secret, Redis or database
migration. The LL2 collector issues at most one anonymous production API
request per scheduler cycle (nominal four/hour), uses the private
Postgres ToolState namespace, and has an atomic cross-region lease.
The LL2 collector can fail without rewriting previous history or affecting
the KSC mission announcement collector's success.

Key: space-coast:launch-day:v1 with 14-day TTL, 15 current/upcoming Florida
mission observations, at most 20 including bounded disappeared missions,
35 observed events per mission, and a 48-hour maximum retention for records
that disappear from the upcoming feed. Keys stored in the existing private
Postgres-backed state adapter; atomic RELEASE is used, not raw Redis commands.

The main /api/space-coast-launch GET now **prefers** a schedule snapshot
from Postgres when <=25 minutes old. This eliminates redundant LL2 requests
on ordinary cached landing-page refreshes after the signed watcher starts.
It retains its pre-existing 15-minute CDN-cached direct LL2 fallback when
the scheduled state is unavailable or stale, avoiding total visitor failure.
This API still checks NPS/NWS at the appropriate previous cadence and
continuously validates KSC tickets independently; no artificial "go" result
is derived from those other sources.

GET /api/space-coast-launch-day?launchId=<UUID> is read-only:
- 45-second CDN cache, 30s stale-while-revalidate.
- Reads private shared observation state only, **never polls LL2**.
- Gives the selected mission's latest observed time/status, age, bounded
  timestamped schedule event log, and explicitly different hold / scrub / past
  target / disappeared-from-upcoming / stale judgments.
- Redacts all keys and internal state. Different mission IDs never cross
  into an unrelated mission's data.
- Recency threshold is 40 minutes. If source is stale, fail closed to
  "check official operator" even if last status was Go.

The shared watcher also refreshes the existing KSC trusted launch ID snapshot
on each run, so the KSC event history can link verified mission pages to an
identity even if nobody loads the public launch page that day.

## Visitor experience

The above-fold "Is this launch still on track?" desk:
- Always identifies LL2 as third-party source. The operator is still the
  authority for launch go/no-go, actual scrub and mission changes.
- Shows first-detected time, last checked time in Eastern Time, source age and
  a maximum of eight recent mission-specific observation events.
- A countdown is only to a sufficiently recent, exact LL2 target; never
  to a confirmed launch, live rocket timer or a guaranteed spectator event.
- Status differentiation: schedule time change, provider "Hold" or "Scrubbed",
  upcoming-list disappearance, old/stale source, target passed.
- Current scheduled observation can override **older** cached launch time and
  status display so the visitor does not see contradictory information.
- The ordinary schedule refreshes every five minutes inside the 24-hour
  launch proximity period (and every 45 minutes otherwise). Both continue
  to use the same CDN and shared Postgres observations. The page checks
  the lightweight mission status every two minutes while visible.
- Manual "Check latest observation" reads the 45-second cached shared status,
  never a special uncached LL2 request.
- Separate NPS restrictions, visitor weather, KSC viewing and official KSC
  announcement timeline remain unchanged.

## Source confidence and failure behavior

- A changed LL2 NET is labeled "first detected" and the old/new target, not
  "officially announced at" or "scrub confirmed".
- An explicitly stated LL2 "Hold"/"Scrubbed" status is attributed to LL2 and
  requires independent operator confirmation. A stale statement loses its
  status authority.
- Disappearance from "upcoming" yields only "not in upcoming list", NEVER
  "scrubbed", "launched", "canceled" or "launch successful."
- NET passed without a verified outcome yields "target time passed; outcome
  unverified"; do not count down past zero and do not infer liftoff.
- Source failure: no new schedule observation and no deletion of last trusted
  history; stale UI warns rather than fabricating real-time updates.
- Official KSC source change chronology is kept separate from third-party
  LL2 time/status updates. A ticket listing does not certify a launch.

## Verification

Unit and integration tests:
  node --test tests/space-coast-launch-day.test.js
  node --test tests/space-coast-live.test.js
  node --test tests/space-coast-ksc-watch-route.test.js

Full repository + public HTML audit + name SERP protection + Vercel preview.
After merge, confirm exact production READY commit, GET mission endpoint,
live map/CARTO and NPS closures, official KSC chronology, and desktop/mobile
pulse render. Verify the *real* scheduled workflow executes and Postgres
recency is updated; a READY deployment alone is not enough to claim ongoing
24/7 launch observation checks.

No unsupported background promises or user push notifications. A future
monitoring improvement can incorporate official per-operator mission
announcement feeds, with independently validated identity and source
timestamps. Only if LL2 rate-budget statistics justify it should the
cadence be increased.
