# Portable example page — not for publication unchanged

This directory is a **working three-destination demonstration** of FIELD_GUIDE_V1.

- `index.html`: real illustrative destination cards + photo credits in crawlable HTML, filter controls, accessible fallback.
- `field-guide.css`: scoped responsive layout tokens and components.
- `field-guide.js`: static-card filtering, optional Leaflet/CARTO map with a real OSM fallback and synchronized pins.
- `vendor/leaflet-1.9.4.css`: vendored Leaflet stylesheet with original BSD-2-Clause licensing.

If this starter is moved from the parent directory into its own repository, file paths remain relative.

**Important:** it is a *demo*, with `noindex,nofollow`. No canonical is asserted. Its images use Commons URLs and explicit attribution, not bundled licensed photos. Adapt real place information, licenses, photos, sources and brand metadata for each project before publication.

Run `npm test` from the parent design-standard root to check basic contracts. External Leaflet JavaScript from unpkg requires an internet connection. Map fallback occurs if Leaflet fails or CARTO public configuration is absent. Cards and direct links remain visible without JavaScript or maps.
