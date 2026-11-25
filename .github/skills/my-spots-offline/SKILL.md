---
name: my-spots-offline
description: "Saved places, a since-your-last-visit change summary and an offline last-known reading for chrisizworski.com tools, stored only on the visitor's device. Use when a return contract names something the visitor saves, when a tool adds favorites, my spots or saved places, or when a tool is used where signal is poor (U.P., ice, deer camp, open water)."
---

# My spots and offline: make the tool theirs, even with no signal

People come back to a tool that already knows their lake, town or trail and tells them what changed since they last looked. Many of these tools are opened where there is one bar of signal or none. This skill standardizes both, with everything kept on the visitor's device.

Run `return-visit-design` first; the contract says what is worth saving.

## Inventory before building

The hub already has scattered pieces: about 24 pages use `localStorage`, 2 register a service worker, and there are web manifests at `/site.webmanifest` and `/fall-color/site.webmanifest`. Search the tool's page and shared assets first, reuse an existing store or worker, and never register a second service worker over the same scope.

## Saved spots

- Store with [idb-keyval](https://github.com/jakearchibald/idb-keyval) (Apache-2.0, under 600 bytes compressed) for anything beyond a few small values; plain `localStorage` is fine for one setting.
- One namespaced, versioned key per tool: `ciz:<tool>:spots:v1`. Each spot holds `id`, `label`, the decision unit (region id, lake id, lat/lon rounded to 2 decimals), an optional threshold, `savedAt`, and `lastSeen` (`value`, `observedAt`).
- Wrap every read and write in try/catch. Private browsing, full storage and blocked storage must fall back to the normal page, never a blank one.
- No accounts, no sync, no server copy, no tracking ID. Provide a visible "clear saved spots" control.
- Saving is the investment step: offer it right after the visitor gets their answer, never before.

## Since your last visit

- On load, compare each saved spot's `lastSeen` with the current reading and show one computed line, for example "Kp rose from 2 to 5 since Tuesday 9:40 pm". Then update `lastSeen`.
- Only state changes the data supports. If the old value is older than the source's history, say "first check since" and stop.
- This line goes above the fold on phones for returning visitors only; first-time visitors see the normal page.

## Offline last-known reading

- Cache the tool's own API JSON with a network-first strategy and a short timeout (about 3 seconds), then fall back to the cached copy. Cache static assets with stale-while-revalidate.
- Use [Workbox](https://github.com/GoogleChrome/workbox) (MIT) strategies only if they can be added without a new build step; otherwise write a small hand-made service worker that follows the same two strategies. Do not add `workbox-build` or a bundler to the site build.
- Scope the worker to the tool's path so it cannot affect other tools or ads.
- Cached data always shows its observation time and a clear STALE label when older than the source's normal update interval. Never present a cached reading as live, and never for a safety call (ice, wind) without that label.
- Do not cache ad scripts, analytics or third-party map tiles you lack rights to store.

## Cost

Everything here runs in the browser: no Vercel function, no storage service, no extra build. If a change would add any, stop and say so in the PR.

## Verify

- With JavaScript off, the page still gives the full answer and no dead controls show.
- Playwright: save a spot, reload, see it; go offline (`context.setOffline(true)`), reload, see the cached reading with its time and STALE label; clear spots.
- Storage blocked: page still works.
- Run `web-quality-best-practices` for storage and service worker behavior and the owning repository's full gate. Follow Experience OS, Experience Investment and Foundry for visible UI; preserve Auto ads. Unrun checks are NOT VERIFIED. Do not auto-merge.
