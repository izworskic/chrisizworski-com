# Sunshine Skyway camera contract

Use FL511 official camera data. Prefer the exact Skyway Bridge View. If FL511 returns HLS `videoUrl`, play it in an in-page video element with native HLS or Hls.js. Keep one stream active, destroy old player instances, preserve the official FL511 fallback link, never infer traffic delay or bridge status from imagery, and never scroll the user away from the viewer.
