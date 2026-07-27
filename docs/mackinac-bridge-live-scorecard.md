# Mackinac Bridge Live launch scorecard

Build date: July 27, 2026 (America/Detroit)

This scorecard covers the finished tool and its search cluster. The live route, three supporting guides, site hubs, internal links, structured data, image sitemap, primary sitemap, and machine-readable site summary are included on the feature branch for review.

## Build-quality matrix

| Area | Weight | Current | Evidence |
| --- | ---: | ---: | --- |
| Immediate usefulness | 25 | 25 | Official status, clearly labeled nearby wind and gust context, two official cameras, NWS KAPX radar, 36-hour approach forecast, lane notes, Mi Drive approach events, tolls, driver assistance, and a vehicle-specific answer |
| Safety and data integrity | 25 | 25 | Official status is authoritative; no unpublished bridge-deck wind or best window is inferred; confidence is categorical and excludes nearby weather; failures return unknown instead of open |
| Search readiness | 20 | 20 | Intent-led metadata, canonical URLs, WebApplication/WebPage/Breadcrumb schema, visible question answers, three supporting intent pages, real-photo social preview, hub links, image sitemap, primary sitemap, and llms.txt coverage |
| Experience and performance | 20 | 19 | Responsive controls, keyboard states, reduced-motion support, no client framework, device-local status history, shareable selections, and lightweight static assets are complete; production-preview visual signoff remains a merge-day gate |
| Measurement | 10 | 10 | Vercel Web Analytics, Speed Insights, and vehicle, direction, forecast, camera, alert, refresh, share, classification, toll, and assistance interaction events |
| **Total before production preview** | **100** | **99** | One point remains for desktop and phone visual signoff on the deployed preview |

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
| Approach roads | Return nearby Mi Drive incidents and construction without claiming a bridge queue or wait time |
| History | Keep only device-local observations from the last 24 hours and label them as incomplete, non-official history |
| Fare logic | Apply the published lead-vehicle axle rate and the motorhome-towing-auto exception |

## Search-intent coverage

| Search intent | On-page answer |
| --- | --- |
| Mackinac Bridge conditions | Official status hero and current condition message |
| Is the Mackinac Bridge closed? | Live ribbon, status hero, and FAQ |
| Mackinac Bridge wind speed | Nearby NOAA sustained-wind and gust cards |
| Mackinac Bridge webcam | Two-view official camera section |
| Mackinac Bridge conditions for RV | Vehicle selector, personalized answer, threshold scale, and escort locations |
| Mackinac Bridge traffic today | Official lane notes plus nearby Mi Drive incidents and construction within 25 miles |
| Mackinac Bridge weather | Hourly NWS wind, gust, precipitation, and condition cards |
| Will the Mackinac Bridge close tomorrow? | Forecast threshold preview with an explicit no-prediction warning |
| Best time to cross Mackinac Bridge | Hourly approach-weather context plus an explicit warning that the tool cannot reliably forecast a best crossing window |
| Mackinac Bridge toll | Interactive calculator plus a dedicated fare, towing, and payment guide |
| Mackinac Bridge driver assistance | Direction-specific request instructions, current cost and phone number, plus a dedicated guide |

## Merge-day checklist

1. Review the Vercel preview at desktop and phone widths.
2. Confirm the live endpoint has official status, current wind, and at least 24 forecast hours.
3. Confirm all four Mackinac routes and the real social-preview photograph render on the preview.
4. Keep preview hosts `noindex`; verify the custom domain remains indexable.
5. Re-run the dedicated tests and the repository verification suite.
6. Record the launch date and begin 7-day, 30-day, and 90-day pageview, query, engagement, and Core Web Vitals checks.
