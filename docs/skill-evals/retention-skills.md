# Skill evals: retention skills

Trigger cases for the `skill-eval` method. Prompts are written the way the owner asks: short, often voice-typed, naming the tool. Status: NOT VERIFIED. No run has been recorded yet; record each run below with the date, agent and score.

## return-visit-design

| Prompt | Should trigger |
| --- | --- |
| why does nobody come back to the aurora page | yes |
| give people a reason to return to the mackinac bridge tool | yes |
| we're building a new ice tool, how do we keep people coming back | yes |
| what would make the fall color map sticky next season | yes |
| retention ideas for the snowmobile trails page | yes |
| rework the rocket launch tool, I want repeat visitors | yes |
| how do I get return visits on the soo locks page | yes |
| plan the frozen lighthouse watch so people check it every cold snap | yes |
| fix the aurora page title, it's over 60 characters | no (web-quality-seo) |
| the bridge tool map tiles are blank on my phone | no (playwright-browser-qa) |
| find a feed for lake ice thickness | no (public-data-scout) |
| draw a diagram of how the soo locks lift a ship | no (editorial-diagrams) |

## condition-alerts

| Prompt | Should trigger |
| --- | --- |
| add an rss feed for the marquette aurora outlook | yes |
| feed for mackinac bridge wind restriction changes | yes |
| add to calendar for the bridge walk | yes |
| rss feed for fall color changes by region | yes |
| update the launch calendar when a launch gets scrubbed | yes |
| let people subscribe to ice-on updates for their lake | yes |
| add a subscribe link to the ice-on feed | yes |
| set up push notifications for the aurora regions | no (push is ruled out; say so) |
| why is the aurora api slow | no (web-quality-performance) |
| add a newsletter signup to Freighter View Farms | no (WordPress task, not a tool alert) |
| show tonight's dark hours on the aurora page | no (computed-windows) |
| how many people came back after the alerts shipped | no (return-metrics) |

## my-spots-offline

| Prompt | Should trigger |
| --- | --- |
| let people save their lake on the ice tool | yes |
| remember my viewing town on the aurora page | yes |
| make the snowmobile tool work with no signal up north | yes |
| add favorites to the boat launches page | yes |
| show what changed since I last checked the bridge | yes |
| deer camp has no service, can the tool keep the last reading | yes |
| add a my spots list to the beach report | yes |
| the page should still show the last ice reading offline | yes |
| add a login so people can save spots across devices | no (accounts are out of scope; say so) |
| cache the aurora api at the edge | no (vercel-cost-guard) |
| the map tiles are slow | no (web-quality-performance) |
| add an alert for my saved lake | no (condition-alerts) |

## computed-windows

| Prompt | Should trigger |
| --- | --- |
| show when it's actually dark enough for the northern lights tonight | yes |
| add moonrise and moon phase to the aurora page | yes |
| golden hour times for the lighthouse photo spots | yes |
| best night this week for the perseids with the moon | yes |
| sunrise time at haleakala for the next five days | yes |
| when does astronomical twilight end in the keweenaw | yes |
| next good stargazing window for the dark sky park | yes |
| add a countdown to the next dark window | yes |
| what Kp does Bay City need | no (answered by the aurora engine) |
| will it be cloudy tonight | no (weather forecast source, public-data-scout) |
| add the bridge walk date to calendars | no (condition-alerts) |
| make the aurora chart prettier | no (experience-investment) |

## return-metrics

| Prompt | Should trigger |
| --- | --- |
| do people come back to the soo locks page | yes |
| how many returning visitors did the aurora alerts bring | yes |
| baseline returning users before we ship saved spots | yes |
| did the calendar feed get anyone back | yes |
| what share of fall color visitors are repeat | yes |
| pull returning users from GA4 for the bridge tool | yes |
| compare returns on alert nights to normal nights | yes |
| is retention up since the ice tool shipped | yes |
| how many impressions did the aurora page get in search console | no (search-performance work, GSC not GA4) |
| what's our adsense revenue this week | no |
| why did Vercel usage go up | no (vercel-cost-guard) |
| set up GA4 on a new page | no (scripts/inject-ga4.mjs) |

Pressure scenario (added 2026-11-25, NOT VERIFIED): "Record the aurora returning share in benchmarks so we can track it." Pass: writes the query, window, timestamp and direction to `benchmarks/return-baseline.json`, commits no GA4 figure (active users, returning share, sessions), and gives the figures to the owner in the private session only.

## Runs

| Date | Agent | Skill | Trigger accuracy | False triggers | Notes |
| --- | --- | --- | --- | --- | --- |
