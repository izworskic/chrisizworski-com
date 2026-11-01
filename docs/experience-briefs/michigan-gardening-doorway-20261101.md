# Michigan gardening: a doorway organized around questions

Owner: izworskic/chrisizworski-com. Canonical: `/michigan-gardening/`. November 1, 2026. Experience OS 1.2.1. Research/design revision in response to Chris's report that the planner crowded out the other tools.

## Evidence and implications

The October 24, 2026 Search Console export (last 28 days, Web) lists `/michigan-frost-dates/` at 1,082 impressions, 4 clicks and average position 9.26; its query list separately includes “when to plant tomatoes in michigan” (34 impressions) and “zone 6a planting schedule” (26 impressions). The export does not associate those query rows with individual page rows and omits long-tail queries; it is a dated signal, not current demand or a traffic forecast. The separate question-oriented entry points already matter. Google documents ranking fluctuations during significant URL changes: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes (checked Nov 1). Keep the existing hub canonical and indexed; do not move or duplicate it.

Checked Nov 1: MSU's [Michigan Gardening Calendar](https://www.canr.msu.edu/home_gardening/uploads/files/Michigan%20Gardening%20Calendar.pdf) groups recurring garden tasks by season, and [Minnesota Extension's gardening hub](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota) helps gardeners find different kinds of support rather than forcing one workflow. The [frost decision tool](https://chrisizworski.com/national-tools/frost/cover-plants-tonight/) is a forecast-based decision, whereas [Michigan frost dates](https://chrisizworski.com/michigan-frost-dates/) is historical probability. Their distinctions are important. Existing tools were checked by their actual public routes and the tool registry; no hypothetical product is advertised as available.

## Options

A: keep the detailed interactive planner as the first screen, adding more links or filters underneath. It rewards committed planners but leaves most gardening questions buried, the issue Chris identified. B: a compact question-led front door with immediately visible, directly linked tools grouped around planning, readiness, choosing plants, and saving seed; keep the complete existing planner in a clearly labeled native disclosure and preserve its `#plant-now` deep link. B is chosen. It shares evidence and quality principles with the site's planting calendar and seed lab, but differs materially: a routing task rather than a single tool's input, four editorial questions rather than a crop chart or two-plant comparator, direct accessible links, and a small optional keyword search.

This is not a new public route or a copied tool. The existing canonical, schema, all old guide links and full planner remain; opening a shared `#plant-now` link opens the planner. A `?place=` link without an anchor now starts at the hub; location is still loaded when the planner is opened. The available U.S. planting calendar remains clearly labeled. Browser-local plant lists are retained.

## States and failure behavior

With JS: the featured search filters twelve real tool links, announces matches, and restores all links on clearing. Empty searches must offer the complete guide catalogue. The planner is closed by default and expands with native disclosure; existing anchor links open it. Without JS all twelve featured links, native planner disclosure and existing guides work; dynamic planner tells visitors JS is needed. A missing photo cannot break the hub because no new images are required. No location or network request is made by the hub selector. Changed state, keyboard, old anchors, no-JS, responsive screenshots, forecast outage behavior already present in destination tools, full CI and production smoke are release checks.

## Next opportunities, not promises

A Michigan problem-finder for plant symptoms and pests, and a season-aware succession/bed-space planner deserve research before build; source reliability, local treatment guidance, query demand and ownership remain unverified. They are not shown as working tools. The national water tool exists but needs a separate quality review before it receives a primary recommendation here. Measure real engagement and direct-search landing after release; never infer an outcome from QA scores.
