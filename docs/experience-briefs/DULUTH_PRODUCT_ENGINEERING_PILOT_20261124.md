# Duluth: Product Engineering OS candidate pilot

Status: DRAFT, source-level implementation and acceptance tests only. Main 4e4f162e51eab2718ba3129e071f5617eb2ea6f1; owner approved candidate reference merge and controlled existing-tool pilot. No active skill change or independent behavioral evaluation claim. Production release requires full gate and real browser review.

## Locate and diagnose

Canonical https://chrisizworski.com/duluth-canal-park/ is owned by this repo. A visitor wants to know which passage to watch, whether the report is recent and what kind of ship is shown. Source audit: baseline local marker factory always draws one cargo silhouette for every AIS type and uses state-based widths. The existing API already provides normalized shipType and lengthMeters for both local vessels and passage candidates. Soo and Seaway use the same nine-type icon factory; Calumet/Cuyahoga reuse it. Duluth's unique next-watch, published forecast, cameras, bridge story and three viewpoints remain intact. Real rendered baseline, lab performance and visitor outcome are NOT VERIFIED. PR #1902 touches the movement engine; this pilot deliberately avoids backend changes.

## Route and choose

Three opportunities: typed vessel display (high confidence, small scope); map/camera decision sequence (defer until actual visitor evidence); arrival prediction calibration (defer to separate movement-intelligence work). Choose first. Alternative A is continuing the local cargo silhouette with a label; lower accuracy and a redundant factory. Alternative B is using the existing validated Seaway/Soo shared glyphs and keeping Duluth's state colors and popups; selected. Reuse proven browser JS/HTML/CSS. No new backend, Python, Rust or Java needed for a UI-only mapping defect. No new feed, dependency, paid service, cron, route, or ad/SEO changes except the existing freshness date and cache key. Scope limited; no blanket skill pass or reskin. Preserve source and arrival evidence, not a second prediction model.

## Prove

Baseline source uses one SVG for all vessel types. Candidate must return nine distinct shared SVGs for representative reported AIS categories; malformed and missing type stays unknown even for long vessels. Valid reported length determines display size, selected emphasis grows same vessel, speed unavailable is distinct from stopped; missing factory yields neutral question mark and text, never a guessed cargo icon. Existing camera actions, popup and local/candidate deduplication remain. Tests execute the actual marker adapter against shared factory and mocked Leaflet divIcon, not screenshots or a second classifier. Prior tests tied to old local SVG are replaced with semantic assertions. HTML/JSON-LD freshness and sitemap date synchronized; existing title, canonical, identity, ads and first answer untouched. Full repository gate and actual mobile/desktop fixture browser review pending; do not claim live correctness, full Experience OS acceptance or visitor lift. Explicit pilot release review required; no auto-merge.

Expected improvement: 1 baseline glyph to 9 distinct typed glyphs in deterministic fixtures. Not a measured visitor outcome. Real map screenshots and baseline/candidate interaction evidence still required. No recurring infrastructure or Vercel function additions.
