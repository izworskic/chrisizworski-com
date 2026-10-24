# Seaway river cameras — source and release notes

Owner requested the Duluth camera experience for the Seaway. Both existing canonical pages gain one click-to-load player directly below the ship map. No new canonical, video proxy, paid API, polling job, dependency or ad-policy change.

## Sources reviewed October 23, 2026

| Camera | Operator | Current video ID | Provenance |
| --- | --- | --- | --- |
| Brockville City Hall south | City of Brockville | `k36fwVlkzBM` | https://brockville.com/river-webcams/ names the location and links the stream |
| Brockville Blockhouse Island west | City of Brockville | `wJTwuekiCr0` | Same official city page identifies the west-facing camera |
| Alexandria Bay river view | Alexandria Bay Chamber of Commerce | `H_EbNSqfoso` | https://visitalexbay.org/area-videos/ establishes operator; the operator's YouTube streams page supplies the current feed |
| Alexandria Bay docks | Alexandria Bay Chamber of Commerce | `yWr9-HqS2Ys` | https://www.youtube.com/@alexandriabaychamberofcomm5890/streams |

The Chamber page's old IDs `XfiHdsxawCY` and `6DDfSIMfi0c` returned oEmbed players but YouTube player metadata reported UNPLAYABLE, liveNow false, and unavailable live recordings. They are deliberately excluded. The current channel identity `UCSJ2YAapD9w3rYhDKgp9GeA` matches the old official videos; its current streams list identifies the replacement river and dock streams. A successful oEmbed response alone is not proof of a working live feed.

The city's current video metadata reported OK and liveNow true. All four selected streams reported player status OK, playableInEmbed true and liveNow true during the source check. These are dated observations, not a permanent uptime promise. No automatic “online” status is inferred from iframe loading.

Only the operator's YouTube player is embedded; video is not downloaded, rehosted, proxied, stripped of branding or monetized separately. Publisher-enabled embedding is used through the normal YouTube player; it is not represented as a general copyright license. Owner/source links remain visible. The Chamber fallback points to its current streams page because its tourism-page links had become stale.

## Interaction and geographic limits

- Four camera buttons, one video frame. Initial HTML has no iframe. Choosing a camera or pressing Load requests its YouTube privacy-enhanced player, with muted user-initiated playback, lazy loading, fullscreen permission and strict-origin-when-cross-origin referrer policy.
- Stop, switching to another camera, or hiding the browser tab removes the old frame. Returning to the tab does not restart video automatically. AIS refresh never recreates or stops a playing camera.
- Camera selection is URL-backed and validated against the reviewed inventory. Opening a shared URL selects a view but does not load video automatically. Back/forward selection changes unload the old camera.
- Two screen-stable CAM area markers avoid overlapping river/dock views at each city. Both views are offered inside each area's popup. Approximate city-area anchors are not camera-mount coordinates, viewing cones or visitor entrances. Camera selection highlights its area; Show camera area on map explicitly switches AIS to the upper-river region and zooms to the approximate area.
- Both pages clearly identify Brockville, Ontario and Alexandria Bay, New York. They explicitly say these feeds do not show Eisenhower Lock or any lock chamber. No inferred ship visibility, arrival, queue or lock occupancy.
- Source links remain available when a player is offline, ended, restricted or blocked. Cross-origin players cannot be reliably diagnosed with a normal iframe load event, so no false “live/connected” badge is shown.
- Fixed-label analytics record camera selection, player requests and map focus. No visitor coordinates or search text are transmitted by these events.

## Verification

Focused tests cover initial no-frame behavior, explicit loading, one-frame replacement, stop/hidden-tab teardown, stable frame identity for unchanged selection, rejected unknown IDs, selected camera map callbacks, four-feed/two-area contracts and both pages' geographic labels. The required full repository gate and deployment/browser status are recorded in the PR and growth handoff. Portrait and reduced-motion browser emulation remain unavailable in the current cloud browser; responsive controls and reduced-motion map scrolling are implemented without claiming device acceptance.

GSC, GA4 demand and AdSense results: NOT AVAILABLE. Camera usage is measurable after release; no impression, CTR or revenue uplift is claimed.

## Deployed preview acceptance

PR #1132, initial source head `e90900c9`, passed all 55 local gates, CI verification/build and public audit. Preview browser checks confirmed zero initial frames; correct stream/source changes for all four choices; a single frame while loaded; removal on Stop; preservation through an AIS refresh; two camera-area markers; and selected-camera map-region/URL updates. The Eisenhower page opened with a shared Brockville camera selection but no automatic video request, and retained the prominent upper-river/not-lock-chamber explanation.

This cloud browser loaded the YouTube player document and video element but received no media frames (`readyState: 0`, time 0, videoWidth 0). The existing production Duluth player behaved identically in the same browser. Visual playback is therefore **not verified** here; it is not reported as a working video merely because an iframe loaded. No application console error was observed (an extension metadata error was external). The operator metadata and embed permissions are verified, and fallback/source links remain visible. This limitation is recorded in the release PR rather than hidden behind a false live/online status.
