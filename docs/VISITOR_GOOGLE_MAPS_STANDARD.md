# Visitor Google Maps location standard

This standard applies to visitor-facing map experiences in the main site repository. Independent tool repositories must adopt it separately after review.

## Visitor promise

An interactive `Locate on map`, `Show on map`, or equivalent action should offer a nearby, clearly labeled **View in Google Maps** link when a grounded geographic reference is available. People should still be able to open official park or venue guidance. For destination cards essential to a visit, provide an HTML link that works if the internal map or JavaScript fails.

## Geography and navigation are different

| Mapped role | External action | What it means |
| --- | --- | --- |
| Public place or visitor attraction | Google Maps place search | Locate the named public place. Opening hours and entrance location are not established by the link |
| Regional stop or area reference | Google Maps named-place search | Orientation only. It is not a parking, trailhead, or direct routing pin |
| Natural feature | Google Maps coordinate search | The waterfall, shoreline, or natural feature. Not a driving destination |
| Published parking feature without independent arrival proof | Google Maps coordinate search | Display the DNR or land-manager parking record. Verify entrance and access before visiting |
| Verified visitor entrance | Google Maps driving directions | Only with a separately recorded authoritative entrance/arrival source |
| Restricted facility, launch pad, or moving vessel | No Google Maps visitor navigation | The coordinate is not a public arrival destination |

Use the shared `/assets/visitor-map-links.js` contract: `placeSearch({role,query})`, `featureSearch({role,lat,lng})`, and `verifiedDirections({role:'verified-visitor-entrance',lat,lng,sourceUrl})`.

A Google Maps search is not an assurance that Google's listing resolves to the exact entrance. Never fabricate a legal approach, road opening, parking space, bridge crossing, or route from a marker. Do not route people to an AIS position.

## Implemented 2026-11-16

- Lake Superior Circle Tour: 31 HTML-based named-place links, plus the map's selected-stop panel and live-day stop controls. General locations are not certified entrances.
- Welland Canal: three sourced public shore-watch places in HTML, selected watch panel, and map selection details. No routing to vessel AIS points or lock works.
- Michigan snowmobile parking: DNR parking feature views for validated records. Only independently paired DNR county-map or public-operator records may show qualified directions toward the mapped parking marker. Conflict and asset-only records are view-only.

## Release gates

- A test must reject directions for an unverified reference or restricted role.
- In-app map selection and the external Google Maps action must refer to the same named stop or vetted parking feature.
- Preserve canonical, publisher identity, source links, attribution, ads, access caveats, and no-JavaScript fallbacks.
- Validate mobile touch targets, keyboard access, source failures, and stale map tiles.
- Run the full repository gate. Do not promise increased search CTR or traffic without measurements.

Reuse principles, not identical visual layouts. Each outdoor tool should keep its own place-specific field-guide voice.
