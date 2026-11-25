---
name: photo-sourcing
description: "Find real, licensed photographs of real places, record their credits, and check that each photo shows the named place. Use when a new tool or redesign needs place photos, when a photo's source, author or license is unknown, or when reviewing already-sourced photos for quality or duplicates."
---

# Photo sourcing: real places, lawful photos, honest credits

Redesigns need photographs, and a wrong or unlicensed photo is worse than none. This skill is the supply line and the check. It absorbs the former `hf-visual-evidence` skill, whose model-assisted photo review is now step 5.

## 1. Supply order

1. The owner's own photos, when the owner provides them.
2. U.S. federal government works that are public domain: NPS, USFWS, NOAA, USGS, USACE. Confirm on the source page that the image is a government work and not a contractor's or a credited third party's.
3. Wikimedia Commons through its API, reading the file's license metadata (`prop=imageinfo&iiprop=url|extmetadata|size`). `scripts/fetch-national-park-images.mjs` and `scripts/download-coastal-drives-images.mjs` already do this; reuse their pattern.
4. Openverse search for leads only. Confirm the license on the source page before use, because an aggregator's metadata can be stale.

## 2. Allowed licenses

| License | Use | Condition |
| --- | --- | --- |
| Public domain, CC0 | Yes | Credit anyway as a courtesy |
| CC BY | Yes | Credit author, license and source link |
| CC BY-SA | Yes | Credit as above; a modified image is shared under the same license |
| Any NC license | No | The site carries ads, so use is commercial |
| Any ND license | Only uncropped and unaltered | Prefer another photo |
| Unknown, "all rights reserved", social media | No | Ask the owner to obtain permission in writing |

Never use a generated image to depict a real place, and never present an illustration as a photograph.

## 3. Credit record

Write one entry per image in the tool's credits document, following `docs/WELLAND_LOCK_PHOTO_CREDITS.md`:

| Field | Example |
| --- | --- |
| File in repo | `public/welland-canal/img/lock3.jpg` |
| Subject and place shown | Algoberta entering Lock 3, St. Catharines |
| Date taken | 2024-07-25 |
| Author | as the source page names them |
| License and link | CC BY-SA 4.0 |
| Source page | the Commons file page or agency page |
| Date retrieved | 2026-11-25 |
| Place confirmed by | how the place was verified (source caption, coordinates, landmarks) |

The visible credit on the page carries author, license and a link to the source page.

## 4. Place check

The photo must show the place the page names. Confirm it from the source page's caption, coordinates or identifiable landmarks. A photo of a similar waterfall or a different lighthouse is a wrong photo, however good it looks. If the place cannot be confirmed, leave the slot empty or use a map.

## 5. Optional model-assisted review

For a bounded list of already-sourced photos (source page, image URL, credit, license, known place, date), a local vision model may draft a review-only table: proposed subject, tentative alt text, likely duplicate groups and needs-human-confirmation flags. Candidate models for separate review: `onnx-community/Florence-2-base-ft` (MIT) and `Xenova/clip-vit-base-patch32` (MIT). Run offline, never per visitor. Model output never establishes a photo's place, copyright or publication rights, and its captions are drafts for an editor, not page copy.

## 6. Prepare the files

Resize and compress before committing (a 1600 px wide JPEG or WebP is usually enough for a hero; record the bytes). Set `width` and `height` in the HTML. No Vercel image optimization, which is a billed feature. Write alt text that describes what the photo shows, in plain words.

## Output

The credit records, the place confirmation for each photo, the license table result, and anything unconfirmed marked NOT VERIFIED.

## Boundaries

Field Guide V1, Experience OS, Playwright image-load checks, Auto ads and page performance rules still apply. Never replace a hero image, source URL, credit or caption on a live page without owner review. Do not auto-merge.

## Sources

Wikimedia Commons API (image metadata); WordPress/openverse (MIT code, used for leads only). Model candidates are listed for evaluation, not adoption. Reference only.
