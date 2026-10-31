# Issue 1258 Batch 30 — Lepisto Falls official NCT hike and Iagoo identity gate
Reviewed 2026-10-31. No outreach. **One public state-park guide, one noindex geographic research page**.
## Verified Lepisto #79
- Michigan state waterfall GIS #79 46.658637,-89.940270 agrees with Western U.P. visitor brochure Lepisto 46.659062,-89.940555 within ~52m; natural falls not parking. Sources https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7, https://explorewesternup.com/wp-content/uploads/2026/04/WaterfallMapBro_2022_Drft6-opt.pdf.
- Official https://northcountrytrail.org/files/chapters/nmk/NMK-Segment-Guide-2025.pdf Ni-Miikanaake chapter (2025) documents **County Road 519 NCT trailhead parking**, NCT crossing east of road into Porcupine Mountains Wilderness State Park and named Lepisto Falls on public trail segment MI-008, with a rope-assisted steep climb after bridge NORTH of falls. No parking coordinates invented.
- Western U.P. regional https://explorewesternup.com/wp-content/uploads/2026/04/WaterfallMapBro_2022_Drft6-opt.pdf provides 0.6 mile NCT plus 0.2 mile falls-side path; estimate 1.6mi return, condition-dependent. https://www.michigan.gov/recsearch/parks/porkies official DNR park road season and passport information. https://northcountrytrail.org/the-trail/trail-alerts/ for current restrictions; road crossing traffic, mud/winter conditions. No open-now claim.
## Iagoo #86, hold
- State GIS #86 46.691604,-89.970696, regional map Iagoo 46.662334,-89.941527, about 3.9km difference, latter ~0.4km from Lepisto. NCTA describes Lepisto route but no specific Iagoo visitor side trail.
- Six source-linked access/identity checkpoints; opt-in research popup links to nonindex `/upper-peninsula-waterfalls/research/iagoo-falls/`. No Iagoo public parking, route, schema or sitemap.
## Engineering
New Lepisto HTML-first park interpreter guide and five-source visitor check, CARTO natural location map, NCTA source links; curated hub/search/save/arrival card + ItemList, sitemap; GIS ledger/reconciliation, research queue, regression. Prior batch28/29 assertions updated to remain true as inventory grows. No ads or unrelated SEO changes.
Post-batch: **65 curated / 60 exact GIS links / 101 remaining / 64 waterfall sitemap locs incl hub**. Draft PR not merged; runtime Node/Chromium/full build and Vercel must pass before release.
