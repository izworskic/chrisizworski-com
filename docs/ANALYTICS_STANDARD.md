# Chris Izworski Site Network Analytics Standard

Effective: 2026-09-04
Updated: 2026-10-01

All public pages emitted by `chrisizworski-com` use Google Analytics 4 measurement ID `G-Y5D2V2W7HN`.

The repository's `vercel-build` script must run `scripts/inject-ga4.mjs`, which recursively tags every HTML document under `public/`. New static pages and newly generated pages therefore inherit analytics automatically at deployment.

The same injector also installs `/assets/ai-referral-measurement.js` on every public HTML page. The AI referral layer is deliberately additive: it does **not** overwrite GA4 campaign source, medium, referrer, or other native attribution fields.

When the landing request is attributable to a supported AI assistant by a recognized referrer hostname or an explicit `utm_source`, the browser emits:

- a generic `ai_referral_landing` event; and
- one assistant-specific event, such as `chatgpt_referral_landing`.

For ChatGPT, recognized signals are `chatgpt.com` / `chat.openai.com` referrers and `utm_source=chatgpt.com` / `utm_source=chatgpt`. The UTM path is important because some browsers or app handoffs strip the HTTP referrer.

The event also sends the following non-personal event parameters for audit/debugging: `ai_assistant`, `ai_referrer_host`, `ai_detection`, `ai_event_version`, `landing_path`, and `referral_utm_source`. These parameters must not contain prompts, conversation content, user IDs, email addresses, full referrer URLs, or other personal data.

A 30-minute per-assistant/per-landing-path browser-session dedupe prevents reloads from inflating the landing-event count. Ordinary Google/Bing referrals must not be classified as AI traffic merely because the search engine also operates an AI assistant.

For reporting, prefer GA4's native session source/medium and landing-page dimensions as the primary attribution record. Use `chatgpt_referral_landing` as the independent audit/fallback segment. If event parameters are needed in GA4 reports, register the exact parameter names as event-scoped custom dimensions in the property; until they are registered, the event names themselves remain reportable.

Revenue attribution should use GA4's publisher/ad revenue metrics only when the production GA4 property is actually linked to AdSense and exposed to the reporting connection. Do not estimate ChatGPT revenue from page RPM or general site revenue when the direct join is unavailable.

Standalone tools extracted into their own repositories must implement the same shared measurement ID at a root/global layout, shared server-rendered HTML wrapper, or idempotent build/deploy injector. They must not rely on copying the tag into individual pages. If they participate in AI referral reporting, they should also install the shared AI referral measurement layer or an equivalent implementation with the same event contract.

Freighter View Farms is part of the same measurement network and uses `G-Y5D2V2W7HN`. Because the public site is WordPress-hosted, the measurement ID must be installed through the WordPress/hosting analytics or tag integration so all rendered pages inherit it.

A new public tool is not production-ready until representative rendered production HTML is verified to contain its expected measurement ID. A source commit alone is not proof of a live analytics deployment.
