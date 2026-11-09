# Shipping release evidence

Local handoffs: `browser-acceptance.json`, tracker/Soo mobile screenshots. The repeatable command is `NODE_PATH=<Playwright install> CHROME_PATH=<Chromium executable> node scripts/verify-shipping-handoffs-browser.cjs`. It runs the actual static pages with external services blocked and deliberate API 503s, checks real navigation, checks the existing delegated GA4 event, and covers 360/390/1440px with JavaScript on/off. These are navigation tests, not simulated live-shipping demonstrations.

Production baseline: `production-captures.json`, tracker report card and Welland viewing screenshot show actual November 9 source responses. Captures precede deployment of this PR. `duluth-mobile-check.json` records the actual 390px camera selection and no horizontal overflow; video playback is not proven. Full monitor screenshots include an unrendered map background and are QA evidence, not finished map promotion artwork. The promotional document uses the selected-ship, Welland viewing and Duluth viewing close-ups.

Local verification: full `npm run verify:all`, all 60 steps passed twice; final run 91 seconds after targeted freshness changes. The repository dependencies were installed with `npm ci`; no dependency manifest changes. No source/API, map, camera, ad, title or canonical implementation was changed. The only added CSS styles the tracker link row. New links use existing analytics collection.

All JSON-LD blocks and original anchors remain. No new canonical routes or sitemap URL additions/removals. The three modified page dates and corresponding sitemap entries are November 9, 2026. This records code and browser behavior, not a measured search/revenue result or a deployment.
