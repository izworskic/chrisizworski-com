# Mackinac Bridge Live launch scorecard

Build date: July 27, 2026 (America/Detroit)

This scorecard separates the tool build from the later site integration. The feature branch intentionally does not add the route to the Tools hub or sitemap. Those changes should happen only after the live preview is accepted and the pull request is ready to merge.

## Build-quality matrix

| Area | Weight | Current | Evidence |
| --- | ---: | ---: | --- |
| Immediate usefulness | 25 | 25 | Official status, clearly labeled nearby wind and gust context, two official cameras, NWS KAPX radar, 36-hour approach forecast, lane notes, and a vehicle-specific answer |
| Safety and data integrity | 25 | 25 | Official status is authoritative; no unpublished bridge-deck wind is inferred; nearby wind does not affect Crossing Confidence; failures return unknown instead of open |
| Search readiness | 20 | 17 | Intent-led title, description, canonical, WebApplication schema, FAQ schema, and exact search-question headings are complete; internal hub links and sitemap are intentionally pending |
| Experience and performance | 20 | 17 | Responsive controls, keyboard states, reduced-motion support, no client framework, and lightweight static assets are complete; production-preview visual signoff is pending |
| Measurement | 10 | 10 | Vercel Web Analytics, Speed Insights, and vehicle, direction, forecast, camera, alert, and refresh interaction events |
| **Total before integration** | **100** | **94** | The remaining six points are the preview visual signoff and the later Tools/sitemap integration |

## Live-data acceptance gates

| Gate | Requirement |
| --- | --- |
| Official status | Read the current Mackinac Bridge Authority WordPress condition payload and normalize open, advisory, escort, partial, closed, or unknown |
| Nearby wind context | Choose the freshest usable NOAA observation from Mackinaw City or Mackinac Straits West and never present it as a bridge-deck reading |
| Forecast | Return at least 24 hourly NWS approach periods when the feed is healthy, merge grid-based gust data, and avoid predicting future bridge restrictions |
| Radar | Load the official NWS Gaylord KAPX precipitation loop with an interactive-radar fallback and an explicit non-wind disclaimer |
| Safe outage behavior | Never fall back to “all clear”; expose unavailable sources and cap confidence when official status cannot be confirmed |
| Camera | Load official St. Ignace and Mackinaw City still images with a direct official-page fallback |
| Vehicle logic | Distinguish passenger vehicles from MDOT high-profile categories and give direction-specific escort queue instructions |

## Search-intent coverage

| Search intent | On-page answer |
| --- | --- |
| Mackinac Bridge conditions | Official status hero and current condition message |
| Is the Mackinac Bridge closed? | Live ribbon, status hero, and FAQ |
| Mackinac Bridge wind speed | Nearby NOAA sustained-wind and gust cards |
| Mackinac Bridge webcam | Two-view official camera section |
| Mackinac Bridge conditions for RV | Vehicle selector, personalized answer, threshold scale, and escort locations |
| Mackinac Bridge traffic today | Official lane notes, construction section, and Mi Drive link |
| Mackinac Bridge weather | Hourly NWS wind, gust, precipitation, and condition cards |
| Will the Mackinac Bridge close tomorrow? | Forecast threshold preview with an explicit no-prediction warning |
| Best time to cross Mackinac Bridge | Hourly approach-weather context plus an explicit warning that the tool cannot reliably forecast a best crossing window |

## Merge-day checklist

1. Review the Vercel preview at desktop and phone widths.
2. Confirm the live endpoint has official status, current wind, and at least 24 forecast hours.
3. Add the route to the Tools hub and Great Lakes live-tool cluster.
4. Add the canonical route to the primary sitemap and update the relevant modification dates.
5. Keep preview hosts `noindex`; verify the custom domain remains indexable.
6. Re-run the dedicated tests and the repository verification suite, separating any pre-existing guardrail drift from this feature.
7. Record the launch date and begin 7-day, 30-day, and 90-day pageview, query, engagement, and Core Web Vitals checks.
