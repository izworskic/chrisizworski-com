# Map delivery and data truth contract

## The map is part of the answer, not decoration

Use Leaflet with the **locally shipped** `starter/vendor/leaflet-1.9.4.css`; the original Michigan page showed one naked tile when Leaflet CSS was missing even though a status string said “CARTO loaded.” Include CSS *before* local components and initialize the map after DOM is ready, not after waiting for all photos/ads. ResizeObserver / `invalidateSize` handles later layout changes.

If the new target site's map infrastructure differs, adapt its own established map provider instead of forcing CARTO.

## CARTO in a Vercel owner site

Where available, call same-origin `GET /api/carto-basemap-config`. The expected public, publishable shape is `{ "provider":"CARTO", "key":"..." }` from the existing deployed endpoint using `CARTO_BASEMAP_PUBLIC_KEY`. Append the configured public key only to tile requests; **do not write any key into this design standard, store a private key in HTML, or log it**.

Example pattern:

```js
const response = await fetch('/api/carto-basemap-config', { credentials:'same-origin' });
if (response.ok) {
  const { provider, key } = await response.json();
  if (provider === 'CARTO' && typeof key === 'string' && key.trim()) {
    // CARTO Voyager: add encodeURIComponent(key.trim()) to ?key=...
  }
}
```

If the endpoint fails, is absent or tiles error, show an explicit fallback to OpenStreetMap or a clickable standard map URL. A tile-load event establishes that **some** imagery arrived, not that all map tiles or pins are visible. Test actual visible tile coverage, zoom controls, and card/pin interaction on at least desktop and mobile.

Use attributions required by CARTO, OSM, Leaflet and data sources. No synthetic traffic/ETA/available parking claims or unverified current locations.

## Evidence layers

| Layer | Honest label | What it can prove |
|---|---|---|
| Editorial suitability | Typical season / inspiration | A place often offers an experience in that season |
| Live weather source | Observation/forecast time & source | Weather conditions or a forecast window |
| Dated field sighting | Observation date, species and observer source | Someone reported a sighting, not a future guarantee |
| Access/parking | Land manager notice + updated date | A declared opening/closure or access rule |
| Map marker | Actual verified coordinates | Approximate location of a landmark, **not** permission to park |
| Lake/river ice | Source/date + risk warning | Coverage/formation estimate, **never** safe ice |

Each new tool owns a specific search/decision intent. Linking an authoritative existing condition engine is usually better than recreating its weather, snow, aurora, wildlife or marine computations. The page remains crawlable without requesting browser location or waiting for JavaScript.

## Privacy

Geolocation is optional, one explicit click, and permission-gated. Don't store or leak precise position into analytics or logs. Filters must work without granting location.
