---
name: design-reconnaissance
description: "On-demand public website design research, evidence comparison and optional Dembrandt analysis."
---

# design-reconnaissance

Use for major redesign inspiration or a request to inspect comparable public websites. [Dembrandt](https://github.com/dembrandt/dembrandt) can extract computed tokens, but it is optional and is not installed by this skill.

1. Record the current tool's first screen and visitor job. Compare at least two other tools already on the site.
2. Inspect up to three relevant public reference sites, with URLs, access dates and desktop/mobile observations. Never claim a page was visually inspected when only text was available.
3. Record observed typography, spacing, color roles, focus states, layout density, motion and content-first hierarchy. Separate computed CSS values from estimates.
4. Develop two original design directions that solve the visitor task differently. Do not clone third-party layout, assets, brand, copy or CSS.
5. Validate a changed-state interaction, mobile map behavior, screen-reader semantics, ad placement and performance.

Run Dembrandt only on a specific authorized public target when its CLI/browser is available. Read current upstream setup first. Do not install browser runtimes, add `.mcp.json` entries or import generated theme tokens without separate permission. REA remains a separate owner-request-only skill.

Examples: Lake Superior Circle Tour map-first redesign; Michigan Snow Totals first-answer hierarchy.

## Release rules

Read `AGENTS.md`, the owning repository's tests, Experience OS, Experience Investment and Foundry before substantial implementation. This skill is a specialist extension, not a replacement for those systems. Preserve scientific source truth, canonical/Person, Google Auto ads, accessibility, performance and repo ownership. No skill grants permission to install a package, alter deployment, publish, register MCP, scrape private sites or auto-merge.

Compare two materially different approaches, including the smallest capable technology. Explain the specific visitor decision and the tradeoff against two existing site tools. For an implementation, verify at 390px and 1280px, with keyboard, reduced motion, no-JS fallback and real-browser QA where available. Run relevant tests and the full `npm run verify:all` gate. Mark unavailable checks NOT VERIFIED. Do not auto-merge.
