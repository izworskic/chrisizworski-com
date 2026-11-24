# ShoreFeel U.S. EPA coverage expansion
Date: 2026-11-24
Status: PR review; not live until merged

## Visitor job and baseline
A visitor should be able to type a named U.S. Great Lakes beach, select it on a map, obtain a recent and verified NWS land-area forecast when available, read the existing NOAA water and wind interpretation, and open the appropriate state swimming authority. Before this investment the U.S. page listed **16 curated locations outside Michigan**. The Michigan sibling tool has **50 in-depth field guides**; neither count is a comprehensive public-beach directory.

## Design alternatives
A. Generate an article and full field-guide card for every EPA beach, including boilerplate descriptions and inferred access. Rejected. More than 900 nearly identical articles would add thin indexed URLs, repetitive copy, questionable parking and access claims, long build times, and a poor small-screen selector.
B. Maintain one canonical U.S. explorer, preserve its 16 editorial detail guides, and add an EPA-sourced national shoreline directory searchable by name, county, state and EPA Beach ID. Keep a small result slice in the DOM and group map pins at lower zoom. Selected source records use the existing NWS / NOAA engine and clearly distinguish EPA inventory entries from verified park field guides. **Selected.**

The EPA locations are not converted into new canonical pages. Search selection is shareable with an existing \`?beach=epa-<id>\` URL and can be revisited without changing the existing SEO topology. Michigan also remains reachable through its deeper Beach Report; the U.S. directory now includes EPA Michigan records and a real Huron lake filter rather than a handoff-only state.

## Official input and evidence
1. **EPA BEACON 2.0, 2025 National List of Beaches**, public ArcGIS Beach Lines layer:
   https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/epa_beaches_program/FeatureServer/1
2. ArcGIS filter:
   \`year=2025 AND is_beach_act_beach='Y' AND is_historical='N' AND is_dormant='N' AND is_beach_access_private='N'\`, states IL, IN, MI, MN, NY, OH, PA, WI. Stable \`beach_id\` ordering with paginated official source queries. Convert each approved shore polyline to an **approximate midpoint of its longest component**. Do not imply this is a verified beach entrance, swim boundary, parking pin, land grid, or water station.
3. Exclude New York ocean and estuary entries by Great Lakes coastal county plus bounds. Exclude explicitly historical/private named records even if source flags are inconsistent. Exclude one Michigan county that has no Great Lakes coast. One popular Racine North Beach segment had no usable EPA geometry, so its EPA ID **WI721390** is retained with a separately sourced 2026 Wisconsin DNR beach-list coordinate:
   https://dnr.wisconsin.gov/sites/default/files/topic/Beaches/2026WisconsinBeachList.pdf
4. Result: **981 EPA entries**, including 567 MI and 414 from seven other Great Lakes states, sourced November 24, 2026. Plus 16 preexisting, separately selected editorial guides. Some names overlap, so never describe this as 997 *distinct physical beaches*.
5. Sources under \`data/shorefeel-epa-mi-2025.json\` and \`data/shorefeel-epa-other-2025.json\`, with the compact web artifact \`public/assets/shorefeel-us-epa-2025.json\` and its local deferred JS bundle. Ingest is a reviewed snapshot, not an untrusted runtime scraper or an undocumented nightly job.
6. **162 Michigan records** have no independently safe one-lake assignment based on their county. They are searchable under All beaches, EPA ID, county or state. A specific lake is withheld rather than guessed. Counties that clearly face a single Great Lake have a geography-derived lake label; these labels are not survey evidence.

The 2025 EPA inventory is a historical listing and **cannot prove a 2026 beach is open, supervised, monitored today or safe to enter**. It does not report bacterial results, water-quality sampling, swimming flags, dangerous currents, road access or parking. State agencies and posted notices govern those questions. Never display a seasonal listing as an actual current advisory.

## NWS and NOAA weather safety
- \`/api/shorefeel-us\` now recognizes only the static, allowlisted \`epa-<beach_id>\` entries; it does not accept arbitrary user-selected coordinates or fetch URLs.
- For any EPA shoreline center, first ask NWS /points. If it is marine, check **four nearby points approximately 1.4 km away** and accept only official \`type='land'\` with an allowlisted NWS forecastHourly URL. If none qualifies, present unavailable instead of a numerical forecast. No unofficial weather API or paid source.
- The existing NOAA GLSEA pixel analysis stays bounded, source-dated, and **cannot produce a numeric on-sand beach correction**. Official NWS apparent temperature remains an *area* forecast.
- The map's initial view uses count clusters. Selecting a named beach zooms to its mapped segment and opens one report. Neither a site-specific parking entrance nor swimmability is inferred.
- The first 48 matching results are in the list, with an explicit Show more control. All source entries remain queryable, countable and map-accessible.

## Experience OS, Foundry and technology fit
- Visitor task: quickly locate a named beach and know what the wind and forecast air may feel like, with honest constraints.
- Form: searchable geographic directory with an existing, selected-place evidence report. Not hundreds of extra cards or a new design skin.
- First-phone-screen action: search input, lake filter, selected report; compact source count and safety disclaimer.
- HTML/CSS: retained static canonical, Person schema, no-JS curated fallback, existing Auto ads behavior. JavaScript: simple local source bundle, bounded list and custom Leaflet clusters. Node API: extends source allowlist and land validation. **Python**: no visitor/data quality benefit for this fixed source import. **Rust**: no compute bottleneck; additional WASM unnecessary. **Java**: not used by the current Vercel deployment. No React map rewrite, Redis, new Vercel function, cron, account, paid API or external production database.
- Map preview and browser QA needed at 390px and desktop for search, lake Huron, API unavailable, source mismatch, marker selection, keyboard focus, history URL, tile fallback and large-result count.

## Release, maintenance and rollback
Preserve the 16 original detail pages, their canonical URLs, park links and sources, all 50 Michigan editorial pages and their BeachGuard integration, and the 30 Ontario pages. Keep the U.S. page's URL, sitemap and Person entity. Source claims use "EPA 2025 listed" and links to the official BEACON map rather than asserting a current beach status.

The two source JSON files are snapshot dependencies; a future refresh requires a reviewed import and count/provenance review. There is no untrusted scheduled EPA scrape. Roll back this single PR to restore the previous 16-curated U.S. explorer if browser or source regression is found. Reviewer must check full CI and deployed Vercel preview; no automatic merge without owner instruction.
