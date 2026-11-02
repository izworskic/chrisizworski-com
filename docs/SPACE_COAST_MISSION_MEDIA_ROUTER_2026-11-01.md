# Space Coast Mission Media Router: official webcasts vs actual pad cameras
Research and implementation: November 1, 2026

## Visitor problem

A visitor searching for a launch camera usually confronts a confusing bundle
of mission streams, historical YouTube replays, general-area pad cams, NASA
programming and aggregator sources. A webcam that is continuously available is
not necessarily pointing at the rocket being launched. A metadata flag that
someone set "live" is not a verified live player. This tool must never pretend
those are the same evidence.

The Experience OS principle is to give the visitor the right next action
with explicit provenance, not another feed wall.

## Verified source inventory (Nov 1 2026)

1. Launch Library 2 launch API, existing site's shared live schedule:
   https://ll.thespacedevs.com/2.3.0/launches/upcoming/
   Existing production call adds Florida launch-location filter. LL2's
   per-launch \`vid_urls\` includes:
   \`priority,source,publisher,title,description,feature_image,url,type,
   language,start_time,end_time,live\`. The launch record can include
   \`webcast_live\` boolean. The \`type.name\` category is published as
   "Official Webcast", "Unofficial Re-stream" etc. These are third-party
   classification and possibly stale, never proof the provider owns a
   channel or that a player is currently emitting a live feed.
   Example official LL2 evidence:
   https://ll.thespacedevs.com/2.3.0/launches/ac897b9f-44d2-4ff4-8416-1a0a076e98a2/?format=api
   No additional upstream LL2 queries are needed.

2. Spaceflight Now's own LIVE page:
   https://spaceflightnow.com/live/
   Source verified Nov 1 2026: first-party page calls its persistent camera
   "Launch Pad Live" showing 24/7 Cape Canaveral pad views. The first-party
   embed points to YouTube ID \`thfYPsRqxmw\`. Its OWN newsroom live-coverage
   availability is separate from the always-on camera. Camera angle, stream
   health, exact pad and selected mission remain unverified without playback.

3. NASASpaceflight official own GitHub profile:
   https://github.com/NASASpaceFlight
   First-party README explicitly links "Space Coast Live" with 24/7 Florida
   launch operation views to YouTube ID \`Jm8wRjD3xVA\`.
   This is the independent **NASASpaceflight** outlet, not NASA. The channel
   may switch coverage to LC-39A, Starship construction or Port Canaveral
   Fleetcam. It does not certify a particular pad's current condition.

4. Official NASA live programming:
   https://www.nasa.gov/live/
   NASA publishes a programming schedule and links to NASA+ and approved
   provider streams. A generic NASA Live event is not automatically the
   webcast for any given commercial launch.

5. Mission providers:
   https://www.spacex.com/launches
   https://www.ulalaunch.com/missions
   https://www.blueorigin.com/missions
   These operator directories are navigation choices only, NOT checked
   mission-specific broadcast URLs. Only include a directly mission-linked
   webcast if it arrived as video metadata on the exact LL2 launch ID;
   don't match by fuzzy mission title or borrow a different rocket's video.

## Source-to-customer model

\`normalizeLaunch(l)\` in \`lib/space-coast-decision.js\` now carries
\`media: normalizeMissionMedia(l)\`.

The independent signed 15-minute Postgres-backed LL2 schedule watch
\`lib/space-coast-launch-day.js\` now also persists its sanitized \`media\`
field in each exact-mission snapshot, so a visitor with a fresh shared
schedule sees the same video metadata as one on a direct LL2 fallback.

The cached \`/api/space-coast-launch\` response calls
\`buildMediaDesk(selectedLaunch, {checkedAt,...})\`, which returns:
- mission ID, title, pad, last LL2 observation and recency;
- at most five sanitized mission-specific videos, sorted with finished
  streams behind current candidates, LL2-labeled official webcast first;
- per-item publisher, LL2 classification, reported live flag,
  published start/end timestamps and original safe provider link;
- the two independently sourced general camera entries;
- optional operator directory, carefully differentiated from a verified
  mission-specific stream;
- explicit \`cameraHealthChecked: false\` and
  \`streamHealthChecked: false\` fields.

All YouTube IDs, link protocols and hosts are strictly normalized in
\`trustedVideoUrl\`. X broadcasts, operator mission pages, and NASA mission
pages may be opened by outbound links but never placed in an arbitrary iframe.
Third-party metadata strings are stripped of control and HTML markup before
publication. Upstream \`feature_image\` links are not used; YouTube thumbnails
are displayed only by constructing a fixed i.ytimg.com URL from an 11-character
YouTube video ID verified by the backend. This is a video preview, explicitly
not a current camera still.

No video is automatically loaded. A visitor selects a source and then
explicitly chooses "Play from YouTube". Only that action adds the
\`youtube-nocookie.com\` iframe, with a direct outbound link as fallback.
The service does not mirror, record, download or rehost footage.

Source confidence has three intentionally separate levels:
- **Matched to mission:** \`vid_urls\` directly attached to selected LL2 ID.
- **Official status:** "LL2 lists as official webcast" is not
  independently confirmed operator authorization.
- **Playback state:** a source \`live: true\` report is only displayed as
  "**LL2 reports live at the last checked observation**" when its metadata is
  recent and not marked ended; it cannot establish current player uptime.
  \`webcast_live\` without a specific stream is never used to activate
  a particular video or fabricate a live badge.

## Presentation design and experience OS

The cinema-dark Mission Media Control Room sits after the launch-day
schedule desk, before weather and geography. This is a purpose-built visual
journey, not cloned from a generic guide.

- One genuine provider thumbnail, constrained to 16:9.
- Two logically separate source menus: **This mission's webcast** and
  **Space Coast cameras**.
- Exact mission matching and evidence timestamps in visitor plain English.
- Optional source selection. Video playback only after a second user click.
- Real provider links and visible streaming privacy caveats.
- Mobile source selector compacts into two columns when possible, one
  column on narrow phones. All button backgrounds/text contrast verified.
- Failure or missing LL2 media shows "no link listed yet", NOT "no broadcast".
- NPS current closures, CARTO map, KSC operator ticket notices, weather,
  geographic intelligence, SEO canonical/indexing and advertising protections
  are preserved.

## Verification and next phases

\`node --test tests/space-coast-media.test.js\`
\`node --test tests/space-coast-launch-day.test.js\`
\`node --test tests/space-coast-live.test.js\`
Then all CI repository / HTML audits, name SERP protection, Vercel preview
and exact production READY + desktop/mobile live UI/URL validation.
Check the actual first selected launch's webcast records; a launch may
correctly have no \`vid_urls\` yet.

Next research opportunities, NOT claimed in this release:
- Operator-verifiable mission channel IDs or per-mission webcast feed health:
  only if a reliable, permission-compliant API exists and source identity
  and matching can be proven.
- Space Force 45th Weather Squadron launch-weather probability bulletins
  versus spectator NOAA/NWS cloud cover; these are different concepts.
- Florida 511 official road condition/camera integration and NPS access
  compatibility, only with usable data licenses and genuine geography.

Never infer an official launch from a camera moving, a countdown reaching zero,
or a news outlet's stream starting. No unsupported weather confidence score.
