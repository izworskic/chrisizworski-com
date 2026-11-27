# St. Clair River Ship Watch: map and live cameras (2026-11-27)

Owner ask: "You need a map of ships and viewing locations. The camera needs embedded."

## Visitor decision
"Is there a ship worth driving to the river for, and which spot do I go to?" The board answers
*when*. Before this change the visitor still had to open a separate tracker to see *where* the ships
were and leave the site to find a camera, and the only camera link (Blue Water Area CVB) now
redirects to a homepage with no cameras.

## Two concepts considered
1. **Map-first page.** Replace the board with a full-width map and ship popups. Rejected: the
   tested window is the differentiator, and a map without it is what MarineTraffic and BoatNerd
   already do better. It would also hide the 0–2 h / 2–6 h evidence behind taps.
2. **Board first, then a map and cameras that picture the board (chosen).** The map is drawn from
   the reports the board already loaded (no second request), highlights ships that have a window
   at the chosen spot, and tapping a spot drives the board's tabs. Cameras sit next to it so a
   visitor can see the river before leaving, then watch a forecast ship go by.

## Guardrails kept
- The list stays the primary, accessible answer; the map has a live text summary.
- Positions are each ship's own latest report. The approximate model centreline is not drawn,
  because it is arithmetic, not a chart. Not for navigation.
- Leaflet is self-hosted and loads only when the map nears the viewport. One-finger drag is off on
  touch so the page still scrolls; zoom buttons work.
- Cameras are BoatNerd's own YouTube live streams (embedding enabled by the operator), loaded
  through youtube-nocookie only after the visitor presses play. No-JS gets a plain link.
- Stream ids rotate when the operator restarts a stream, so `river-cam-check.yml` checks daily
  and opens an issue with the operator's current streams. GitHub Actions only.

## Cost
No new Vercel function and no new API calls. Map tiles come from OpenStreetMap, as on other hub
maps.

## Proof
See the PR: 1280 px and 390 px screenshots, live data, error state, and the player loading each
stream. Actual video playback cannot be shown from the build sandbox, because YouTube blocks
playback from datacenter IPs. Before merging, check it on a phone.
