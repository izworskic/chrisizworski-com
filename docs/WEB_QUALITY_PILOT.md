# Web Quality skills and targeted QA pilot

Six adapted local skills from [Addy Osmani's Web Quality Skills](https://github.com/addyosmani/web-quality-skills) (MIT): web-quality-audit, web-quality-performance, web-quality-core-web-vitals, web-quality-accessibility, web-quality-seo and web-quality-best-practices. Copied identically for Codex, Claude Code and Copilot. These are on-demand skill instructions, not a production library, service, or upstream CLI installation.

## Browser pilot

The path-scoped GitHub Action `.github/workflows/web-quality-pilot.yml` uses isolated, pinned Playwright, axe-core and Lighthouse CI tools on three owned local pages: Michigan Adventure Finder, Michigan Snow Totals and Michigan Ski Hills. Browser checks cover 390px/1280px, useful HTML answer structure, canonical metadata and critical WCAG 2.2 tagged issues within main. Michigan Ski Hills is checked as generated static HTML with its live operator API unavailable; a separate browser suite checks dated, undated and failed source responses. The Lighthouse CI run reports lab performance, accessibility, best-practices and SEO scores, failing only critical metadata audits. Existing legacy issues are reported, not silently described as passing. Compare actual production traffic and field metrics separately.

The action is manual or path-triggered. It consumes GitHub runner minutes but uses no new Vercel Functions, paid API, Redis, production npm dependency or cloud service. Artifacts are ephemeral and exclude visitor data. Run focused tests, existing Playwright regressions and `npm run verify:all` in the owning repository before approving a merge.

## River pilot in its own repository

`izworskic/national-rivers` independently owns the national river API. A developer-only Python script there uses the optional USGS `dataretrieval` package for a station-level daily discharge evidence report. No replacement for the existing JavaScript continuous feed, no live query in CI, and no visitor-facing changes. Installation of optional developer packages and access to live USGS services require an explicit operator action. Source: https://github.com/DOI-USGS/dataretrieval-python (USGS public domain as applicable).
