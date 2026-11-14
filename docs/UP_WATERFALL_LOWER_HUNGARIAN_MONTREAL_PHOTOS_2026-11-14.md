# Waterfalls photography: Lower Hungarian and Lower Montreal Falls
Source review: November 14, 2026.

## Reconciled release scope
Main already includes 37 distinct, source-verified waterfall photographs after prior merged work (Rainbow, Upper Hungarian, Saxon, Pemene among them). The superseded PR #1717 had been based on only 33 and would conflict. This PR adds only two missing guide images from fresh main: Lower Hungarian Falls and Lower Montreal Falls. Expected after merge: 39/80 verified, 41 held/pending.

## Lower Hungarian Falls
- Exact image: https://commons.wikimedia.org/wiki/File:Lower_falls.jpg
- Publisher/photographer: Fondycardinals, uploader's own work explicitly described as the **lower falls of Hungarian Falls**, separate from the same author's middle/upper tier photos.
- File: 544×749 original, no more detailed copy independently verified. CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/
- Published on Commons Oct. 2017; capture date unverified. Image is not upscaled, recropped or substituted; a test exception retains its real native dimensions.
- Existing Dover Creek gorge trail, land ownership and unsafe descent cautions are unchanged.

## Lower Montreal Falls, Keweenaw
- Exact photo: https://commons.wikimedia.org/wiki/File:Montreal_Falls_at_Night.jpg
- Creator RomanKahler explicitly identifies the photo as **Lower Montreal Falls at Night**, image 1205×1805, 14 August 2017, Commons CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/
- Use an unaltered 960px Wikimedia Commons derivative, displayed uncropped with visible author/source/license credit.
- The existing guide keeps the legally described Fish Cove arrival and the explicit warning against the private Smith Fisheries Road. The caption says a nighttime photo does not establish safe or legal after-dark access.

## Held
The old https://commons.wikimedia.org/wiki/File:Yellow_dog_falls.jpg photo documents some cascades along Yellow Dog River but not a verified exact match to this guide's waterfall coordinates. No photo should be published on that guide without stronger named-drop identity.

## Release guards
Four source/data/test files plus the two guides and two exact sitemap date revisions; no sitewide layout, canonical, titles, descriptions, ads, map pins, walking routes, planning Rust, or access determinations changed. The Montreal B80 regression test is updated only for a truthful page modification date, with all legal access requirements retained.

Require passing exact-commit repository gate, U.P. waterfall browser smoke, Rust parity, SEO guard and Vercel; then verify the resulting two public guide images/credits and 39/80 ledger after merge.
