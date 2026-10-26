# Applying FIELD_GUIDE_V1 to a new project

## One-line handoff

**Use FIELD_GUIDE_V1 on [tool/page].** Use real destination photos, concise experiential storytelling, responsive map and condition handoffs, without changing ad systems. Build and validate directly; do not ask the site owner to manipulate code or photo assets.

## Implementation sequence for an engineering agent

1. **Locate owning repository.** Tools may be extracted from the central hub. Read the owning repo's AGENTS file and browse live page, route, screenshots and existing systems. No automatic modification of every tool that resembles this page.
2. **Write a 1-paragraph intent contract.** Exactly what will the visitor decide? Distinguish inspiration, current conditions, safe access and historical context. Do not launch an SEO clone of an existing live-decision tool.
3. **Curate destinations/experiences.** Each with verified real place, season, exact source/land manager, map location, meaningful one-sentence "the move", condition handoff and any access limitations. Don't fabricate available parking, operating hours or wildlife.
4. **Source images before creating cards.** Check license and author on each item, reject off-topic/flat photos, inspect crop at actual desktop/card/mobile dimensions. See PHOTO_STANDARD.md.
5. **Pick a *fresh* composition.** Apply the standard's concise first-screen principles. Don't paste a mechanical 20-card clone. Use the starter only as syntax/pattern examples. Keep the hero roughly within one-quarter to one-half of the first viewport, and put a useful choice alongside it.
6. **Integrate existing infrastructure.** Reuse current data engines, owner-provided CARTO config, site identity and canonical rules, not a new weather calculation or secret key. The example map will use OSM if the endpoint is absent.
7. **Run `npm test` in this folder.** Then run **owning repository's full CI** and any route-specific search, privacy, source and mobile tests. Add regression tests for the new integration.
8. **Real browser inspection:** 390×844 and 1366×900. Wait for/scroll to lazy images. Inspect each license credit, map coverage/pins/zoom, first-screen controls, ad interference, no JS fallback, and unique destination paths. Correct visually rather than trusting the status strings.
9. **PR, verify, merge and observe** under the owning repo's approval rules. Confirm Vercel/prod deployment and the public URL. Don't assert an SEO lift without dated GSC evidence.

## Porting this folder to its own repo

The entire `design-systems/field-guide-v1/` directory is **self-contained**. When a GitHub repository-create capability becomes available, make a new **private** repository called `field-guide-design-system`, copy this directory's contents into its root, retain `manifest.json` and `AGENTS.md`, run `npm test`, and adjust only the source-location pointer in the README. No production tool should depend on the new repository's moving branch by default. Pin version `v1.0.0`/commit SHA when importing.

## Ad and SEO firewall

This is a design-standard source package, **not a public site page**. Its starter is intentionally `noindex` and belongs outside `public/` until a real product is created. It does not modify sitemap, ads, auto-ads, identity, GSC, or your existing condition engines. No new SEO URL has been shipped by adding these source files.
