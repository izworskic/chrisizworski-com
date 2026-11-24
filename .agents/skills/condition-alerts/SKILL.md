---
name: condition-alerts
description: "Threshold alerts for chrisizworski.com tools delivered as subscribed calendars (.ics), RSS/Atom feeds and ntfy phone push, with no subscriber storage and no new Vercel function. Use when a return contract names a trigger, when adding an alert, notify-me, add-to-calendar or feed to a tool, or when replacing tab-only browser notifications."
---

# Condition alerts: tell people when the answer changes

The strongest reason to come back to a conditions tool is a trusted signal that the thing they care about just changed. This skill builds that signal three ways, cheapest first, without accounts, email lists or a database of subscribers.

Run `return-visit-design` first. No return contract, no alert.

## Pick the channel by the shape of the trigger

| Trigger shape | Channel | Library | Why |
| --- | --- | --- | --- |
| A dated event or window (Bridge Walk, launch time, projected peak week, meteor peak) | Subscribed calendar, `webcal://` link to an `.ics` | [ics](https://github.com/adamgibbons/ics) (ISC) | The visitor's calendar app re-polls the feed on its own and shows updates. No app, no push service. |
| A change log people check on their own time (fall color by region, ice-on progress) | RSS 2.0 or Atom | [feed](https://github.com/jpmonette/feed) (MIT) | Readers and many email digest services subscribe to it. |
| A threshold crossing that matters within hours (Kp for a region tonight, wind restriction lifted, launch scrubbed) | ntfy push to a topic | [ntfy](https://github.com/binwiederhier/ntfy) (Apache-2.0 or GPLv2) | Free phone and web push with no account for the visitor; we publish, ntfy fans out. |

`/fall-color/rss.xml` and the garden pages' `.ics` export already exist. Reuse their patterns and do not ship a second feed for the same thing.

## Cost rules (hard)

- Never commit generated feed files to `main` on a timer. Every push to `main` is a Vercel build.
- Serve `.ics` and RSS from an API route the tool already has, with a long CDN cache (`s-maxage` of at least 900 seconds plus `stale-while-revalidate`), or generate them in the existing build when the content is static by rule (the Bridge Walk is "first Monday in September"). Calendar apps and readers then hit the CDN, not the function.
- Publish ntfy messages from a scheduled GitHub Actions workflow that reads one cached API response per run. Nothing per subscriber runs anywhere.
- No Redis, no KV of subscribers, no new paid service. State the added Vercel functions and builds in the PR body; the target is zero.

## ntfy safety (owner decision before the first alert)

On the public ntfy.sh server a topic has no owner: the topic name works as a password, so anyone who knows a broadcast topic printed on the site could post to it. Before launch, one of these must be true, and the owner chooses which:

1. The topics are reserved on ntfy.sh (a paid tier) with anonymous write denied, or
2. The topics live on a self-hosted ntfy server (the network VPS) with access control: anonymous read, publish only with a token.

The publish token lives in a GitHub Actions secret, never in the repository or in page code. Until the owner decides, build and test against a random private topic and report push as NOT VERIFIED.

## Trigger rules

- A trigger is a computed threshold on a named source field (NOAA SWPC Kp, MDOT or MBA wind status, GLERL ice cover, the launch provider's NET time). No AI-written alert text, ever.
- Every message carries: what changed, the value, the source, the observation time in America/Detroit, and one link to the exact section that answers it.
- Add a cooldown so a value bouncing around the threshold sends one alert, not five. Re-alert only on a real step up (Kp 5 to 7) or on a reversal the visitor acts on (restriction lifted).
- One topic or feed per decision unit the visitor would choose (region, lake, crossing), not one per page and not one per user.
- Safety topics (ice, wind, surf) report what the model computed and tell people to confirm locally. Never say "safe".
- Tag links with `utm_source` set to `ntfy`, `calendar` or `rss` so `return-metrics` can count returns per channel.

## Calendar rules

- One stable `uid` per event that never changes; bump `sequence` on every edit; set `status: 'CANCELLED'` for scrubs instead of deleting the event.
- Times in America/Detroit unless the tool is national; then the place's own zone.
- Static HTML carries no hardcoded future year (same rule as the Bridge Walk module); dates come from the rule or the feed.

## Page integration

- The subscribe controls are plain links (`webcal://`, the feed URL, the ntfy topic URL) that work with JavaScript off. Script only adds conveniences such as "copy link".
- Replace tab-only `Notification` prompts on the aurora, flight tracker and Mackinac Bridge pages with "get this on your phone" (ntfy) as each page is reworked; do not ask for browser notification permission on page load.
- Keep subscribe controls out of ad slots and preserve Auto ads exclusions.

## Verify

- Validate each `.ics` against RFC 5545 (parse it back) and each feed against its spec; pin that in a test.
- Test the cache headers on the serving route and that no subscriber data or secret appears in the repository.
- Send one real push to a private topic and read it on a phone, or report NOT VERIFIED.
- Run the owning repository's full gate. Follow Experience OS, Experience Investment and Foundry for any visible UI. Do not auto-merge.
