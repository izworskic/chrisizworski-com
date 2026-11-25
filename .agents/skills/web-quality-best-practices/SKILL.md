---
name: web-quality-best-practices
description: "Review security, privacy, third-party scripts, permissions, storage, embeds and failure behavior in the browser. Use when adding a third-party script, widget, embed, permission prompt, local storage or offline behavior, when the console shows errors, or when asked for a resilience or security review."
---

# Browser best practices

Every script, embed and permission prompt is a promise to the visitor and a way for the page to break. Prefer plain HTML and first-party JavaScript; anything else has to earn its place and fail quietly.

## 1. Third-party code

Before adding any third-party script, widget or embed, write down: what it does that first-party code cannot, its size, what data it sends and to whom, whether it sets cookies, and what the page does when it fails or is blocked.

- Load it `async` or after interaction, never blocking in `<head>`. A facade (static preview, real widget on click) is the default for heavy embeds such as video and maps from other services.
- Pin it: a fixed version, and Subresource Integrity (`integrity` plus `crossorigin`) for scripts and stylesheets served from a CDN.
- Its failure never blanks the answer: wrap initialization, keep the static answer visible, show a short "unavailable" note.
- No new tracking or analytics beyond the existing GA4 and Auto ads without the owner's approval.

## 2. Permissions

Ask for location, notifications, camera or microphone only after the visitor presses a control that needs it, with a sentence saying why. Never on page load. Always offer a way to proceed without it (type a town, pick from a list). No push notifications of any kind (owner rule, AGENTS.md).

## 3. Storage and privacy

Store only what the visitor chose to save (`my-spots-offline`), on the device, with a clear way to remove it. No personal data in URLs, logs or analytics events. Label the time of any cached reading.

## 4. Security basics

- HTTPS only, no mixed content.
- Security headers present: Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, and a Content-Security-Policy that at least sets `frame-ancestors`. Headers live in `vercel.json`; change them only in a reviewed PR, tested against Auto ads and existing embeds, because a strict CSP can block ads.
- No secrets, API keys or tokens in client code or public files.
- No exposed source maps with original sources.
- API routes keep `X-Robots-Tag: noindex`.

## 5. Code health

- Valid HTML5 doctype, charset first in `<head>`, viewport meta, no duplicate ids.
- No console errors or unhandled promise rejections in the main journey.
- Passive listeners for scroll and touch; no deprecated APIs (`document.write`, synchronous XHR).
- Images carry `width` and `height`; semantic elements over generic `div`s.

## Output

The third-party ledger (each script: purpose, size, data sent, failure behavior), permission flows, storage, headers checked, console state and fixes. Unchecked items NOT VERIFIED.

## Boundaries

Experience OS, Playwright Browser QA and owning-repository tests remain authoritative. Preserve Auto ads, canonical and Person identity. No Redis, paid service or new dependency. Open a PR; do not auto-merge.

## Sources

Adapted from addyosmani/web-quality-skills, `best-practices` (MIT): security, compatibility, permissions and code-quality checklists, rewritten for this repository. Reference only.
