# Michigan Wine Day — architecture and evidence

## Product boundary

The statewide product owns one decision: **which Michigan wine region is the best use of this person's day?**

It does not own winery detail, final winery routing or a statewide winery directory. Old Mission and Leelanau stay authoritative in `izworskic/tcwine`; Petoskey stays authoritative in `izworskic/petoskey-wine-region`. The statewide layer consumes compact region contracts and hands the user back downstream.

## Region model

Production comparison covers four visitor-useful choices:

- Old Mission Peninsula — official AVA and wine-trail geography.
- Leelanau Peninsula — official AVA and wine-trail geography.
- Petoskey / Tip of the Mitt — visitor region backed by the Tip of the Mitt AVA and Petoskey Wine Region association.
- Southwest Michigan / Lake Michigan Shore — a broad official wine geography that is deliberately decomposed into Baroda/Berrien Springs, St. Joseph/Benton Harbor/Coloma, Fennville/South Haven and Paw Paw/Kalamazoo visitor clusters.

The Southwest cluster model is required because Lake Michigan Shore sources span New Buffalo north toward Saugatuck and east toward Kalamazoo. Treating it as one compact peninsula loop would create false driving precision.

## Decision order

1. Coverage gate.
2. Travel/time gate.
3. Operating-evidence gate, where unknown hours remain possible-but-unverified rather than closed.
4. Soft fit ranking: usable wine-country time, travel efficiency, positive wine-intent evidence, within-region compactness and experience fit.
5. Weather is a small modifier only.
6. Evidence confidence is calculated independently from fit.

Public output intentionally omits an opaque numeric score.

Positive intent evidence saturates after a small number of signals. This prevents Leelanau or any other larger inventory from winning merely because it has more winery records while still allowing a real style difference, such as sparkling, to change a close decision.

## Free/open dependencies and failure behavior

- Common origin cities use curated public city centroids.
- Other submitted cities/ZIPs use Nominatim only after form submission, never autocomplete. The dependency remains swappable.
- Road travel uses a best-effort OSRM table request. If it fails, the engine uses a labeled straight-line/road-factor estimate.
- Weather uses National Weather Service forecasts when the target date is inside forecast range. Weather failure removes the modifier.
- Regional adapter failure uses a dated compact snapshot and lowers confidence.
- The Southwest adapter uses official Lake Michigan Shore membership plus current first-party winery evidence. Weekly hours are counted as known only where a current schedule was verified.

## Regional handoff contract

Traverse City and Petoskey planners already support `#plan=<base64url>`. Michigan Wine Day populates the existing version-1 plan payload with date, usable local start/end, area, intent-related style tags and three starter stops. The regional planner remains responsible for final route order and hours scheduling.

Southwest currently has no equivalent full regional planner. Its noindex handoff keeps the user in the chosen cluster, provides a small starter sequence with official winery links, and opens the route externally. It is intentionally not promoted as a second canonical search surface.

## Analytics privacy

Analytics use bounded values only: origin class, time-window class, intent, winning region, confidence class, recommendation-change flag, alternative region and handoff. Exact submitted city/ZIP, coordinates, street address and arbitrary free text are not sent.

## Safety

The interface includes practical designated-driver/shuttle guidance. It does not estimate BAC or advise how much alcohol a person can consume before driving.
