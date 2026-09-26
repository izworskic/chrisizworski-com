# Pictured Rocks canonical subdomain cutover

## Goal

Move `https://picturedrocks.chrisizworski.com/` from the older standalone guide to the tested field-planner implementation in this repository without exposing the `/labs/` preview to indexing.

## Source contract

- Canonical public hostname: `https://picturedrocks.chrisizworski.com/`
- Committed product source: `/public/labs/pictured-rocks-planner/`
- Live data endpoint: `/api/pictured-rocks-live`
- Lab preview remains `noindex,nofollow` on `chrisizworski.com`.
- The existing root `middleware.ts` includes `/` and `/index.html` in its matcher and only promotes those paths when the request host is exactly `picturedrocks.chrisizworski.com`.
- Existing Niagara, Grand Coulee, Platte crane, Fort Madison, and API routing in that middleware remains intact.
- On the Pictured Rocks host, middleware serves the committed planner and replaces the lab-only robots meta with `index,follow,max-image-preview:large`.
- If the source cannot be fetched or the expected lab noindex marker disappears, the shell returns `503` with `X-Robots-Tag: noindex, nofollow` rather than indexing a broken release.

This keeps one implementation. There is no copied second Pictured Rocks app to drift away from the tested planner.

## Infrastructure cutover

The hostname must be assigned to the active `chrisizworski-com` Vercel project before DNS is changed. Do not point DNS at a project that does not already recognize the custom domain.

Immediately before changing ownership, record:

1. the current project/domain assignment for `picturedrocks.chrisizworski.com`;
2. the current Cloudflare DNS record value and proxy state;
3. the current working page response so rollback can be verified.

Then:

1. add `picturedrocks.chrisizworski.com` as a production domain on the active `chrisizworski-com` Vercel project;
2. update the existing Cloudflare record only if Vercel reports that a DNS change is required;
3. purge cached HTML for the Pictured Rocks hostname after the alias/origin switch;
4. verify `/`, `/api/pictured-rocks-live`, and the referenced `/assets/pictured-rocks-*` files through the custom hostname;
5. confirm the root response is HTTP 200, self-canonical to `https://picturedrocks.chrisizworski.com/`, indexable, and has no `noindex` directive;
6. confirm `https://chrisizworski.com/labs/pictured-rocks-planner/` remains `noindex,nofollow`;
7. verify the planner under at least a cruise, guided-kayak, Chapel-hike, dog, limited-walking, and active-closure scenario.

## Rollback

If any material check fails, restore the prior Vercel domain assignment and/or the recorded Cloudflare DNS value, purge cached HTML, and verify the older page is serving again. The source-controlled planner remains intact for another cutover attempt.

## Do not do

- Do not remove the lab `noindex` marker from the committed HTML.
- Do not create a second indexed Pictured Rocks URL on `chrisizworski.com`.
- Do not infer kayak or cruise safety from shoreline weather alone.
- Do not delete the older deployment until the custom hostname has passed post-cutover verification.
