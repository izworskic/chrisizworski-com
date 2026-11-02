# Launch Weather Intelligence v3 — Monitor Audit, NASA Evidence and Visitor Briefing
November 2, 2026

## Production evidence audit before this change

Read-only production GET /api/space-coast-official-weather at November 2, 2026:
- Last official-weather collector saved a state check at 2026-11-02T09:37:25.005Z.
- Health at inspection: overdue (more than 90 minutes after its last hourly write).
- Inspected missions 0; verified PDFs 0; failed PDF downloads 0.
- 45ws-home checked, no explicit PDF links.
- 45ws-forecast-support checked, no explicit PDF links (page is largely a mission forecast FAQ).
- 45ws-sitemap unavailable.
- 45ws-parent-weather unavailable.
- ll2-updates checked, zero links.
- The next published Florida mission in LL2 was Vulcan/Amazon Leo LV-01, a day-only/TBD target on November 13; the old monitor examined only launches within six days. Hence zero inspected missions did not mean every forecast source failed.

A second public read verified the ordinary Florida mission endpoint still had a current LL2 schedule. The existence of a healthy launch schedule is not proof that the separate weather monitor completed on time.

## Investment 1: Diagnose monitoring instead of guessing

- Increase bounded schedule lookahead to 21 days, but conduct intensive LL2 mission-detail/PDF checks only inside seven days. This is *our checking policy*, not a promise the 45WS publishes exactly seven days in advance.
- Persist a limited forecastWindow field: before-forecast-window / active-window / no-launches-in-21-days / unknown; nearest launch timestamp, number of candidates within 21 days, number within seven days.
- Report NASA RSS source health separately from direct 45WS link and LL2-update checks.
- Keep the signed GitHub Actions Postgres collector; after each successful POST, perform a cache-busting GET, requiring the same verified checkedAt and fresh source-diagnostic data. A 200 response alone is not sufficient.

## Investment 2: Broaden meaningful primary-source evidence

The official 45WS launch support page does not currently expose a machine-readable public inventory of mission-specific PDFs. The site continues bounded checks of first-party 45WS pages, but does not guess PDF filenames. LL2 update links still nominate official PDF URLs and these URLs must be verified by actual official PDF bytes.

Additional evidence tier: NASA's public blog RSS feeds:
- https://www.nasa.gov/blogs/commercialcrew/feed/
- https://www.nasa.gov/blogs/feed/

The hourly collector looks for launch-specific weather posts in these *official NASA* feeds, requests at most three first-party article pages, and accepts only specific text saying the 45th Weather Squadron expects a stated chance of **favorable** weather. The title must identify the same mission; the NASA article body must explicitly name the current Florida-local launch day, and the publish time must be near the mission. Separate SHA-256 and source evidence are saved in the existing private Postgres state.

This NASA tier is not an original 45WS PDF. We never convert NASA's favorable percentage into a PoV number, and never compare the two with naive subtraction. NASA updates may cover NASA missions but will not necessarily cover routine commercial launches. Failed NASA feed checks are reported as unavailable, not zero favorable weather.

Primary evidence examples verified during research:
- https://www.nasa.gov/blogs/commercialcrew/2026/09/29/weather-60-go-for-nasas-spacex-crew-13-launch/
- https://www.nasa.gov/blogs/commercialcrew/2026/09/30/weather-55-favorable-for-thursday-crew-13-mission-launch/
- https://www.nasa.gov/blogs/commercialcrew/2026/10/01/nasas-spacex-crew-13-suits-up-for-launch/
- https://www.patrick.spaceforce.mil/Portals/14/Weather/LaunchFAQ.pdf

## Investment 3: A real launch-weather story

The Florida tool gains a dedicated meteorologist-style briefing with:
- A source label: verified squadron PDF, NASA reporting the 45WS, or unverified.
- A plain-English explanation of the source's actual number. No invented chance of launch or scrub.
- Change-over-time: old vs new PoV, or separately old vs new NASA-reported favorable weather.
- Short expandable explanations for verified weather-rule concerns (cloud thickness, cumulus, precipitation, lightning, winds, storm anvils).
- A next-forecast date only when explicitly printed in a verified squadron PDF. Otherwise "not confirmed."
- A visitor next step distinguishing flight weather, operator status, access and NWS viewing-sky conditions.

The national Florida selection gets a smaller story and link to the full specialist. Both keep their established map, media, KSC view access, SEO, ad and mobile infrastructure.

## Safety and limits

- No 45WS PDF or NASA article may be labeled flight-authority GO/NO-GO.
- Original PoV is a probability of covered constraints being violated; NASA's favorable percentage is separately sourced, and an overall scrub probability is not inferred.
- Publication time, source detection time and launch target time are distinct timestamps.
- A day-only schedule is not a valid exact mission launch hour. A postponement invalidates NASA's previously quoted favorable weather unless the article explicitly gives the new launch day.
- Official source blockers remain blockers; a machine-readable 45WS public index is not claimed.
- Scheduled checks can be late or fail; state-read-back checks detect write/read divergence but cannot guarantee hourly GitHub Actions execution.

## Validation

Python:
- python -m unittest discover -s tests -p 'test_space_coast_official_weather_pdf.py' -v
- python -m unittest discover -s tests -p 'test_space_coast_weather_discovery.py' -v
- python -m unittest discover -s tests -p 'test_space_coast_nasa_weather.py' -v

Node:
- node --test tests/space-coast-official-weather.test.js tests/space-coast-weather-story.test.js tests/space-coast-media.test.js tests/rocket-launch-usa.test.js tests/space-coast-launch-day.test.js

The dedicated PR workflow runs the first two Node weather tests and all three Python suites; the normal repository verification gate runs broader integration checks. The hourly collector reruns weather tests before ingesting sources.
