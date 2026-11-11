# Michigan Ice NWS forecast reliability hotfix — 2026-11-11

Live symptom: `/api/ice-now?region=saginaw-bay` returned HTTP 200 with `forecast:null` while the Saginaw Bay UI displayed “The NWS forecast signal could not be retrieved.” The existing `/api/ice-now.js` forecast path had not changed since October 25, so this was not introduced by Sprint 8. Independently sampled NWS `/points/43.76,-83.86` resolved official `DTX/33,97`; its `/forecast/hourly` returned 404 while its NWS `/gridpoints/DTX/33,97` gridded raw product was available, with current updateTime and named validTime intervals.

## Repair
Preserve NWS `/forecast/hourly` as the first choice. When it returns 404 or inadequate coverage, resolve the exact same NWS point's `forecastGridData` URL, parse source-published temperature/wind intervals with true Fahrenheit/mph conversions, and count only explicitly covered hours. Require a fresh official grid update (24h) and at least 72 contiguous hours; otherwise return `null` rather than inventing ice, temperatures, or NWS readings. The API identifies the gridded fallback separately. No other tools, ice observations, photo assets, SEO or ad systems are changed.

## Gates
`node --test tests/ice-nws-grid-fallback.test.js`; `npm run verify:all`; preview and production endpoint must have a non-null `forecast.next72h` with a real source and wind; if the upstream changes, fail closed. Add production API data check to deployment release gates.
