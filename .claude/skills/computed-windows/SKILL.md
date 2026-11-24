---
name: computed-windows
description: "Computed sky and light windows for chrisizworski.com tools: dark hours, moon interference, twilight, golden hour and rise and set times, using Astronomy Engine or suncalc. Use when a tool needs a next-good-window line (aurora, meteors, stargazing, photography, sunrise spots), a dated reason to return, or an add-to-calendar date."
---

# Computed windows: give every forecast a date to come back

A forecast says what might happen; a window says when it could be seen. "Next dark, moon-down hours: Thursday 11:40 pm to 5:10 am" is computed fact, fits the network's rule of computed data over generated text, and gives the visitor a dated reason to return or put it on a calendar.

## Libraries

| Library | License | Use it for |
| --- | --- | --- |
| [Astronomy Engine](https://github.com/cosinekitty/astronomy) | MIT | Precise searches: `SearchRiseSet`, `SearchAltitude` (twilight thresholds), `SearchMoonPhase`, `Illumination`. Stable; last commit Jan 2025. |
| [suncalc](https://github.com/mourner/suncalc) | BSD-2-Clause | Lightweight daily values: `getTimes` (sunrise, sunset, dusk, night, golden hour), `getMoonTimes`, `getMoonIllumination`. |

Pick one per tool. suncalc is enough for "tonight" lines; use Astronomy Engine when searching across days or when precision near the poles matters (Alaska tools).

## What to compute

- **Dark window:** astronomical night (sun below -18 degrees) minus the time the moon is up with illumination above about 50 percent. Show the moon phase beside it.
- **Twilight and blue hour:** civil (-6), nautical (-12), astronomical (-18).
- **Golden hour:** sun between about -4 and +6 degrees; label it approximate.
- **Event windows:** a meteor shower peak from a published calendar (cite it), with moon interference computed for the peak night.

## Rules

- Compute in the browser or at build time. No Vercel function for math.
- Use the place's IANA time zone (America/Detroit for Michigan, the place's own for national tools) and handle the DST change dates.
- Static HTML holds no hardcoded future year or date; a small module derives dates from the rule, like the Mackinac Bridge Walk module does.
- Keep a forecast and a window separate on the page: "Kp 5 forecast" and "dark from 11:40 pm" are two facts. Never merge them into a single confidence number the data does not support.
- Label computed times as computed, rounded to the minute, and do not show seconds.
- Offer the next window as an add-to-calendar link through `condition-alerts`.

## Verify

- Check three dates (a solstice, an equinox, a DST change day) for two locations (one Michigan, one far north or west) against the U.S. Naval Observatory or NOAA solar calculator; tolerance 2 minutes for sun events, 5 for moon. Record the comparison in the PR.
- Unit-test the window logic for nights with no astronomical darkness (high latitude summer) and nights with the moon up all night.
- Run the owning repository's full gate; follow Experience OS, Experience Investment and Foundry for visible UI; preserve Auto ads. Unrun checks are NOT VERIFIED. Do not auto-merge.
