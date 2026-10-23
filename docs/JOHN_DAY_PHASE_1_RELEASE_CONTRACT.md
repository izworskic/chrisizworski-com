# John Day Lock & Dam — first implementation, source and release gates
Date: 2026-10-22. Branch: feature/john-day-lock-decision-engine. Site proposal: /john-day-lock/.
This is a preview-stage interactive decision product, not a commissioned navigation advisory or a live lock-status service.

## Verified material
- USACE official notice 215019, September 9 2026; winter schedule 2026-09-15 through 2027-05-14, daylight only on request; commercial priority around outage, operator discretion; John Day lock 541-739-1050, marine VHF 14; 30 minutes advance contact. https://ndc.ops.usace.army.mil/ords/ntni/print_nav_notice?in_nav_notice_number=215019&in_title_formatting=UB
- Published summer 2026 direction times, 2026-05-15 through 2026-09-14 (NOT reusable in 2027): upstream 09:00/12:00/15:00/18:00/21:00; downstream 09:30/12:30/15:30/18:30/21:30. https://www.nwp.usace.army.mil/Media/News-Releases/Article/4508175/summer-recreational-lock-schedule-now-in-effect-on-columbia-river/
- 2024 safe lockage policy: seaworthy, mooring, PFD requirements; nonmotorized craft require motorized qualified assist configuration and passengers on assist craft, lockmaster decides. https://www.nwp.usace.army.mil/Media/Public-Notices/Article/3783175/corps-updates-safe-lockage-policy-for-recreational-vessels-on-columbia-snake-ri/
- Official Corps Locks LPMS advertises current status/queue reports at approximately 15-minute reporting intervals. Actual John Day row/programmatic access has NOT been verified: https://ndc.ops.usace.army.mil/ords/r/lpms/corps-locks/home.
- Official USACE NWD John Day daily and hourly report index; historical observations are report-date tagged and not equal to lock/boating clearance: https://www.nwd.usace.army.mil/columbia-river/crwm/water-control-data/
- Archived real documentary image, USACE Benjamin Rogers, August 2022 (public domain per publisher): https://www.dvidshub.net/image/7361754/john-day-lock-dam-aug-3-2022

## Implementation truth hierarchy
1. Lockage recommendations are NEVER clearance to navigate. Current official amendments, lock operator discretion, navigation notices override seasonal general schedules.
2. If period unsupported, answer unknown; do not carry 2026 schedule into a later year.
3. No claims for observed John Day lock status, queue, vessel transit, ETA, webcam or publicly accessible observation platform until source and evidence validated separately.
4. Water API must fail closed for invalid HTML, unexpected project, missing measurements, or failed upstream. Historical report has an explicit observation date and units.
5. Avoid arbitrary nearby AIS icons, invented weather gates, speculative visitor access and unsupported live camera embeds.
6. Photography is factual and rights-linked; never pass off illustrations as operational pictures or make photos imply public access.
7. Costs: no cron, Redis, paid APIs, runtime language models, or new infrastructure. CDN HTML/CSS/JS plus one bounded 8-second fetch, cached 30m if valid.
8. Search identity: Chris Izworski visible creator link, one canonical Person ID, single indexable tool URL only after the live source QA; do not mass-create thin related pages.

## Benchmark scorecard
Hard vetoes: bad safety advice, unverified lock status/queue/ETA, fabricated river flow, wrong photo/location, inaccessible source controls, unverified visitor access. All vetoes must be zero.
- Rules: 35% exact-date window + 25% unknown/notice precedence + 20% next action + 10% provenance + 10% accessibility. Threshold: 100% of supplied regulatory fixtures.
- Water: 30% numerical fidelity + 25% missing-data behavior + 20% time and units + 15% explanation + 10% navigation-independent labels. Target >=90/100 static checks, zero invented samples.
- Visual: 35% concept correctness + 25% comprehension + 15% mobile legibility + 15% controls + 10% accessibility. Target >=90 structural plus direct mobile review.
- Watch/visit: until verified LPMS/AIS/public access, truthful limited state and authoritative outbound links; no fake performance score.

## Required premerge validation
- node --test tests/john-day-rules.test.js tests/john-day-water.test.js
- Validate real USACE hourly HTML with a captured sanitized fixture in tests before relying on API for displayed observations.
- Check branded/metadata canonical, photo credits and links, JS disabled, accessibility keyboard, 375px/390px, reduced motion.
- Check current navigation notices specifically for outages/amendments, and test published John Day LPMS data retrieval and real AIS reach. If not verified remain explicitly unavailable.
- Run repository verification and ONE Vercel preview, fix errors on branch; do not merge with red checks. No automatic deploy from this plan.
