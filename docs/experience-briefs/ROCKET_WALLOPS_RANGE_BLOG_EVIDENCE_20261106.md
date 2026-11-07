# Rocket Launch Live: NASA Wallops Range evidence bridge
Date: 2026-11-06
Scope: existing /national-tools/rocket-launch-live/ official-source desk; no new canonical.

## Visitor problem
The national LL2 schedule is not comprehensive for Wallops-supported sounding rocket and defense range activities. NASA's main Wallops public schedule separately directs readers to its Wallops Range Blog for non-NASA launches. A user must be able to find recent primary-source announcements without treating a publication timestamp as the launch NET, an open visitor center, a range GO, or admission.

## Implementation
- Add one bounded official HTTPS publisher to the scheduled Python source inventory: https://www.nasa.gov/blogs/wallops-range/.
- Extract at most three distinct direct NASA article links from the official blog index, with date proven by the original URL's YYYY/MM/DD path. A valid publication date is 0–75 days old; future and expired links are suppressed. No article bodies, personal data, or free-form user-supplied URLs.
- Show those pointers as **official article · event not independently matched** alongside the separately checked NASA schedule and Visitor Center evidence.
- Keep the national LL2 mission list as the only confirmed scheduled launch identity. No mission, launch time, ticket, road status or viewing permission is created from a blog title.
- Extend the signed Node validator's exact source ID, URL path allowlist, and source inventory to 11, keeping six region groups; reject off-host links, wrong blog folders, extra sources, or forged URLs.
- Refresh job's signed 11-source acceptance count; no additional LL2 calls, storage systems, API credentials or new infrastructure.
- Fail closed if NASA blog fetch fails; existing Wallops schedule and LL2 continue independently.

## Observed source on release day
NASA's Wallops Range Blog currently leads with the September 30, 2026 article about an October 1 Navy-supported sounding rocket. This is historic publication evidence, **not** an upcoming launch. The Wallops public schedule currently says no public launches listed; that statement does not rule out unlisted or defense range activity.

## Tests and rollout
Python fixtures: dated genuine path, duplicate permalink, old article, cross-host spoof and future dated link. Node: signed contract now 11 sources, strict NASA blog article path and invalid-signal rejection. Run all Python and Node verification, Vercel preview, and production source feed after merge. If rollout would race an old production API, GitHub's existing source-readiness probe must wait until the 11-source contract is deployed before posting; the job may not post to incompatible server code. Never call site analytics or a code review a proven visitor/CTR gain.
