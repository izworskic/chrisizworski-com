# Upper Peninsula waterfall photography — first verified image pass
**Review:** 2026-11-12 · **Scope:** four source-verified public guides, not all eighty entries.

The user-facing aim is a **real photograph of the exact named waterfall**, not a generic forest, a nearby rapids segment, a road bridge or the wrong tier. We screened Michigan DNR photo-policy and public portfolio options, Flickr/Commons independently reviewed licenses, and National Park Service accessioned photographs. Image thumbnails were visually inspected rather than chosen from filename alone.

| Guide | Photograph identity and geographic evidence | Reuse | Source |
| --- | --- | --- | --- |
| Wagner Falls | Wagner Falls 36003612295, LadyDragonflyCC, July 15 2017. Flickr original and Commons FlickreviewR confirmation. Camera geotag **46.387801, -86.648139** lies close to Wagner Falls Scenic Site; multi-step cascade visible in image. | CC BY 2.0; show author, direct source and license. | https://commons.wikimedia.org/wiki/File:Wagner_Falls_(36003612295).jpg |
| Bond Falls | Photographer Chris857's own **Bond Falls 2020 - 1**, August 16 2020, documented viewpoint facing upstream at 46.410100, -89.133200, close to named natural feature; waterfall image checked. | CC BY-SA 4.0; show author, source and license. Site does not creatively crop/remix the photograph. | https://commons.wikimedia.org/wiki/File:Bond_Falls_2020_-_1.jpg |
| Miners Falls | National Park Service official NPGallery accession **b94f3b95-025b-4893-b014-27a288121ee2**, June 19 2018, recorded as “Miners Falls” at Pictured Rocks. Visible single plunge confirms named subject; not the Miners Beach or castle photo. | Public-domain US federal employee official-duty photograph. | https://commons.wikimedia.org/wiki/File:Miners_Falls_(b94f3b95-025b-4893-b014-27a288121ee2).JPG |
| Sable Falls | NPS NPGallery **208f3ca7-00cc-42c2-b113-722e4dd3d977**, October 19 2017; agency explicitly identifies autumn image as Sable Falls, Pictured Rocks. Visible stepped cascade and seasonal forest. | Public-domain NPS official-duty image. | https://commons.wikimedia.org/wiki/File:Sable_Falls_in_Fall_(208f3ca7-00cc-42c2-b113-722e4dd3d977).JPG |

## Delivery and visitor truth

Four existing indexed guide pages now use Wikimedia Commons **960-pixel hosted thumbnails** with original photo credit, license link, historical date, accurate descriptive alt text, and Open Graph / Twitter image. Image is visually sized responsively without forcing an identity-altering crop. The source is **hotlinked**, not copied into the repository: external availability, bandwidth, cache and site image policy remain operational considerations; self-host WebP/AVIF derivatives in a dedicated later pass after reliably retrieving **complete image bytes** from original sources.

The attribution line is on the page next to the actual image, not hidden in an inventory. The date identifies the photograph and does **not** imply today's river flow, parking permission, seasonal closure or trail conditions. The image location is a camera coordinate or agency photo location, **not a parking coordinate**.

The four guide JSON-LD dateModified values and their four matching entries in `sitemap-up-waterfalls.xml` reflect the November 12 content update. `tests/up-waterfall-photo-provenance.test.js` prevents accidental swapping between the four named waterfalls or loss of visible credit/CC license, and ensures held access-research-only waterfalls do not receive a fake photo.

## Additional source policy and next work

- Michigan DNR: https://www.michigan.gov/dnr/about/newsroom/photo-video advertises a DNR Public Portfolio for public/commercial use (external Canto gallery), but ordinary https://www.michigan.gov/dnr/about/dnr-website-and-application-policies does **not** grant blanket reuse of any Michigan.gov page image. Review actual gallery rights before importing.
- Flickr per-image Creative Commons license and original photographer remain authoritative. A waterfall label alone is not an identity check. Cross-check GPS, waterfall tier, nearby road or viewpoint, year, and agency-managed subject where possible. If the source is ambiguous, the waterfall remains **photo-unverified**.
- NPS is a federal agency. NPGallery accessioned **NPS employee official-duty** photos can be public domain; do not infer that every photo merely hosted on NPS (e.g., a partner/contributed photograph) is.
- The remaining 76 curated guide records are **not claimed photographed** and receive no placeholder or borrowed imagery. Priority next photo sources: NPS Pictured Rocks and Isle Royale official archive, Michigan DNR Public Portfolio with per-file policy, National Forest Service agency photographs, Flickr CC BY/SA with recorded geotags; use a quality threshold for each photograph.
- Access-restricted Dead River, Au Train and Alger Falls retain their existing research-only guidance. A photo cannot establish lawful access or a safe parking viewpoint.

**Machine-readable source-of-truth:** `data/up-waterfall-photo-provenance.json`.
