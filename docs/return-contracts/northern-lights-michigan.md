# Return contract: Northern Lights Michigan

Written 2026-11-24 with the `return-visit-design` skill. Pilot tool for the retention skills because it carries the largest share of hub search impressions (18,461 of the Feb 12 to Aug 1 2026 window in `benchmarks/growth-100x-baseline.json`).

| Field | Contract |
| --- | --- |
| Tool and URL | Northern Lights Michigan, `/northern-lights-michigan/`, engine `lib/aurora.js` behind `/api/aurora` |
| Visitor and decision | Someone in Michigan deciding whether to drive to a dark north-facing spot tonight |
| State that changes | NOAA SWPC Kp forecast (`peak_24h`, `peak_72h`), current Kp, and the OVATION grid value at each of 8 regions |
| Trigger worth an alert | A region's verdict moves to "Possible in the 24-hour outlook" (`peak_24h` at or above the region's `planning_kp`) or "Active nowcast signal" (OVATION value 10 or more near the region). Thresholds already in `lib/aurora.js`: Keweenaw, Marquette and Munising Kp 4; Sault Ste. Marie and Mackinaw City Kp 5; Traverse City Kp 6; Bay City and Detroit Kp 7 |
| Cooldown | One alert per region per verdict step per night; a new alert only when the verdict steps up (outlook to active nowcast) |
| What the visitor saves | Their region (one of the 8 ids) |
| Upcoming window | Next dark, moon-down hours for the saved region from `computed-windows` |
| Changed answer on return | "Your region: possible tonight, Kp 5 forecast, dark from 11:40 pm, moon sets 1:10 am" against what they saw last time |
| One action from the alert | `/northern-lights-michigan/#<region id>` regional card |
| Channels | ntfy push, one topic per region (time-critical, hours not days). No calendar: aurora is not reliably dated. RSS optional later |
| Cost | Zero Vercel functions or builds added: GitHub Actions schedule reads one cached `/api/aurora` response per run and publishes to ntfy |
| Baseline | Returning share: NOT MEASURED (needs the GA4 read credential). Search: 18,461 impressions, 341 clicks over 171 days |
| Success test | Returning share on nights a region alert fired, against nights with no alert, same season; at least 200 active users per side before stating a rate |
| Ethics check | 1. Threshold is computed from SWPC Kp and OVATION with observation time: yes. 2. The owner would want this for his own nights out: yes. 3. Stop in one step (unsubscribe the topic), no account: yes. 4. Not a safety topic; messages still tell people to check clouds and the NOAA nowcast: yes |

## Blocked on

- ntfy topic protection (owner choice: reserved topics on ntfy.sh or self-hosted with publish locked to a token).
- GA4 read credential for the baseline.

## Next skills to run

`return-metrics` (baseline), then `computed-windows` for the dark-window line, then `condition-alerts` for the regional topics, then `my-spots-offline` for the saved region. Compared against Mackinac Bridge Live (dated windows, wind triggers) and Fall Color (regional peak, slower cadence).
