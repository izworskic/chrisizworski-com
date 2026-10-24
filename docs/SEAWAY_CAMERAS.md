# Seaway river cameras — source and release notes

Owner requested the Duluth camera experience for the Seaway, then rejected the camera bubbles and extra navigation as too complex. Both existing canonical pages gain one click-to-load player directly below the ship map. No new canonical, video proxy, paid API, polling job, dependency or ad-policy change.

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

## Current interaction: choose and watch

The owner requested a simpler interface after the first release. Camera bubbles and camera/map-jump controls have been removed entirely. The ship map retains ships, locks and public viewing; cameras stay in a straightforward panel immediately after its regional report cards and freshness note. The map, ship list, report cards and coverage note stay together above the cameras.

- Four named camera buttons open one shared video player directly, in one click. There is no separate Load action, map popup, map-jump button or large empty video placeholder. The idle panel has a compact instruction. Stop appears only while the player is open.
- Switching cameras replaces the frame; Stop or hiding the tab removes it. Returning does not restart video automatically. AIS refresh never recreates or stops the camera.
- Camera choice remains shareable in the URL. Opening that link selects the view but does not automatically request video. Unknown IDs are rejected.
- Both pages name the upper-river locations and state that these cameras do not show Eisenhower Lock or a lock chamber. No arrival or visibility inference is made.
- YouTube and operator attribution links stay visible. One short fallback instruction replaces the longer technical copy. No live/connected badge is inferred from an iframe load event.
- Fixed-label analytics retain camera selections and player requests; camera-map events are removed. No visitor coordinates or search text enter these events.

## Verification

Focused tests cover initial no-frame behavior, explicit loading, one-frame replacement, stop/hidden-tab teardown, stable frame identity for unchanged selection, rejected unknown IDs, direct camera/Stop behavior, four-feed/no-camera-map-control contracts and both pages' geographic labels. The required full repository gate and deployment/browser status are recorded in the PR and growth handoff. Portrait and reduced-motion browser emulation remain unavailable in the current cloud browser; responsive controls and reduced-motion map scrolling are implemented without claiming device acceptance.

GSC, GA4 demand and AdSense results: NOT AVAILABLE. Camera usage is measurable after release; no impression, CTR or revenue uplift is claimed.

## Deployed preview acceptance

PR #1132, initial source head `e90900c9`, passed all 55 local gates, CI verification/build and public audit. Preview browser checks confirmed zero initial frames; correct stream/source changes for all four choices; a single frame while loaded; removal on Stop; preservation through an AIS refresh; camera-area/map behavior from that historical first release. Those map-camera controls are removed by the later owner-requested simplification. The Eisenhower page opened with a shared Brockville camera selection but no automatic video request, and retained the prominent upper-river/not-lock-chamber explanation.

This cloud browser loaded the YouTube player document and video element but received no media frames (`readyState: 0`, time 0, videoWidth 0). The existing production Duluth player behaved identically in the same browser. Visual playback is therefore **not verified** here; it is not reported as a working video merely because an iframe loaded. No application console error was observed (an extension metadata error was external). The operator metadata and embed permissions are verified, and fallback/source links remain visible. This limitation is recorded in the release PR rather than hidden behind a false live/online status.
