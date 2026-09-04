# Chris Izworski Site Network Analytics Standard

Effective: 2026-09-04

All public pages emitted by `chrisizworski-com` use Google Analytics 4 measurement ID `G-Y5D2V2W7HN`.

The repository's `vercel-build` script must run `scripts/inject-ga4.mjs`, which recursively tags every HTML document under `public/`. New static pages and newly generated pages therefore inherit analytics automatically at deployment.

Standalone tools extracted into their own repositories must implement the same shared measurement ID at a root/global layout, shared server-rendered HTML wrapper, or idempotent build/deploy injector. They must not rely on copying the tag into individual pages.

Freighter View Farms is part of the same measurement network and uses `G-Y5D2V2W7HN`. Because the public site is WordPress-hosted, the measurement ID must be installed through the WordPress/hosting analytics or tag integration so all rendered pages inherit it.

A new public tool is not production-ready until representative rendered production HTML is verified to contain its expected measurement ID. A source commit alone is not proof of a live analytics deployment.
