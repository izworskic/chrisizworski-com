---
name: stitch-concept-review
description: "Explicitly requested Google Stitch visual concept evaluation with an offline design fallback."
---

# stitch-concept-review

Use only when the owner explicitly says Google Stitch or requests Stitch concepts. Source: [Google Stitch skills](https://github.com/google-labs-code/stitch-skills), Apache-2.0. A GitHub URL is not a verified MCP connection. Do not register Stitch MCP, add credentials or imply a session was run without an authorized working integration.

1. Read Experience OS and Experience Investment first. Identify the current visitor problem, the owning implementation and two distinctive alternatives.
2. At least one proposed direction must be producible locally without Stitch.
3. If Stitch was specifically requested and a functioning authorized connection exists, follow the upstream current skill for design exploration only. Preserve source rights and record generated asset origins.
4. Judge concepts on first-screen clarity, mobile flow, keyboard access, map behavior, real-source data, originality, Auto ads and technical cost, not visual polish alone.
5. Do not publish generated HTML directly. A chosen concept must be reimplemented in the simplest supported stack, tested and reviewed.

If no verified connection is available, present the two alternatives using local methods and mark Stitch execution NOT VERIFIED.

Use cases: winter conditions desk, Cuyahoga ship-watch experience. Ordinary bug fixes need neither Stitch nor this skill.

## Release rules

Read `AGENTS.md`, the owning repository's tests, Experience OS, Experience Investment and Foundry before substantial implementation. This skill is a specialist extension, not a replacement for those systems. Preserve scientific source truth, canonical/Person, Google Auto ads, accessibility, performance and repo ownership. No skill grants permission to install a package, alter deployment, publish, register MCP, scrape private sites or auto-merge.

Compare two materially different approaches, including the smallest capable technology. Explain the specific visitor decision and the tradeoff against two existing site tools. For an implementation, verify at 390px and 1280px, with keyboard, reduced motion, no-JS fallback and real-browser QA where available. Run relevant tests and the full `npm run verify:all` gate. Mark unavailable checks NOT VERIFIED. Do not auto-merge.
