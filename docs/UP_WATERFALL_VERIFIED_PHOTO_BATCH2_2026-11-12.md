# Upper Peninsula waterfall photography: verified batch 2

**November 12, 2026.** Builds on PR #1653 (four live guide photos). **Ten additional, individually documented and visually inspected waterfalls**. This is 14 photographed guides, not a claim of 14 distinct waterfall destinations in the state beyond the curated inventory.

## Identity and rights ledger

| Guide | Identity / source and attribution | Permission |
| --- | --- | --- |
| Munising Falls | NPS Pictured Rocks accession `5d9c66de-847e-4e1f-afde-37f2619834d6`, October 6, 2018; wide view of named sandstone-plunge gorge. | Federal NPS official-duty photo, public domain. |
| Spray Falls | NPS accession `f03cd012-0e27-4645-b85f-3c33c6bbcadd`, June 6, 2019; unmistakable plunge off Pictured Rocks cliff into Lake Superior. | Federal NPS official-duty photo, public domain. |
| Mosquito Falls | NPS accession `345ac297-32eb-49a0-b28d-f4232bd65e93`, September 29, 2012; documented eight-foot rock shelf on Mosquito River. | Federal NPS official-duty photo, public domain. |
| Agate Falls | James Phelps Flickr photo `265409244`, October 5, 2006; Commons license review and original geotag `46.479408,-89.088735`, near Agate Falls. | CC BY 2.0, photographer clearly credited. |
| Manabezho Falls | Original Commons `Manabezho_Falls.jpg`, uploader Gittinsj; independently labeled broad Presque Isle River falls. Exposure date not recorded; uploader record November 2007. | CC BY-SA 3.0; source uses original 894×596 image because unsupported 800px Commons derivative was rejected. |
| Nawadaha Falls | Shadowmeld Photography `Nawadaha Falls Neutral Density PLC-WF-18.jpg`, July 3, 2015; source explicitly identifies it as *top view of waterfall steps*. This is a close-up, not a panoramic view. | CC BY-SA 4.0. |
| Great Conglomerate Falls | Mr.Z-man original Commons photograph dated July 2006; distinct wide Black River fall with central rock divider. | Creator explicitly dedicated photo to worldwide public domain. |
| Potawatomi Falls | Mr.Z-man original Commons photograph dated July 2006; distinct rock-island view on Black River. | Creator explicitly dedicated photo to worldwide public domain. |
| Sandstone Falls | Mr.Z-man original Commons photo dated July 2006; downstream whitewater over low sandstone ledges on Black River. **Trail closure notice on guide remains; historic photo is not opening evidence.** | Creator explicitly dedicated photo to worldwide public domain. |
| Laughing Whitefish Falls | George A. Bredehoft (ClaymoreWW), July 6, 2008; publisher description expressly says view from the base of Laughing Whitefish Falls, Alger County. | CC BY-SA 3.0. |

Each guide's exact Commons file page, original source (Flickr or NPS where applicable), author, license URL, image date, identity rationale and selected rendered image URL are held at [`data/up-waterfall-photo-provenance.json`](../data/up-waterfall-photo-provenance.json). Pages use Commons-hosted sources rather than truncated or unlicensed media bytes copied into GitHub.

## Explicitly not promoted

- **Chapel Falls**: candidate NPS photograph is largely obscured by foreground fall foliage; alternative source has a visible waterfall but only 515px original resolution. Neither met the lead-photo threshold. Search for a stronger confirmed file before publishing.
- The remaining unphotographed guides have no guessed, generic or swapped waterfall images. State of Michigan DNR public portfolio is still a valid discovery target, but check rights on each individual asset before using it commercially.
- Research-only Dead River Falls, Au Train Falls, and Alger Falls stay noindex and do not gain promotional photographs or any assertion of open public access.

## Release controls

Tests: `tests/up-waterfall-photo-provenance.test.js` verifies 14 unique page-to-photo matches, visible original creators, license links, correct sitemap lastmods, and no photographed research-only holds. The ten guide `dateModified` JSON-LD values and `sitemap-up-waterfalls.xml` are updated to November 12, 2026. Existing SEO, ads, canonicals, maps, parking semantics and page layouts are preserved.

Agency/NPS source licenses and Flickr/Commons reuse conditions were reviewed, not blanket-assumed. Images are historical and do not prove current flow, closures, road or trail safety.
