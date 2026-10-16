# Michigan rockhounding without photographs — NOAA Lake Superior context

**October 16, 2026.** Photos are optional for validation, not required to display independently measured offshore storm activity. Michigan EGLE recommends rockhounding *after* storm/wave events, but specifically cautions against approaching the shoreline during high wave action: https://www.michigan.gov/egle/public/learn/geology/rockhounding

## Existing working photo-free signals

The repository already has GLOS Grand Marais Spotter SPOT-1361 live observed offshore waves (significant height, wave direction, mean period, peak, decline/rebuilding and source freshness), a 5,243-measurement 2026 history and eight well-sampled offshore storm groups. It separately checks current NWS marine/shoreline alerts. The research-only historic relative activity comparator uses an Hs-squared times mean-period integrated *proxy*, not physical wave energy flux, predicted agate exposure, or surf at Bayshore Park.

## New independent primary-source gauge

NOAA station **9099018 Marquette C.G., Michigan** (46.5456, -87.3786) exposes actual six-minute water levels in **meters, IGLD 1985**, including original provisional readings on October 14, 2026. Example original source value: **183.424 m at 00:00 UTC**. Original-source API: https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=20261014&end_date=20261015&station=9099018&product=water_level&datum=IGLD&units=metric&time_zone=gmt&format=json&application=ChrisIzworskiRockhounding . NOAA station: https://tidesandcurrents.noaa.gov/stationhome.html?id=9099018

**Important locality warning:** NOAA station 9099090 is **Grand Marais, Minnesota**, not Grand Marais, Michigan. No verified NOAA gauge is at Agate Beach; Marquette's level is remote regional context and not its instantaneous beach waterline, wave runup or localized seiche. The source registry enforces identity, original IGLD datum, units, source time and conservative no-safety flags.

The new bounded NOAA adapter checks response station/GPS, quality/invalid records, source recency, gaps, a 24-hour reference near the actual source reading, and fails closed on missing data. It is added **independently** to the same Vercel research endpoint as GLOS waves and NWS alerts. NOAA source outages cannot hide real buoy readings or an active marine warning. A compact Marquette lake-level and 24-hour change panel appears beneath the existing wave summary and identifies it as remote context, not a local beach reading.

## Explicit publication boundary

None of these inputs proves new agates, safe shore access, collecting permission, local breaking-wave height or a visitor 'green light'. EGLE's general post-storm advice is a useful rationale for tracking *wave events*, not a validated prediction for a particular Grand Marais pebble bed. The 2014 chart research facing angle, unverified shoreline, sheltered harbor and remote lake-level gauge remain scientifically separate.

No ad, indexed URL, photo requirement, API key, or paid service change. Tests cover source station confusion, 24-hour trend with missing data, independent NOAA outages, existing waves/NWS behaviour, and the noindex research UI.