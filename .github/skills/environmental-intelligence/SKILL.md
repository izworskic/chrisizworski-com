---
name: environmental-intelligence
description: "Use when improving weather-driven engines, shoreline microclimate, precipitation, icing, cloud, wind or atmospheric model interpretation. Not for simply displaying an unchanged official forecast."
---

# Environmental Intelligence

Proposed first pilot: Beach Real Feel. This is an engineering workflow, not an installed runtime or a claim of improved results.

## Workflow

- Start with the current engine, station observations and official NWS/NOAA products. Identify the visitor decision, required variables, valid time, issue time, vertical level, spatial resolution, units and forecast horizon. Check the product actually covers the geography and period.
- Compare existing JS, offline gridded analysis (Xarray and MetPy), and Herbie retrieval of appropriate archived model subsets. Only retrieve needed variables, region and hours; verify upstream terms, costs and archive availability. No request-time GRIB downloads.
- Distinguish observation, forecast, reanalysis and derived estimate. Convert wind/temperature units explicitly; handle missing water temperature, land/water masks, grid-cell mismatch, wind direction and UTC/local rollover. Never call a grid estimate a measured beach reading.
- For shore feel, compare paired shore/inland observations at matching times and conditions against the current model and simple baseline. Use blocked date/site validation, report MAE, bias, sample coverage and limitations. Without appropriate validation, retain the current method or describe uncertainty; do not claim improved accuracy.
- Deliver a source ledger, reproducible fixtures, unit and boundary tests, evaluation and fallback before any reviewed product change.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Scope this skill to the authorized task, preserve source rights, canonical Person/URLs, Auto ads, existing dependencies and owning-repository release gates. No new route, cron, paid service, database, push notification, or package install is authorized by loading this skill. Use skill-eval for adoption, compare against baseline, record unrun tests as NOT VERIFIED, and open a reviewed PR; do not auto-merge.

## Upstream references

- [Unidata/MetPy](https://github.com/Unidata/MetPy)
- [blaylockbk/Herbie](https://github.com/blaylockbk/Herbie)
- [pydata/xarray](https://github.com/pydata/xarray)

Reference only; no upstream code is vendored. Verify license, maintenance, compatibility and data rights at the selected revision before any implementation adoption.
