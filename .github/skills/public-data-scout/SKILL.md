---
name: public-data-scout
description: "On-demand trustworthy public API discovery, provenance, licensing and observation-freshness validation. Use when a new real-world feed or API is proposed for a tool, before any code depends on it."
---

# public-data-scout

Use before adding a new external data source to a science, map, travel or event decision engine. [public-apis](https://github.com/public-apis/public-apis) is a discovery index only, not an authority on data quality. Firecrawl or Browser Use may assist research if they are already connected and separately permitted, but not production scraping.

1. Define required fields, precision, units, spatial scale, date range, refresh cadence and the visitor consequence of wrong data.
2. Prefer source owners such as NOAA, NWS, NCEI, USACE, USGS, NPS or relevant Canadian agencies. Verify the publisher's actual endpoint, documentation, sample data, license, rate limits and coverage.
3. Keep a source ledger: origin, schema/version, access date, observation time, attribution and distribution rights. Distinguish observed, modelled, forecast, inferred and missing.
4. Test delayed timestamps, station gaps, empty feeds, timezone changes, unit conversion, rate limiting, revisions and source removal.
5. Compare existing bounded fetches or static snapshots before proposing a new job. No Redis, opaque paid service, per-visit scraping or credentials in the client unless independently approved.
6. Conclude ACCEPT, EXPERIMENT, REJECT or NOT VERIFIED with a fallback and honest user-facing freshness disclosure.

Example: beach shore-feel estimates need dated nearshore water, wind and air observations; a computed estimate must not be presented as a measured temperature.

A ChatGPT Firecrawl plugin is agent-side research assistance, not an authorized Vercel production data source.

## Release rules

Read `AGENTS.md`, the owning repository's tests, Experience OS, Experience Investment and Foundry before substantial implementation. This skill is a specialist extension, not a replacement for those systems. Preserve scientific source truth, canonical/Person, Google Auto ads, accessibility, performance and repo ownership. No skill grants permission to install a package, alter deployment, publish, register MCP, scrape private sites or auto-merge.

Compare two materially different approaches, including the smallest capable technology. Explain the specific visitor decision and the tradeoff against two existing site tools. For an implementation, verify at 390px and 1280px, with keyboard, reduced motion, no-JS fallback and real-browser QA where available. Run relevant tests and the full `npm run verify:all` gate. Mark unavailable checks NOT VERIFIED. Do not auto-merge.
