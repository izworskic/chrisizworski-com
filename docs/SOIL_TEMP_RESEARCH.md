# Michigan soil temperature tool: research and design

**Route:** `/michigan-soil-temperature/` · **Recorded:** October 24, 2026 · **Gate:** `npm run benchmark:garden-tools` (row `michigan-soil-temperature`) · **Tests:** `tests/garden-tools.test.js`

The owner asked for the soil temperature forecast idea to be researched and built: combine measured Michigan soil temperatures with a forecast and the MSU planting temperatures already sourced for What to Plant Now, and give a date.

## 1. Data sources checked

| Source | What it has | Access from a visitor's browser | Used? |
|---|---|---|---|
| **MSU Enviroweather / MAWN** (`api.enviroweather.msu.edu`) | 100 active Michigan stations with soil temperature at 2, 4, 8 and 20 inches (daily low and high), soil moisture, air temperature. Daily records back to each station's start (many since the late 1990s). | Yes. The API sends `Access-Control-Allow-Origin: *` and allows the `Authorization` header. A token comes from `GET /ewx-api/api/session`, which hands every unregistered visitor a guest token (`roleId 4`), exactly as enviroweather.msu.edu does for its own visitors. Daily soil data: `GET /rm-api/api/run?resultModelCode=soilconditions&stationId=…&stationCode=…&stationType=1&selectDate=MM/DD/YYYY&dateStart=MM/DD/YYYY`. | **Yes**: today's reading, this spring's record, and 11 springs of history |
| MSU Enviroweather `latestObs` | Latest air readings for 115 stations | Same token | No: it carries no soil temperature |
| MAWN legacy site (`mawn.geo.msu.edu`) | Station pages and pregenerated daily and hourly reports | No CORS headers, HTML only | Linked as each station's record page, not read |
| MSU soil model forecast rows | The soilconditions table marks forecast rows | Checked October 24, 2026: forecast rows carry no soil values | No |
| **Open-Meteo** forecast API | Hourly modelled soil temperature at 0, 6, 18 and 54 cm, up to 16 days ahead, plus up to 92 past days; °F on request | Yes, CORS open, no key. Free for non-commercial use up to 10,000 calls a day; data CC BY 4.0, attribution required | **Yes**: the forecast, adjusted to the station |
| NOAA USCRN | Soil temperature at 5 and 10 cm at a handful of reference stations | Static files on ncei.noaa.gov, reachable but sparse for Michigan | No: MSU's network is far denser |

Not reachable or not usable: the Enviroweather Terms of Use PDF linked from its registration form returns 404 (checked October 24, 2026). Open-Meteo could not be called from this build environment (the shell's network allowlist blocks it), so its response shape is coded to the documentation and exercised with stand-ins; the first real-browser check should confirm it.

### Permission and load

The MSU API is the one MSU's own site uses, not a documented public API. The page uses it the way that site does (the same guest token, one visitor at a time), caches each station's answer in the visitor's browser for 3 hours, credits MSU Enviroweather in the answer, the sources and the structured data, and links every station to its MSU record. **Recommended before launch: Chris emails eweather@msu.edu** to say the page exists and ask whether they are content with it, or would prefer a different route. If the API changes or refuses, the page falls back to the station's history and says the live reading could not be loaded; nothing breaks.

## 2. The planting temperatures

Only MSU's two sentences, already quoted on What to Plant Now, from *How to Plant Vegetables* (MSU Extension, updated April 29, 2009):

- "Beets, carrots, radishes and turnips, on the other hand, will germinate at a minimum of 40°F." → **40°F or warmer** (inclusive: "a minimum of").
- "Seeds of warm season crops germinate poorly in cool soil ... will not germinate well unless the soil temperature at planting depth exceeds 60°F." → **above 60°F** (strict: "exceeds").

No 50°F or 65°F line was added: no Michigan source for them was read. For 60°F crops the page also applies MSU's other condition, "after the danger of frost is past", using the same reading as What to Plant Now (the nearest frost station's 25 percent date) and shows the later of the two dates.

**Depth.** "Planting depth" for these seeds is under 2 inches, so the page uses the station's 2-inch sensor and lists the 4-inch reading beside it. A day's figure is the average of its low and high.

## 3. The rule (the site's own, disclosed on the page)

MSU gives temperatures, not a rule for a day. A first-warm-day rule is misleading in Michigan: at Albion in 2017 the 2-inch soil first averaged 40°F on March 1 and did not stay there until March 23. So:

> The soil counts as warm enough from the first day its daily average stays at 40°F or more (or above 60°F) for the rest of the data: the rest of the forecast this year, or through June 30 for past springs. It must stay at least 3 days.

The same function (`MISoil.settled`) computes live dates and history, so the two can be compared directly.

**Live states.** Ready (settled within the measured days and the forecast keeps it there), Forecast (settles inside the 16-day forecast), Cooling off (warm now but the forecast drops below), Not yet (does not settle within the forecast), Next spring (August to December), Typical spring (no live reading: the station's history only).

## 4. The forecast adjustment

Model soil temperature drifts from a station by several degrees (soil type, cover, the model's own land surface). The page asks Open-Meteo for the station's own coordinates with 7 past days, averages each day's 24 hours (a day needs 20), and shifts the whole forecast by the mean of (station − model) over the last 7 days both have (at least 3). The shift is printed in the answer; above 8°F the page says to treat the forecast loosely.

**Accuracy is not measured.** Open-Meteo's archive of past forecasts could not be reached from here, so there is no backtest of the adjusted forecast against later MSU readings. The page says this and calls dates more than a week out rough. A backtest (historical-forecast API against the committed MSU record) is the obvious next step.

## 5. History: 11 springs of measured soil

`scripts/fetch-msu-soil-history.mjs` downloaded Mar 1 to Jun 30 for 2016 to 2026 at every station active in 2026 (one request at a time, half a second apart; about 1,100 requests, once). `data/garden/msu-soil-2in-daily.json` keeps the 2-inch daily averages (tenths of a degree). `scripts/build-soil-history.mjs` builds `public/assets/garden-tools/michigan-soil-data.js` from it, offline and deterministically; the gate rebuilds it and compares byte for byte.

Quality checks before any date is worked out:

1. Days outside 10 to 110°F are dropped (37 days).
2. Days more than 12°F from the median of the five nearest reporting stations are dropped as sensor faults (1,025 days). Across all days the median gap to neighbours is 1.7°F, the 95th percentile 7.3°F and the 99th 11.8°F, so 12°F sits beyond normal regional differences. The flags cluster in a few station-springs (Verona 2019: 94 days; Oshtemo 2017: 70; Bainbridge Center 2023 and 2024: 58 and 56), the signature of a failing sensor, not weather.
3. A spring is kept only with at least 110 of 122 days, no gap over 7 days and no more than 10 fault days. 885 springs kept, 72 dropped. Dropped springs are left out, never filled.

### What the record says

Of the 100 active stations, 99 have at least one usable spring and 91 have five or more (the page draws a typical band only with five).

| | 40°F or warmer | Above 60°F |
|---|---|---|
| Middle station date (91 stations) | **April 7** | **May 26** |
| Most stations (10th to 90th percentile) | March 27 to April 13 | May 21 to June 8 |
| Earliest station | South Haven, March 19 | Cassopolis, May 14 |
| Latest station | McMillan / Newberry, April 24 | Hawks, McBain and Petoskey, June 16 |
| Earliest year (middle of all stations) | 2021, March 23 | 2024, May 15 |
| Latest year | 2020, April 23 | 2019, June 14 |
| Spread at one station, earliest to latest spring (median) | 29 days | 26 days |
| Station-springs that never settled by June 30 | 0 of 885 | 0 of 885 |

Two things follow. The year moves the date about as much as the place does, so a calendar date is a weak stand-in for a reading. And for warm-season seed the soil is usually the later condition: at 72 of the 91 stations the middle 60°F date falls on or after the nearest frost station's cautious date (by a median of 7 days; the range runs from 21 days before to 28 days after).

The Upper Peninsula has four soil stations, all with nine or more springs (Chatham, Escanaba, McMillan / Newberry and Stephenson); the Sault Ste. Marie area is 63 miles from the nearest of them.

## 6. Canonical gate (docs/SEARCH_STRATEGY.md)

1. **Distinct decision:** "is my soil warm enough yet, and when will it be" for a Michigan town, answered from measured stations. The calendar and Plant Now ask for a reading; they do not supply one.
2. **Evidence:** qualitative, new live tool. The hub's existing "Is the soil warm enough to plant?" link goes to the national page, which has no Michigan station data. Unique utility: ~100 measured stations, a station-matched forecast and 11 springs per station.
3. **Cannibalization:** registered as `soil-temperature` under the "Michigan planting timing" group (owner `planting-calendar`); the national soil-readiness page remains the U.S. owner.
4. **Network fit:** linked from the hub catalogue, the hub's soil field (with the visitor's town), and onward to Plant Now (with the reading), frost dates and tomatoes. Registry relationships added.
5. **Entity:** Chris Izworski Person `@id` as author and creator.
6. **Discovery:** canonical, sitemap, hub link, indexable.
7. **Measurement:** success is spring 2027 use, so the evaluation window is March 1 to June 15, 2027: Search Console impressions for Michigan soil temperature queries, and clicks from the tool into Plant Now (`data-growth-cta="soil-plant-now"`).

## 7. What it adds to hosting

No Vercel function, no build step, no scheduled job, no daily commit. One static page, two static scripts (about 55 KB of history, 10 KB of logic) and a data file used only by tests. Network calls go from the visitor's browser to MSU and Open-Meteo.

## 8. Limits

- One station stands for a town; the nearest can be far in parts of the Upper Peninsula (the page says so past 30 miles). A home bed can differ by several degrees.
- The adjusted forecast is unvalidated (section 4).
- The 3-day minimum and the "stays warm for the rest of the data" rule are this site's reading of MSU's temperatures.
- History starts at 2016 even where a station is older, to keep the download small; stations that started later have fewer springs, and the page says how many.
- Fall planting (garlic, cover crops) is not covered: no Michigan soil-temperature rule for it was read.
