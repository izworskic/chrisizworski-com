# Welland Canal lock photography and factual sources

Date reviewed: 2026-10-13. Page: `/welland-canal/`.

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

All eight selectable lock profiles use photographic imagery, but **Locks 4 and 6 deliberately reuse one documented panorama of the three-chamber flight**; each is clearly labeled as a shared overview, not an independent lock portrait. Lock 5 uses an archival construction photograph. The Lock 8 primary card remains the nearby visitor-park photo, with a direct external link to a Lock 8 aerial photograph; reproduction rights for the latter have not been established.

| Selected lock | Media | What the user is actually shown | Provenance / disclosure |
|---|---|---|---|
| 1 | `north1.jpg` | Lock 1, Port Weller | [Balcer; CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_1_Port_Weller.JPG) |
| 2 | `north2.jpg` | Thunder Bay emerging from Lock 2 | [Cpfan776; CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Thunder_Bay_out_of_Lock_2_2013-08-01_IMG_1091.jpg) |
| 3 | `north3.jpg` | Lock 3 from the viewing platform | [Dough4872; CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_3_from_observation_deck.jpeg) |
| 4 | USACE flight aerial, served from Commons | **Real photograph of Locks 4–6 as a group, including Lock 4** | [U.S. Army Corps; public domain](https://commons.wikimedia.org/wiki/File:Welland_Canal_locks.png) |
| 5 | Library of Congress historic photograph | **Actual Lock 5 pit under construction in 1916 (not modern appearance)** | [Bain News Service / LOC; no known publication restrictions](https://commons.wikimedia.org/wiki/File:Welland_ship_canal_-_channelled_faces_for_pit_for_lock_no._5_LCCN2007681023.jpg) |
| 6 | USACE flight aerial, served from Commons | **Real photograph of Locks 4–6 as a group, including Lock 6; same original panorama as Lock 4** | [U.S. Army Corps; public domain](https://commons.wikimedia.org/wiki/File:Welland_Canal_locks.png) |
| 7 | `thorold.jpg` | Lock 7 in Thorold | [Gogerr; CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_7.jpg) |
| 8 | `south8.jpg` | **Nearby Lock 8 Gateway Park; NOT the Lock 8 chamber. Exact Lock 8 aerial available via external photo link** | [Mhsheikholeslami; CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Lock_8_Gateway_Park-Port_Colborne-Ontario-20220317.jpg); [Lock 8 aerial on Marinas.com](https://marinas.com/view/lock/rvhgd_Welland_Canal_Lock_8_Port_Colborne_ON_Canada), not reused without permission |

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

1. Replace the historical Lock 5 construction image and the shared Locks 4/6 flight panorama with three distinct, current, specifically identified, reusable photos of the chambers.
2. Source a clearly licensed photograph of **Lock 8 chamber** itself rather than the park.
3. Import or mirror the new approved archive photos as first-party assets after verifying download, exact identity and runtime performance. Current new archive photos are external and may fail or be slow; the old three schematics are retained as reference assets.

No automatic search or AI-generated images were passed off as original location photos.

## October 13 photo upgrade limitations

The user requested actual photography rather than the engineering diagrams. Locks 4–6 now render sourced archive photos on their cards and map previews, while the diagram SVG files remain in the repository. **This is a partial photo upgrade, not proof that every lock now has its own current, independent photograph.** Locks 4 and 6 share a true flight aerial, and Lock 5's dated photo shows construction. The Lock 8 chamber image is currently linked to its external publisher, not copied or embedded without documented reuse rights. External Commons and Library of Congress delivery has not yet been verified on production. The live AIS, ship markers and map mechanics are unchanged.
