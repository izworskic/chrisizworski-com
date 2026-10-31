# Inspiration library — extract the mechanism, never clone the screen

**Research date: 2026-10-31.** Most examples below were verified from **official documentation**, not a complete current-browser usability audit. Treat patterns as hypotheses until a local prototype is tested. Product names identify references, not sponsors or authorized source-data providers.

## Visitor task patterns, evidence and application

| Ref | Example and observed mechanism | Adapt to this site | Do **not** borrow |
| --- | --- | --- | --- |
| I01 | [AllTrails trail preview](https://support.alltrails.com/hc/en-us/articles/37212870983700-Trail-previews-on-trail-pages): progress marker changes location along route as preview plays; elevation context | Porcupine Mountains: select verified trail; compare actual distance, climbing and parking location; map highlight follows route | Unverified hiking line, proprietary trail graphics, auto-play 3D on mobile |
| I02 | [AllTrails custom routes](https://support.alltrails.com/hc/en-gb/articles/37270479773204-How-to-create-custom-routes): route changes propagate to photos and graph | Circle Tour: stop selection affects map, visit sequencing and verified alternatives | Fake drive-time or trail routing when road graph unavailable |
| I03 | [NPS App](https://www.nps.gov/subjects/digital/nps-apps.htm): self-guided visitor experience plus amenities, access and alerts | Photo-led destination sequence with sourced access notes, directions, sensible time budget, interpretive copy | Claiming offline access/park authority |
| I04 | [Windy](https://www.windy.com/articles/38548): switch map layer, then timeline and detailed local forecast | Lake-effect snow: one visible time control drives map and location verdict with observed vs forecast label | 48 unrelated switches overwhelming the first answer |
| I05 | [NOAA nowCOAST](https://oceanservice.noaa.gov/facts/nowcoast.html): observation animation vs upcoming forecast layers | Weather/ice: user can inspect recent trend vs future guidance, with time-window distinction | Treating weather model layers as precise on-the-ground observations |
| I06 | [USGS National Water Dashboard](https://www.usgs.gov/tools/national-water-dashboard-nwd): map + measured hydrology with stations | Rivers, waterfalls, freeze-up: observation markers reveal site/date/unit, trend and coverage | Extrapolating a single station to an unmonitored trail or lake |
| I07 | [Flightradar24 playback](https://www.flightradar24.com/blog/inside-flightradar24/playback-is-now-available-in-the-flightradar24-app/): time scrubber and adjustable movement history | Vessel/rocket launch: rewind verified event states; visual track + time label and last observed status | Confusing playback with live prediction or copying tracking data |
| I08 | [NASA Eyes](https://www.nasa.gov/interactives/): 3D + time travel makes orbital relations visible | Rocket launch viewing: optional ground geometry, compass bearing and altitude if authentic and useful | Full 3D experience before source-backed launch date/pad/visibility |
| I09 | [iNaturalist Explore](https://help.inaturalist.org/en/support/solutions/articles/151000169670-how-to-search-inaturalist-observations): density summary zooms into evidence points | Wildlife seasonal tools: records by date and distance, observation age, observer effort caveat | Implying no observations means species absent |
| I10 | [GOV.UK principles](https://www.gov.uk/guidance/government-design-principles): consistent patterns, not uniform visual outcomes | Shared source labels, controls and mobile reliability across distinct layouts | Uniform green boxes or repetitive heroes |
| I11 | [Playwright visual testing](https://playwright.dev/docs/test-snapshots): actual screenshots catch presentation changes | Compare 390px and desktop with loaded maps, toggled filters and deep scroll | Calling a test green without running it |
| I12 | [Google CWV](https://developers.google.com/search/docs/appearance/core-web-vitals): measurable field metrics | Make perceived interaction speed a design acceptance criterion | Assuming one Lighthouse score equals field performance |

## Distinct experience families (do not turn into universal templates)

- **Destination explorer:** interpretive photo/overview → choose outing → map/trail/parking linked → verified access and alternative. Example: Porcupine Mountains.
- **Live operations:** current event/position with last-seen timestamp → map and chronological history → next opportunity and unknown-data state. Example: Soo Locks, winter freighter layup.
- **Time-window forecaster:** primary local verdict → time scrubber + relevant layer → compare nearby windows → confidence/age. Example: lake effect, meteor visibility.
- **Living nature calendar:** stage/observation evidence → time and geography → where to watch ethically → season reset. Example: bird arrivals, waterfall seasons.
- **Field guide:** a compact evocative introduction → photograph and narrative → interactively explore authentic locations → specialist tool for real decision. Example: Michigan after dark.
- **Route and travel choice:** user intent + constraints → compare realistic options with verified start/end/access → route and plan → failure/closure alternative.

## Interaction quality test

For each family, identify a single meaningful variable to change and the resulting changed **answer**, rather than just a moving interface. Example: changing "hike length" changes the verified shortlist, highlighted route and parking context; it does not merely recolor a decorative chip.

## Accumulating evidence after releases

Add entries as `I13`, `I14`, etc., with: exact sourced example, checked date, what was genuinely observed, legal/API limits, which local implementation adapted it, PR or demo, tests, outcome and mistakes. A failed approach is useful evidence. **Do not claim the local adaptation exists before its code and deployed behavior are verified.**
