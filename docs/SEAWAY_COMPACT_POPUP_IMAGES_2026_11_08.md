# Seaway ship popups: compact and photo-qualified (November 8, 2026)

**Owner:** `public/assets/seaway.js`, shared by `/st-lawrence-seaway/` and `/eisenhower-lock/`.

## Visitor issue and scope

The Leaflet ship bubbles repeated two outbound links and an extended disclaimer already covered by the page. Remove those links **inside the bubble only**. Keep the links in the existing selected-vessel information desk outside the bubble, so visitor source access is not reduced. Popups still show name, vessel motion/direction, report time and available length/beam.

A small (220 × 112 px) historical image appears **only** when a manually reviewed source matches the **current AIS MMSI and normalized current AIS name**. No anonymous generic vessel picture, class-only image, automatic name web search, scraped AIS photos, personal upload, new API or artificial vessel photo. A blocked or missing image leaves the original compact text-only popup.

### Curated media

The first two eligible examples are real vessels that can operate in the Seaway and have independently corroborated 2026 MMSI/IMO and Commons vessel identity.

| Vessel | MMSI / IMO | Dated photo | Copyright and source | 2026 identity reference |
|---|---|---|---|---|
| Algoma Equinox | 316009090 / 9613927 | Burlington Canal, 2019 | GriffBill, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [Wikimedia Commons file](https://commons.wikimedia.org/wiki/File:Algoma_Equinox_in_the_Burlington_Canal_November_2019_(Ontario,_Canada).jpg) | [MyShipTracking](https://www.myshiptracking.com/vessels/algoma-equinox-mmsi-316009090-imo-9613927) |
| Algoma Buffalo | 316036228 / 7620653 | Cleveland, 2021 | GuavaTrain, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [Wikimedia Commons file](https://commons.wikimedia.org/wiki/File:Algoma_Buffalo_in_Cleveland_2.jpg) | [MyShipTracking](https://www.myshiptracking.com/vessels/algoma-buffalo-mmsi-316036228-imo-7620653) |

The small media URLs use Wikimedia Commons `Special:FilePath` thumbnail redirects. No source-file copy is held in the repo; image requests send no referrer. Images are historical; their date and author/license appear visibly in the bubble. Photo original and license **hyperlinks** appear in the adjacent `#mapSelection` ship inspector, not the map bubble, meeting attribution requirements while respecting the user’s compact bubble request. A failed remote thumbnail removes itself cleanly.

The registry `public/assets/seaway-popup-photos.json` expires after 180 days from its November 8, 2026 review to avoid an indefinite MMSI/name identity claim. A renamed/unknown/ambiguous vessel gets no picture. Expired registry entries do not block AIS visibility or other ship functions. Additional photographs require new source, licensing and identity review; vessel names alone cannot qualify.

## Release and QA

- Shared photo matcher is a small testable UMD module. Only trusted Commons source URLs and the exact supported Creative Commons license URL are accepted.
- Lazy fetch of a tiny first-party JSON catalog occurs on ship popup open only. No new backend or vessel API request. The asynchronous result verifies MMSI, report timestamp and whether the popup still exists before inserting image.
- CSS only scopes `.seaway-popup-figure` and photo-credit text in the selected-vessel desk. No changes to ads, map controls, tracking, ship selection behavior, sitemap, canonical, JSON-LD or unrelated content.
- Both direct HTML files and the authoritative `scripts/generate-seaway.mjs` / `scripts/enhance-seaway-journey.mjs` output use cache-busted asset URLs, so another build cannot revert it.
- `tests/seaway-popup-compact.test.js` verifies zero popup links, exact identity and expiry, safe image hosts, license/source attribution outside popups, sizes and generated asset ordering.
- The existing browser workflow runs at four widths, tests no-image unknown vessels, injects a clearly labeled synthetic AIS position for a matched identity, serves deterministic fake image bytes to prove 220 × 112 layout, and checks an image-404 case produces no blank space. Synthetic browser data is not a claim about live AIS or Wikimedia media availability.
- The production release still requires complete GitHub CI plus Vercel production READY for the exact merged commit. Verify public media reachability separately before claiming guaranteed photograph coverage.

**Outcome:** two vetted image candidates only, not photos for every vessel. An absent image is the correct honest fallback.
