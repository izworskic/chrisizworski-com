# UP Travel: Investigation of 13 Previously Unmatched Waterfall Names
**Review date:** November 8, 2026  
**Owning site:** `chrisizworski.com`  
**Source contract:** `data/up-waterfall-uptravel-unmatched-identity-review-2026.json`  
**Visitor output:** Noindex `/upper-peninsula-waterfalls/atlas/`  
**Safety boundary:** Geographic source identity is not legal access or a parking/trailhead position.

## Visitor question and baseline

The November 8 index completeness pass collected 149 UP Travel indexed source URLs, retained 108 research entries and found 13 **waterfall-named** entries without exact normalized-name matches across 80 curated guide records, 161 Michigan GIS natural features, and 291 independent waterfall-name observations. Those 13 were not proof of new falls; they often contained county qualifiers, old spellings, umbrella names, former names or closure status qualifiers.

We investigated **all 13** through the original UP Travel listing, its own editorial source where available, state GIS county/stream, independently published geographical accounts, active NPS/Michigan Nature Association notices and existing curated-guide evidence.

**Result:**
- **6 existing visitor, regional or closure guide identities**: Falls River Falls, Greenwood/Bonanza, Hungarian, Munising (CLOSED), Presque Isle loop, Rudy Olson/Tannery (CLOSED).
- **4 supported alternate natural-feature names, but no cleared visitor route**: Big Pup Creek/Big Pup, Amasa Chipmunk/Net River, Forty Foot/Cliff, Powderhorn/Powder Horn.
- **2 distinct remote wilderness features with no verified current waterfall-viewing route**: Bulldog Falls in McCormick Wilderness and Siskiwit Falls on Isle Royale.
- **1 unresolved natural-feature identity**: unnamed Pinkerton Creek falls, potentially overlapping but not proven equal to an independently named Pinkerton Falls.
- **0 additional independently approved parking-to-viewpoint visitor routes, 0 new curated map destinations.**

These are 13 **source-name records**, not 13 newly discovered publicly accessible waterfalls.

## Results of the thirteen investigations

| UP Travel listing | Verdict | What the evidence supports | Outstanding access issue |
|---|---|---|---|
| Big Pup Creek Falls (#409) | Alternate name; research | Big Pup Falls on Big Pup Creek, Marquette County, independent name `ss:big-pup-falls` | Specialist says falls are on private property; no verified permission for bridge approach or whole creek corridor |
| Chipmunk Falls - Amasa (#723) | County-and-stream-qualified GIS identity | Net River, Iron County = Michigan GIS **#17**; **not** another Chipmunk Falls on Chipmunk Creek, Alger County **#205** | Tourism page expressly says no direct signed trail; parking/route not established |
| Forty Foot Falls (#799) | Alternate name; research | Cliff Falls on Cliff River, northern Marquette County; independent `ss:forty-foot-falls-cliff-falls` | Old directions pass a hunting club via unsigned forest roads. **Not** Rocky Forty Falls on Siemens Creek, Gogebic, Michigan GIS **#40** |
| Falls River Falls (#1300) | Existing group | Curated `falls-river-trail` already covers distinct Lower and Middle Falls; site also has separate Power House Falls | The tourism title describes a corridor, not one new natural feature or a cleared approach to unsigned Upper Falls |
| Greenwood/Bonanza Falls (#1699) | Existing guide alias | Curated `bonanza-falls`, Michigan GIS **#124**, Big Iron River, Ontonagon | No duplicate guide, no new tourism-derived parking |
| Hungarian Falls (#1919) | Existing three-tier group | Curated `upper-hungarian-falls`, `middle-hungarian-falls`, `lower-hungarian-falls`, Michigan GIS **#130** and **#134** | Umbrella listing is not a missing fourth waterfall |
| Munising Falls (Temporarily Closed) (#2830) | Existing **CLOSED** guide | Curated `munising-falls`, Michigan GIS **#200**, NPS current closure | NPS live conditions maintain closure after 2025 washout; September 2026 construction award does NOT reopen trail |
| Presque Isle Falls (#3333) | Existing river-loop area | UP Travel describes Porcupine Mountains Presque Isle River loop; site's Manabezho/Manido/Nawadaha guides represent distinct named falls | Umbrella title is not a fourth drop. Weather and current DNR trail conditions not independently cleared in this source-name audit |
| Rudolph Olson Memorial Falls (#3524) | Existing **CLOSED** guide | Rudy M. Olson = Tannery Falls, within MNA Twin Waterfalls Memorial Plant Preserve; site guide `twin-waterfalls-memorial-preserve`, natural GIS **#199** | **MNA currently prohibits ALL visitors**. Historic H-58, Nestor, Washington street instructions are not legal arrival |
| Siskiwit Falls (#3701) | Distinct remote natural waterfall | Isle Royale Siskiwit Lake outlet near Malone Bay, Keweenaw County. A **different Siskiwit Falls** is near Cornucopia, Wisconsin | No current NPS-verified complete waterfall viewpoint walk from a scheduled ferry/seaplane/boat landing; no road parking on island |
| Unnamed Falls - Pinkerton Creek (#4474) | **Identity unresolved** | UP Travel explicitly mentions Pinkerton Creek inside Porcupine Mountains; independent Pinkerton Falls name exists, but same tier/position unproven | Neither GIS feature identity nor legal official walking/parking route independently verified |
| Bulldog Falls (#5457) | Distinct wilderness waterfall | Upper Yellow Dog River corridor below Bulldog Lake, McCormick Wilderness; federal Wild & Scenic record confirms river's remote cascades, independent field account names Bulldog Falls | Wilderness route unmarked; historic tracks/stream fords and scattered roads are not an owner-signed arrival. Distinct from more accessible Yellow Dog Falls trail |
| Powderhorn Falls (#5815) | Alternate name; research | UP Travel's Powder Mill Creek near Bessemer matches Michigan GIS **#39** Powder Horn Falls, independent `ss:powder-horn-falls` | GIS natural-feature coordinate is not visitor parking/trail permission; unsigned access remains unverified |

## Crucial source-quality corrections

### Two distinct Chipmunk Falls

The site GIS includes **#17 on the Net River in Iron County** and **#205 on Chipmunk Creek in Alger County**. Amasa is in Iron County, and the UP Travel Amasa listing mentions Net River Road. The county/river context supplies a stronger crosswalk than substring equality. This is a confirmed geographic research match to the Iron County natural feature, **not** approved hiking access.

### Two unrelated Forty names

Forty Foot Falls (Cliff Falls) is a Marquette County Cliff River feature. Rocky Forty Falls (GIS #40) is on Gogebic County's Siemens Creek. These cannot be merged or navigated to as a shared site.

### Siskiwit is a geographic homonym, not a straightforward drive-to waterfall

UP Travel's Michigan Siskiwit Falls is on **Isle Royale National Park**, near Siskiwit Lake/Malone Bay. Bayfield County, Wisconsin maintains a **different** Siskiwit Falls near Cornucopia. Do not serve the Wisconsin county trailhead as a Michigan landing or interpret NPS campsite/portage records as a verified waterfall viewpoint.

### Closures override historical tourism directions

NPS conditions (checked November 8, 2026) show Munising Falls Trail still closed after the 2025 washout; September 3, 2026 award announced accessibility reconstruction expected to continue potentially into 2027. Michigan Nature Association currently says its Twin Waterfalls Memorial Plant Preserve is **closed to all visitors**, including the Rudy Olson/Tannery waterfall. Historic road approaches in archived tourism materials are not current legal travel instructions.

## Evidence sources and provenance

Every record in the machine-readable audit stores exact source URLs. Important independently checked support:

- [UP Travel 13-name index source](https://www.uptravel.com/outdoors-recreation/waterfalls/) and its original [indexed listing register](../data/up-waterfall-uptravel-indexed-listings-2026.json)
- [UP Travel Big Pup Creek & Bulldog editorial](https://www.uptravel.com/blog/post/nine-pet-friendly-waterfalls/) and [Big Pup Falls field report](https://www.waterfallsofthekeweenaw.com/big-pup-creek/big-pup-falls/)
- [UP Travel Amasa Chipmunk listing](https://www.uptravel.com/listing/chipmunk-falls-amasa/723/) and state [Michigan GIS Waterfalls](https://gisp.mcgi.state.mi.us/arcgis/rest/services/BaseMap/General_Geology/MapServer/7)
- [Forty-Foot / Cliff Falls independent field record](https://www.waterfallsofthekeweenaw.com/cliff-river/forty-foot-falls/) and [World Waterfall Database naming](https://www.worldwaterfalldatabase.com/waterfall/Cliff-Falls-13121)
- [Baraga County Falls River Trail public corridor description](https://www.baragacountytrails.org/trails/falls-river-trail)
- [UP Travel Greenwood/Bonanza](https://www.uptravel.com/listing/greenwood-bonanza-falls/1699/), [Hungarian](https://www.uptravel.com/listing/hungarian-falls/1919/), and [Presque Isle Falls area](https://www.uptravel.com/listing/presque-isle-falls/3333/)
- [NPS Pictured Rocks current conditions](https://www.nps.gov/piro/planyourvisit/conditions.htm) and [September 2026 Munising reconstruction announcement](https://www.nps.gov/piro/learn/news/2026-09-03-munising-falls-contract-awarded.htm)
- [MNA current Twin Waterfalls owner closure](https://michigannature.org/index.cfm?action=listing&fuseaction=locationgallery&listing=171)
- [Isle Royale Siskiwit listing](https://www.uptravel.com/listing/siskiwit-falls/3701/), [modern NPS Malone Bay-area hiking context](https://www.nps.gov/thingstodo/feldtmann-loop-section-3-hike-from-siskiwit-bay-to-island-mine.htm), and [Bayfield County Wisconsin different Siskiwit Falls](https://www.bayfieldcounty.wi.gov/waterfalls)
- [Federal Wild & Scenic Yellow Dog River record](https://www.fws.gov/rivers/river/yellow-dog) and [independent Bulldog Falls field account](https://www.waterfallsofthekeweenaw.com/yellow-dog-river/bulldog-falls/)
- [Pinkerton Creek unnamed falls listing](https://www.uptravel.com/listing/unnamed-falls-pinkerton-creek/4474/) and [Powderhorn Falls on Powder Mill Creek](https://www.uptravel.com/listing/powderhorn-falls/5815/)

In many cases a public source names a natural feature but does not publish a current legal visitor route. An absence of online proof of legal access does **not** itself prove the landscape is closed. We preserve *unknown* rather than asserting closure, except where the responsible land manager has expressly confirmed it.

## Implementation and decision

**Choice A: add thirteen new pins to the visitor planner. Rejected** because six duplicate existing guides/closure entries, four are aliases, two are difficult unmarked wilderness features and one is still geographically ambiguous.

**Choice B: a reviewed source-name evidence layer in the existing atlas. Selected**. Source-reviewed identities, confidence, source URLs, existing guide links, specific access barriers and deliberate GIS-comparison actions are made visible. Alias queries now find the corresponding record even when the UP Travel slug differs. No new line route, car GPS, public guide, sitemap or source-count inflation.

**Choice C: build one new guide for every research-only waterfall. Rejected**: no owner/agency-approved continuous visitor arrival evidence for these remote sites.

New `data/up-waterfall-uptravel-unmatched-identity-review-2026.json` contains 13 evidence cases; Python offline builder consumes it, validates every referenced guide/GIS/external ID and outputs atlas schema v3 while keeping 80+161+291+108 = **640 source observations**. Client-side research panel displays reviewed names, evidence limitations and safe links to existing guide or closure pages; reviewed GIS feature positions are shown only after an explicit research comparison, never auto-parking.

**Acceptance/rollback:** unit tests check all 13 cases and references, alias group counts, two independent Chipmunks, Cliff/Forty vs Rocky Forty, closures, map discipline, noindex/sitemap, and generator reproducibility. Chromium checks at 360/390/768/1440 for resolved-name search, 2 closures, research-only wilderness, identity comparison, zero added pins, and network failure. Run exact-branch full repository gates. Revert only this PR if needed. **No claims of better traffic, realtime openings, approved hiking or completed UP Travel 104-card directory enumeration.**

**Next strongest evidence investment:** first-party access research for Bulldog Falls and Siskiwit Falls (without using private field directions as authoritative) and definitive feature/county lookup for Pinkerton Creek's unnamed falls. Do not ask visitors to contribute sightings or require contacts. A new visit guide is eligible only after a current, publicly verifiable, land-manager-authorized start-to-finish arrival can be demonstrated.
