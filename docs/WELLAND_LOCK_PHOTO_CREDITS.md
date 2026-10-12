## October 12 follow-up: exact historic Lock 5 and Lock 8 pictures

The prior eight-lock layout still had **no actual photographs for Locks 4, 5 or 6** and used a **park photo for Lock 8**. A fresh source-rights audit researched Wikimedia Commons, the U.S. Library of Congress, Niagara Falls Public Library and BlueSeas. Two newly sourced real historical photographs are now displayed:

- **Lock 5 — excavation, 1916.** [Library of Congress Bain Collection LCCN 2007681023](https://commons.wikimedia.org/wiki/File:Welland_ship_canal_-_channelled_faces_for_pit_for_lock_no._5_LCCN2007681023.jpg), explicitly **public domain**. This is the construction pit of Lock 5, **not a view of its finished chamber or current operation**. Hosted image `/assets/welland/photos/lock5-construction-1916.jpg`. Do not imply modern physical appearance from the excavation.
- **Lock 8 — actual gates, September 1929.** [“Lock 8 On The Welland Ship Canal”](https://commons.wikimedia.org/wiki/File:Lock_8_On_The_Welland_Ship_Canal.jpg), **public domain**, historic S.S. Meaford gates opening. Hosted image `/assets/welland/photos/lock8-gates-1929.jpg`. It is the Lock 8 structure, not nearby Gateway Park, but it is historical, **not the present-day operating view**.
- Both images are downloaded from their own Commons file metadata, rejected unless the license is explicitly `Public domain`, optimized without changing their actual physical content and committed as first-party JPEGs. Photographer/collection credit, original file links and public-domain mark are visible on the selected lock profile and a prominent `HISTORIC` date is shown in all photo captions.

**Outstanding genuine-photo gap:** Locks **4 and 6** still have original engineering schematics as primary media. Public-domain historic photography is documented at [Lock Nos. 4 & 5 under construction](https://nfpl.historicniagara.ca/s/All/item/99282) and [Lock 6 under construction](https://nfpl.historicniagara.ca/s/All/item/99277), but the library denied automated original-image retrieval (403). These were **not copied**, guessed from a wrong lock, or simulated. The photo mission is therefore **6/8 photographed, of which 4/8 are contemporary exact-lock photographs**. Another goal is a contemporary completed Lock 5 photo and current Lock 8 chamber photo.

For direct understanding while image reproduction permissions are unresolved, the lock-selection and full profiles provide labeled external [BlueSeas aerial images for every lock](https://www.offshoreblue.com/cruise/welland-canal.php) (4 East/West, 5 East/West, 6 East/West, and 8). Those files remain on their source website and are **not bundled, copied or asserted to be Creative Commons**; BlueSeas asserts copyright on its content. Historic Public Domain Niagara photos remain linked directly at their archive pages.

The honest strict photo benchmark (`scripts/benchmark-welland-media.cjs`) separately reports real-photo count, modern exact-photo count and missing images; passing the publication truth gate is not equivalent to achieving eight contemporary chamber photographs. Its full-coverage goal remains incomplete.

# Welland Canal lock photography and factual sources

Date reviewed: 2026-10-11. Page: `/welland-canal/`.

## Main-page hero photograph

The Welland landing-page hero uses a separate, **actual Welland Canal** photo:

- Subject: *Algoberta entering Lock 3*, St. Catharines, July 25, 2024.
- Photographer: **Dough4872**.
- File: [Algoberta heading into Welland Canal Lock 3.jpeg](https://commons.wikimedia.org/wiki/File:Algoberta_heading_into_Welland_Canal_Lock_3.jpeg).
- Licence: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Site path: `/assets/welland/photos/hero-algoberta.jpg`.
- Modification: the original image is cropped to 16:9 and resized to 1600×900 JPEG for responsive page use; the visible hero caption discloses the crop and links to the photographer, original and licence.
- Source integrity: fetch exact Wikimedia Commons file, validate JPEG, optimize in `scripts/optimize-welland-hero.py`, and bundle it into the website; **not a live webcam**, not an Adobe Stock or other unlicensed image.
- Placement: full-canvas right-dominant desktop photograph, with a dark gradient protecting the headline; on smaller displays, the photo becomes a dedicated strip below the copy for reliable readability. An image preload with high fetch priority improves the odds of early paint. OG/X card imagery references the same source.

## Image use rules

The map displays real AIS ship silhouettes and lock position markers; the **editorial lock card** displays photos. Images load only as the user explores the page; existing map tile and AIS backends stay independent. Full-size photography is displayed at a 16:9 crop; Commons file originals remain unchanged. Both full-size card and compact mobile preview reuse the same photo. The full card links directly to the original file, photographer and licence. **Do not relabel a regional view as a specific lock.**

Live or seasonal photos are **illustrative, not live cameras**. If Wikimedia fails to serve a photo, the UI shows an honest illustrated-colour fallback with the original caption and author/license links. Do not quietly replace the image with a picture of another waterway. Attribution notices must remain visible on the card.

## Verified image assignments — media integrity revision, October 12, 2026

All eight selectable lock profiles now use **eight distinct media paths**, without passing a photo of one lock off as another.

| Selected lock | Media | What the user is actually shown | Provenance / disclosure |
|---|---|---|---|
| 1 | `north1.jpg` | Lock 1, Port Weller | [Balcer; CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_1_Port_Weller.JPG) |
| 2 | `north2.jpg` | Thunder Bay emerging from Lock 2 | [Cpfan776; CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Thunder_Bay_out_of_Lock_2_2013-08-01_IMG_1091.jpg) |
| 3 | `north3.jpg` | Lock 3 from the viewing platform | [Dough4872; CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_3_from_observation_deck.jpeg) |
| 4 | `flight4-schematic.svg` | **Original Lock 4 interpretive schematic; NOT a photograph** | By Chris Izworski, lift according to [NOAA Coast Pilot 6](https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp6/CPB6_C05_WEB.pdf), not to scale |
| 5 | `flight5-schematic.svg` | **Original Lock 5 interpretive schematic; NOT a photograph** | By Chris Izworski, same NOAA reference; not to scale |
| 6 | `flight6-schematic.svg` | **Original Lock 6 interpretive schematic; NOT a photograph** | By Chris Izworski, same NOAA reference; not to scale |
| 7 | `thorold.jpg` | Lock 7 in Thorold | [Gogerr; CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_7.jpg) |
| 8 | `south8.jpg` | **Nearby Lock 8 Gateway Park; NOT the Lock 8 chamber** | [Mhsheikholeslami; CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Lock_8_Gateway_Park-Port_Colborne-Ontario-20220317.jpg) |

The previous published site used the very same Lock 7 photo for **all of Locks 4, 5, 6 and 7**, which was correctly labeled regional imagery but still confusing to visitors. That repetition is now removed from the eight displayed profiles. A separate unused photograph source record remains in code only for image provenance; the media benchmark evaluates **what each lock actually displays**, not how many files happen to exist in the repository.

### Next photographic research, not approved for reproduction

- [Niagara Falls Public Library — Locks 4 and 5 under construction](https://nfpl.historicniagara.ca/s/All/item/99282), item marked Public Domain by archive.
- [Niagara Falls Public Library — Lock 6 under construction](https://nfpl.historicniagara.ca/s/All/item/99277), item marked Public Domain by archive.
- [Welland Public Library — flight locks 4–6 historic postcard](https://omeka.wellandlibrary.ca/items/show/9470), rights reserved to E. Ludwig / John Hinde Studios; **do not use without permission**.
- Need a distinct, exact-chamber photograph of Lock 8 with documented usage permission. The Gateway Park picture can still appear as a *secondary nearby visitor view*.
- These archive photographs depict **historic construction**, not present-day vessel conditions. If approved for future use, display them with date and status prominently.

The photo benchmark is **`node scripts/benchmark-welland-media.cjs`**. It penalizes context-only images and modestly penalizes original engineering schematics versus verified exact-lock photos while requiring all eight media paths to be unique and honesty/copyright gates to pass.

## Camera source distinction

- [User-supplied Port Colborne video](https://www.youtube.com/watch?v=yF7XdpkL34w), documented as a **Port Colborne Bridge 21 / canal area** PTZ view, not Lock 8. Only loaded after a deliberate click. The video may be offline or the camera may pan away. YouTube publisher controls playback and uptime.
- [StreamTime Live, Canalside Restaurant, Port Colborne](https://streamtimelive.com/port-colborne/), a separate publisher-hosted camera of the Bridge 21 canal area; their site prohibits unauthorized copying/restreaming; link instead of mirroring.
- [Thorold News Lock 7 camera report, 2019](https://www.thoroldtoday.ca/local-news/live-webcam-at-lock-7-brings-the-world-to-thorold-1439543), historical evidence a camera was installed, **not** proof it works in 2026.

A live video feed cannot confirm lock occupancy, departure time, Seaway schedules or AIS positions. It supplements but never replaces official Seaway transit reports.

## Editorial reference set

- St. Catharines Museum / official Lock 3 visitor information, access, official ship schedule: https://stcatharines-ca.govstack.com/arts-culture-and-events/st-catharines-museum-and-welland-canals-centre/visiting-us/
- City of Thorold / Lock 7 Viewing Centre, views across Locks 4–7: https://www.thorold.ca/recreation-culture-community/canals/lock-7-viewing-centre/
- Brock University Library, twin flight Locks 4–6, approximate 140-ft/43-m total lift: https://exhibits.library.brocku.ca/s/welland-canal/page/operation
- Port Colborne municipal parks page, Lock 8 Gateway Park, regulatory operation: https://www.portcolborne.ca/en/recreation-and-leisure/Parks__Pavilions__Trails__Fields_and_Green_Spaces.aspx
- National marine chart description of Thorold flight and Lock 7: https://publications.gc.ca/collections/collection_2022/mpo-dfo/Fs74-23-2021-12-eng.pdf

## Future image-upgrade priority

1. Source clearly licensed current photos showing **individual** Locks 4, 5 and 6, then replace the honestly labeled Thorold-area representative photo.
2. Source a clearly licensed photograph of **Lock 8 chamber** itself rather than the park.
3. Optimize or serve the Commons images from approved local storage if future performance data shows slow or unavailable loads; preserve all creator/licence attributions and image provenance.

No automatic search or AI-generated images were passed off as original location photos.
