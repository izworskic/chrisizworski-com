---
name: condition-alerts
description: "Calendar (.ics) and RSS/Atom feeds that tell visitors when a chrisizworski.com tool's answer changes, with no subscriber storage and no new Vercel function. Use when a return contract names a trigger, or when adding add-to-calendar, subscribe or feed links to a tool. Push notifications are out of scope by owner decision."
---

# Condition alerts: calendars and feeds, never push

The strongest reason to come back to a conditions tool is a trusted signal that the thing they care about just changed. This skill builds that signal with the two channels that need no server, no account and no subscriber list: a subscribed calendar and an RSS/Atom feed.

Run `return-visit-design` first. No return contract, no alert.

## Owner decision: no push notifications

On 2026-11-24 the owner ruled out push notifications permanently. Do not add ntfy, web push, service-worker push, SMS, email lists or any other push channel, and do not propose them. Do not ask for browser notification permission on new pages. If a trigger only makes sense as push, say so in the return contract and let saved spots and computed windows carry the return instead.

## Pick the channel by the shape of the trigger

| Trigger shape | Channel | Library | Why |
| --- | --- | --- | --- |
| A dated event or window (Bridge Walk, launch time, projected peak week, meteor peak) | Subscribed calendar, `webcal://` link to an `.ics` | [ics](https://github.com/adamgibbons/ics) (ISC) | The visitor's calendar app re-polls the feed on its own and shows updates. |
| A change log people check on their own time (fall color by region, ice-on progress, regional aurora outlook) | RSS 2.0 or Atom | [feed](https://github.com/jpmonette/feed) (MIT) | Feed readers and many email digest services subscribe to it. |

`/fall-color/rss.xml` and the garden pages' `.ics` export already exist. Reuse their patterns and do not ship a second feed for the same thing.

## Cost rules (hard)

- Never commit generated feed files to `main` on a timer. Every push to `main` is a Vercel build.
- Serve `.ics` and RSS from an API route the tool already has, with a long CDN cache (`s-maxage` of at least 900 seconds plus `stale-while-revalidate`), or generate them in the existing build when the content is static by rule (the Bridge Walk is "first Monday in September"). Calendar apps and readers then hit the CDN, not the function.
- No Redis, no KV of subscribers, no new paid service, no scheduled job per subscriber. State the added Vercel functions and builds in the PR body; the target is zero.

## Trigger rules

- A trigger is a computed threshold or a published date on a named source (NOAA SWPC Kp, MDOT or MBA wind status, GLERL ice cover, the launch provider's NET time). No AI-written feed text, ever.
- Every feed item carries: what changed, the value, the source, the observation time in America/Detroit, and one link to the exact section that answers it.
- One feed per decision unit the visitor would choose (region, lake, crossing) when the tool has them, not one per page.
- Write a feed item only on a real change of state, not on every refresh, so subscribers are not flooded.
- Safety topics (ice, wind, surf) report what the model computed and tell people to confirm locally. Never say "safe".
- Tag links with `utm_source` set to `calendar` or `rss` so `return-metrics` can count returns per channel.

## Calendar rules

- One stable `uid` per event that never changes; bump `sequence` on every edit; set `status: 'CANCELLED'` for scrubs instead of deleting the event.
- Times in America/Detroit unless the tool is national; then the place's own zone.
- Static HTML carries no hardcoded future year (same rule as the Bridge Walk module); dates come from the rule or the feed.

## Page integration

- Subscribe controls are plain links (`webcal://` and the feed URL) that work with JavaScript off. Script only adds conveniences such as "copy link".
- Keep subscribe controls out of ad slots and preserve Auto ads exclusions.

## Verify

- Validate each `.ics` against RFC 5545 (parse it back) and each feed against its spec; pin that in a test.
- Test the cache headers on the serving route and that no subscriber data or secret appears in the repository.
- Subscribe once in a real calendar app and a real feed reader, or report NOT VERIFIED.
- Run the owning repository's full gate. Follow Experience OS, Experience Investment and Foundry for any visible UI. Do not auto-merge.
