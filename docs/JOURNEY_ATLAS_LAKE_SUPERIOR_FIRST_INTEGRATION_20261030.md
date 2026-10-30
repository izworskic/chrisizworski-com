# Lake Superior JOURNEY_ATLAS_V1 first-integration photography and phone finish

Date: October 30, 2026. Scope: the existing `/lake-superior-circle-tour/#journey-atlas`, plus the shared `JOURNEY_ATLAS_V1` mobile CSS. No new canonical, weather engine, map provider, tracking, ad settings, or route logic.

## Existing sourced photos reused
Old Woman Bay — Beckettlc, CC0; Apostle Islands Sea Caves — DataThread, CC BY 4.0; Lake of the Clouds — Stevenliuyi, CC BY-SA 4.0; Miners Castle — National Park Service, public domain; Tahquamenon Falls — Mojnsen, CC BY-SA 4.0; Isle Royale Todd Harbor — Todd VerBeek, CC BY-SA 4.0. Their credited Commons source records were already present on the original release.

## Four destination-specific additions

| Exact Commons file | Place depicted | Photographer | License | Verification |
|---|---|---|---|---|
| [Sleeping Giant Provincial Park.jpg](https://commons.wikimedia.org/wiki/File:Sleeping_Giant_Provincial_Park.jpg) | Sleeping Giant Provincial Park lookout | Coates4 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Commons photo summary, lookout description, license |
| [20150708 - 30 - Pukaskwa National Park, Ont. - Mouth of Hattie Cove as seen from Southern Headland Trail.jpg](https://commons.wikimedia.org/wiki/File:20150708_-_30_-_Pukaskwa_National_Park,_Ont._-_Mouth_of_Hattie_Cove_as_seen_from_Southern_Headland_Trail.jpg) | Mouth of Hattie Cove, Southern Headland Trail | Andre Carrotflower | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Commons photo summary, GPS and license |
| [Split Rock Lighthouse - Lake Superior MN.jpg](https://commons.wikimedia.org/wiki/File:Split_Rock_Lighthouse_-_Lake_Superior_MN.jpg) | Split Rock Lighthouse | Randen Pederson | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Commons photo description and Flickr license review |
| [Duluth Ship Canal-Lighthouse-1000 footer.jpg](https://commons.wikimedia.org/wiki/File:Duluth_Ship_Canal-Lighthouse-1000_footer.jpg) | Freighter at Duluth Harbor | Chris Light | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Commons file, previously cited in live Duluth Canal Park tool |

Each new image is linked to its author/source and exact license in a visible `figcaption`. It is a historical photograph; it does not imply that the road, park, marine route or ship status is currently accessible. Images are display-cropped in responsive CSS; source originals are not transformed.

## Presentation changes
At <=640px, use full-width photographs above readable text rather than 120px-wide images next to long paragraphs. Keep four clear actions: primary specialist tool, parent Circle Tour stop, add stop to existing itinerary, and official source. Improve tap-target sizing and maintain visually distinct primary buttons. The change remains scoped to the `.ja-shell` CSS class.

## Acceptance checks
- All ten Commons photos load in actual Chromium on 390px and 1366px, with nonzero naturalWidth; photos and source credits match the named destinations.
- All ten experience records persist without JavaScript; source links and original 31-stop trip controls remain present.
- Interest, time, and region filtering, no-match and reset, show-all and add-to-trip work.
- No horizontal overflow, broken map, canonical, Person identity, source route, ads or sitemap regressions.
- Full owning-repo `npm run verify:all` passes and exact PR SHA is mergeable; inspect artifact screenshots.

This is the first integration **finish**, not yet a dynamic weather-driven visit/closure/ETA engine.
