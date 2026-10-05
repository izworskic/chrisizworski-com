# Sunshine Skyway runtime addendum — FL511 live data and camera playback

Date: 2026-10-05

This addendum records two implementation details discovered during runtime validation after the core Sunshine Skyway value/loss architecture was written.

## FL511 live data

The public FL511 traffic list is a JavaScript-backed surface. The Sunshine Skyway production adapter therefore consumes the FL511-owned data paths that back the public interface instead of treating the server-rendered table shell as live traffic evidence:

- Traffic rows: `POST https://fl511.com/List/GetData/traffic`
- Camera rows: `GET https://fl511.com/List/GetData/Cameras?...`

Traffic rows are filtered conservatively to explicit `Sunshine Skyway` / `Skyway Bridge` references before they may affect operational state. Generic I-275 events do not become Skyway-specific evidence.

The original authority hierarchy is unchanged: explicit current FDOT/FHP/FL511 operational evidence can establish a closure or bridge-specific impact; NWS weather cannot.

## FL511 camera video

The FL511 camera response can expose a `videoUrl` for the Skyway camera. That stream is HLS. V1 therefore does not place the stream URL blindly in an iframe.

Playback contract:

1. render a standard in-page `<video>` element;
2. use native HLS where the browser supports it;
3. otherwise load Hls.js 1.7.3 and attach the FL511 stream to that video element;
4. destroy the previous HLS player before switching camera state;
5. if HLS playback fails, keep the official FL511 page/view as the fallback;
6. camera failure never changes or blocks the operational bridge decision.

This incorporates the Maryland Bay Bridge camera lesson before the Sunshine Skyway first production release rather than after launch.
