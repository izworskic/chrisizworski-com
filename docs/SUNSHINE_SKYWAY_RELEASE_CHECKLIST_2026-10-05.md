# Sunshine Skyway release checklist

Release only when all of the following are true:

- full repository verification is green;
- Sunshine Skyway value score is at least 97/100 with no hard-loss veto;
- `/api/sunshine-skyway` uses the live FL511 traffic adapter;
- raw NWS wind cannot set operational bridge status;
- stale FL511 data cannot become a fresh optimistic state;
- current all-electronic toll amounts remain server-side and direction/plaza mapping is correct;
- the bridge camera uses FL511 live video with native HLS / Hls.js playback when a `videoUrl` is available;
- the official FL511 view remains the camera fallback;
- camera failures cannot block bridge status;
- the 390 px decision layer precedes weather, camera, map and narrative detail;
- canonical, Open Graph/X, creator schema, tools directory, national tools, sitemap, llms.txt and bridge-network discovery are present;
- merge only after CI is green;
- after merge, verify the exact production SHA, public page, API and camera path.
