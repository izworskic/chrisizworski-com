# Welland Canal — camera and lock-image value function V1

## The problem to solve

A lock image must **increase understanding of the correct lock**. Reusing a beautiful photo of Lock 7 for Locks 4, 5, and 6 causes confusion even if the caption technically discloses "nearby Lock 7". A working camera is useful only when a visitor knows the precise scene it covers and what it cannot prove.

## Hard gates

A release fails if **any** of the following is true, regardless of points:

- The media is described as a specific lock when it actually depicts another lock or an unidentified part of the canal.
- The same media URL appears under two selected locks as though they are distinct primary images.
- An engineering schematic is presented as an actual photo, or a nearby park is labeled the Lock 8 chamber.
- Image source, author/creator, relevant data source and clear usage evidence are missing.
- A first-party image does not actually exist in the checked-out static site, or an archive photo URL is not from the small, documented public-sector source allowlist.
- The camera is claimed to be inside Lock 8 or continuously live without verification, or YouTube is loaded without a user click.

## Quantified value

`V = 0.35 A + 0.20 U + 0.15 P + 0.15 E + 0.10 C + 0.05 D`, rescaled to 0–100.

| Component | Weight | Operational metric |
| --- | ---: | --- |
| A — Correct subject and specificity | 35 | Verified exact-lock photo: 35 pts; truthful multi-lock flight photograph: 24; dated construction photograph of exact lock: 28; clearly disclosed contextual view near Lock 8: 18 |
| U — Uniqueness | 20 | All eight media URLs differ; reused underlying source for Locks 4 and 6 is explicitly disclosed and is not counted as an independently unique photograph |
| P — Provenance | 15 | Author/creator, source, rights/data reference and accessible original or evidentiary link |
| E — Explanatory utility | 15 | Descriptive alt, truthful caption, at least two sentences of lock-specific explanation |
| C — Camera accuracy | 10 | Verified geographical description and provider source; click-to-load with stop button; no ungrounded occupancy/live claims |
| D — Delivery | 5 | Existing first-party photos exist; new archive photos use allowlisted external Commons/LOC image URLs pending first-party import and visual load verification |

Current October 13 production candidate: four exact-lock photos (1, 2, 3, 7), **a source-shared public-domain Thorold flight aerial for Locks 4 and 6**, a 1916 actual Lock 5 construction photo, and one honestly contextual Gateway Park photo (8) linked to an external chamber aerial. The old schematics are retained as reference files. The historical archives are linked separately as real documentary photos for 4–6; they are not silently recopied as unverified licensed assets.

The exact-lock visual assignment is benchmarked by `node scripts/benchmark-welland-media.cjs`, called from `tests/welland-canal.test.js`. The predicted structural V1 score is **94.3/100** (rounded), subject to runtime checks. This does not mean there are eight unique, modern lock photographs: the contextual Lock 8 image and shared Thorold-flight overview remain important limitations. Any hard-gate violation caps the score at 49. The benchmark reports the individual lock's source and media class so false high averages cannot conceal wrong pictures.

**This is a structural/editorial value-function score, not a computer-vision photo verification, media-rights clearance beyond documented sources, actual user comprehension, or live stream uptime measurement.** Each visual was researched and attributed separately, but additional human visual review remains worthwhile.

## Camera truth contract

The provided YouTube video `yF7XdpkL34w` is documented as a Port Colborne / Bridge 21 PTZ camera overlooking the canal, **not a view inside Lock 8**. It is mounted in the page only after the viewer clicks "Load camera video", and removed on Stop. It may be offline. A direct YouTube link always remains.

Additional references include the independently hosted [StreamTime Live Port Colborne camera](https://streamtimelive.com/port-colborne/) (external link only; no unauthorized rebroadcast) and a [2019 Lock 7 webcam report](https://www.thoroldtoday.ca/local-news/live-webcam-at-lock-7-brings-the-world-to-thorold-1439543) (present-day status unverified). Neither is misrepresented as independently verified currently playing.

## Future upgrades ranked by expected value

1. Replace **Lock 8's Gateway Park photograph** with a rights-cleared, verified chamber view of Lock 8. The card now links to the actual Lock 8 aerial at Marinas.com, but does not republish its image without permission. This would gain 17/8 ≈ 2.1 overall points.
2. Source three distinct, legally reusable **current photographs of Locks 4, 5 and 6**. The shared archival flight photo and historical Lock 5 construction shot are honest interim alternatives, not final chamber portraits. Each would improve the score by 3/8 ≈ 0.4 points, but likely provides a larger *human* comprehension gain.
3. Independently verify an operational **Lock 7 webcam embed**, publisher permissions and uptime before adding it to the player selector.
4. Test five first-time users on phones: (a) find Lock 5 and say what photo shows, (b) distinguish the Lock 8 park photo from the chamber, (c) explain why a Port Colborne camera does not confirm lock occupancy. Seek ≥90% correct understanding and <15-second median time to a sourced visual; observation supersedes code proxy.

## Evidence

- [NOAA Coast Pilot 6: Welland lock lift table](https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp6/CPB6_C05_WEB.pdf): 4/5 = 15 m, 6 = 13 m.
- [Niagara Falls Public Library: Locks 4 & 5 historic construction](https://nfpl.historicniagara.ca/s/All/item/99282) and [Lock 6](https://nfpl.historicniagara.ca/s/All/item/99277): archive collection identifies subjects and reports "Public Domain"; currently linked, not copied.
- [Welland Public Library historical postcard](https://omeka.wellandlibrary.ca/items/show/9470) shows all 4/5/6 but explicitly identifies rights holders; therefore **not copied**.
- [Current Lock 7 photographer/Creative Commons source](https://commons.wikimedia.org/wiki/File:Welland_Canal_Lock_7.jpg).
- [Port Colborne publisher camera](https://www.youtube.com/watch?v=yF7XdpkL34w), [StreamTime Live](https://streamtimelive.com/port-colborne/), [2019 Thorold Lock 7 report](https://www.thoroldtoday.ca/local-news/live-webcam-at-lock-7-brings-the-world-to-thorold-1439543).

Preserve main SEO canonical, `https://chrisizworski.com/#person`, exact Chris Izworski attribution, existing AIS truth/30-minute freshness and map behavior.
