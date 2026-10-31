# Source-first research dossier (reviewed 2026-10-31)

This is **a source library, not an endorsement or license to reuse product UI/assets/data**. "Checked" means documentation was located and read in the 2026-10-31 research session; it does **not** mean a dynamic interface was clicked through, a site was screenshot-tested, or a third-party API/license was independently verified. Publication dates differ. Recheck current docs and licenses before integration.

## A. User-centered design and reusable systems

| Official/source reference | Finding and application | Important limit |
| --- | --- | --- |
| [GOV.UK Government Design Principles](https://www.gov.uk/guidance/government-design-principles) | Start with needs, design with data, simplify complex things, be consistent **not uniform**, iterate | Principles, not permission to copy layouts |
| [GOV.UK Design System](https://design-system.service.gov.uk/) | Patterns, components and an ongoing community/research contribution model | Different public-sector domain and visual language |
| [GOV.UK Service Manual](https://www.gov.uk/service-manual/design) | Prototype, study the entire user problem, iterate | Does not prescribe our own release protocol |
| [NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Reveal advanced controls after the primary answer instead of overwhelming first-time users | Old but foundational article; validate current task context |
| [NN/g Mental Models](https://www.nngroup.com/articles/mental-models/) | Users bring expectations; interactive novelty must have clear labels and familiar states | No excuse to suppress original design when it clarifies decisions |
| [USWDS + Section508](https://www.section508.gov/develop/accessible-design-using-uswds/) | Design tokens, accessible components, consistent terminology | Don't install USWDS wholesale |

## B. User experience references: observed affordances in official materials

| Product/reference | Mechanism to study | Limits and due diligence |
| --- | --- | --- |
| [NPS App](https://www.nps.gov/subjects/digital/nps-apps.htm) | Interpretive tours + route/amenity/accessibility context + offline guidance | The NPS app has its own offline content system; we cannot claim our site is offline-capable |
| [AllTrails trail previews](https://support.alltrails.com/hc/en-us/articles/37212870983700-Trail-previews-on-trail-pages) | Moving trail marker linked to elevation and 3D terrain | Trail data and map layers are proprietary/rights-protected; use only verified local route records |
| [AllTrails 3D maps](https://support.alltrails.com/hc/en-us/articles/37213898696340-How-to-view-AllTrails-maps-in-3D) | Opt-in 3D terrain instead of 3D forced on every view | Premium 3D is not a requirement |
| [AllTrails custom routes, updated 2026-10-29](https://support.alltrails.com/hc/en-gb/articles/37270479773204-How-to-create-custom-routes) | Route options and dynamic map/photo/graph context | Never pretend we have verified routing/access graph without building it |
| [Windy Weather Academy](https://www.windy.com/articles/38548) | Layer and time controls; model-specific forecast interpretation | Windy data/tiles are not an automatically reusable API |
| [Windy live menu](https://www.windy.com/menu) | Visible forecast update/reference information, model selection and overlays | Frontend content changes frequently; recheck |
| [NOAA nowCOAST](https://oceanservice.noaa.gov/facts/nowcoast.html) | Past observations and future forecasts in one map, with context | Source services have distinct licenses, timeliness and domain risks |
| [NOAA nowCOAST chart/service overview](https://www.nauticalcharts.noaa.gov/learn/nowcoast.html) | Time-enabled map layers, forecast point selection | Do not relabel raw model guidance as a verified local verdict |
| [USGS National Water Dashboard, 2026-10-09](https://www.usgs.gov/tools/national-water-dashboard-nwd) | Multi-station current water information tied to maps | Sensor presence does not equal coverage of every river/trail |
| [USGS Water Data](https://waterdata.usgs.gov/) | Historic/current data separation and API-supported evidence | A streamgage isn't a route-clearance authority |
| [Flightradar24 playback](https://www.flightradar24.com/blog/inside-flightradar24/playback-is-now-available-in-the-flightradar24-app/) | Scrubbable historical map and adjustable playback speed | Historical track != current live status; proprietary data |
| [Flightradar24 individual playback](https://www.flightradar24.com/blog/inside-flightradar24/updated-individual-playback-in-the-flightradar24-app/) | Contextual detail/elevation/speed graphs at selected position | Not a data license |
| [NASA Eyes interactives](https://www.nasa.gov/interactives/) | Optional time-travel/3D for phenomena that benefit from spatial storytelling | High complexity and device cost |
| [iNaturalist observation search](https://help.inaturalist.org/en/support/solutions/articles/151000169670-how-to-search-inaturalist-observations) | Spatial aggregation -> individual observations and provenance | Citizen science has reporting/detection bias and age constraints |

## C. Current platform, accessibility, performance and testing

| Source | Research conclusion |
| --- | --- |
| [React official installation](https://react.dev/learn/installation) | Gradual adoption is supported. A small React island is optional, not mandatory. |
| [D3 official overview](https://d3js.org/what-is-d3) | D3 is powerful low-level custom visualization; unnecessary for basic charts. |
| [Observable Plot](https://observablehq.com/framework/lib/plot) | Concise higher-level chart option when ordinary plots are enough. |
| [MapLibre docs](https://maplibre.org/maplibre-gl-js/docs/) | WebGL vector map engine; external tiles, attribution, CSS sizing, access checks still required. |
| [MapLibre examples](https://maplibre.org/maplibre-gl-js/docs/examples/) | Layer updates, markers, terrain, time sliders, and accessibility examples. |
| [deck.gl docs](https://deck.gl/docs) | Large data overlays and picking; optional and potentially heavy. |
| [Motion animation performance](https://motion.dev/docs/performance) | Prefer low-cost transform/opacity and limit heavy layout animation. |
| [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/) | Aim for WCAG 2.2 AA; keyboard, 24×24 minimum target with exceptions, pointer drag alternatives. |
| [W3C reduced motion guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) | Disable nonessential gesture-triggered motion when requested. |
| [MDN progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement) | Essential answer and links remain useful without JS/advanced APIs. |
| [Google Search Central CWV](https://developers.google.com/search/docs/appearance/core-web-vitals) | Real-user good thresholds p75: LCP <=2.5s, INP <=200ms, CLS <=0.1. |
| [web.dev responsive images](https://web.dev/articles/serve-responsive-images/) | Right-size photographs to devices for performance. |
| [web.dev INP guide](https://web.dev/articles/optimize-inp) | Manage main-thread work and responsiveness; lab ≠ field. |
| [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) | Deterministic browser screenshots, environment-specific baselines. |
| [Storybook interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing) | Story play functions can verify state changes; only add tooling when warranted. |
| [Storybook accessibility tests](https://storybook.js.org/docs/writing-tests/accessibility-testing) | axe automated audits help but do not replace manual testing. |
| [VS Code agent instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions) | Discovery depends on selected harness; root AGENTS, CLAUDE and Copilot path requirements differ. |
| [GitHub Copilot instruction support](https://docs.github.com/en/copilot/reference/custom-instructions-support) | Repository instruction format support differs by product/feature. |

## Research process for future work

1. Record the real visitor problem and at least **two external product references** in the experience brief. Check actual controls, not branding screenshots alone.
2. Record **source owner**, verified URL, publication/issued time if any, and date we checked it. If dynamic and not inspected, say "documentation-only".
3. For code/maps/images, verify license and technical conditions separately; a marketing page is not a license.
4. Use the `RESEARCH_RECORD.md` template for a reusable insight: visitor job, pattern, proof, limits, anti-pattern, adaptation, empirical follow-up.
5. Recheck before a substantial reuse; this library is **not** a current availability ledger.
