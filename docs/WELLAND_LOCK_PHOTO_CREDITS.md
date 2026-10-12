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

## Five sourced photographs / eight lock profiles

| Lock(s) | Actual depiction | Creator | Licence | Commons source |
|---|---|---|---|---|
| 1 | Specific Lock 1 at Port Weller | Balcer | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Welland Canal Lock 1 Port Weller.JPG](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_1_Port_Weller.JPG) |
| 2 | Specific Lock 2 exit with freighter Thunder Bay | Cpfan776 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Thunder Bay out of Lock 2 2013-08-01 IMG 1091.jpg](https://commons.wikimedia.org/wiki/File:Thunder_Bay_out_of_Lock_2_2013-08-01_IMG_1091.jpg) |
| 3 | Specific Lock 3 from the museum observation deck | Dough4872 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Welland Canal Lock 3 from observation deck.jpeg](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_3_from_observation_deck.jpeg) |
| 4, 5, 6 | **Representative of the Thorold area:** actual photo is Lock 7; **NOT** Locks 4, 5 or 6 | Gogerr | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Welland Canal Lock 7.jpg](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_7.jpg) |
| 7 | Specific Lock 7, Thorold | Gogerr | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Welland Canal Lock 7.jpg](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_7.jpg) |
| 8 | Lock 8 Gateway Park, Port Colborne; photo **of the visitor park**, not claimed as a chamber view | Mhsheikholeslami | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Lock 8 Gateway Park-Port Colborne-Ontario-20220317.jpg](https://commons.wikimedia.org/wiki/File:Lock_8_Gateway_Park-Port_Colborne-Ontario-20220317.jpg) |

**Production delivery fix (October 11, 2026):** Browser hotlinks to Wikimedia were not displaying on the live page. To make the cards reliable, the repo now stores reproducibly imported copies of these *same* licensed image files under `public/assets/welland/photos/`. The importer is `scripts/fetch-welland-photos.cjs`. It accepts only authentic JPEG bytes from exact, allowlisted Commons filenames, tries thumbnail and original URLs, and fails rather than quietly publishing an image-free update. The source/photographer/licence links remain visible in every detailed card. Images are cropped to fit the UI; that's disclosed with each credit.

The original Wikimedia URL is a browser fallback only. Files are not owned by the site. New per-lock photography must be separately verified and licensed. **Adobe Stock preview images are not included**; incorporating purchased Adobe assets requires a license and delivery of the authorized originals.

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
