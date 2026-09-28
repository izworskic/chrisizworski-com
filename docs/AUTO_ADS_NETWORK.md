# Auto ads across the tool network

Owner instruction, September 27, 2026: Auto ads should be the default across
existing and future published tool/content pages, with individual exceptions.

## Loss function and acceptance criteria

Use normalized rates in [0,1], not an invented success score:

`L = 0.45 C + 0.25 U + 0.20 D + 0.10 R`

- **C — coverage loss:** eligible discovered documents with missing, duplicate,
  legacy or wrong-publisher code divided by eligible discovered documents.
  HTTP/fetch failures and unresolved client-rendered pages remain unknowns;
  report them separately and fail coverage verification rather than dropping them.
- **U — experience loss:** sampled visitor tasks blocked by ads, controls obscured,
  content split, or unacceptable movement divided by sampled tasks. Include mobile
  and desktop map interaction, result reading, forms, and internal navigation.
- **D — delivery uncertainty:** production domains without current authenticated
  evidence of site approval, Auto ads enabled, no serving restriction, and a recent
  Auto-ads report divided by production domains. A code tag is not delivery proof.
- **R — regression rate:** new/generated eligible routes missing integration divided
  by new/generated eligible routes. Build verification target is zero.

Do not calculate a complete L while U or D is unmeasured. Missing evidence is not
zero loss. Initial goals are 100% code coverage of eligible documents, zero duplicate
loaders/wrong publishers/blocked controls, and every production domain verified in
AdSense. Filled impressions on every visit are not a defensible target: inventory,
consent, region, browser blocking and Google's decisions affect delivery.

Revenue metric: compare Auto-ad impressions per 1,000 actual page views, page RPM,
viewability, engaged sessions and tool completion over comparable complete windows.
Do not optimize for accidental clicks. Do not infer uplift from a short post-release
sample or count our own diagnostic visits as audience growth.

## One default, explicit exceptions

`config/in-article-ads.json` remains the authoritative configuration for compatibility
with deployed integrations. Its current strategy is `auto`, `loaderMode` is
`standard`, and `enabled: false` disables **our manual placements**, not Auto ads.
The legacy filename is not a requirement to use manual units.

Google receives the standard asynchronous code with publisher
`ca-pub-8222782620788075`. There is no scroll, section, card, content-length or
manual-slot requirement for loading it. Existing manual runtime is retained only
as a rollback option; it does not initialize under this default.

All published content pages, including future tool homepages, inherit this policy.
Utility/error/redirect/private-preview/noindex documents remain outside the policy.
Those are document-type exclusions, not arbitrary tool whitelists.

`pageExceptions` supports objects with `host`, normalized `path`, `match` (`exact`
or `section`) and a human-readable `reason`. For example:

```json
{"host":"chrisizworski.com","path":"/problem-tool","match":"exact","reason":"Ad obscures the map controls; review after layout fix"}
```

This prevents our loader on the matched page after deployment. Separate old/manual
integrations must also be removed in that owner. Google's own **Page exclusions**
and **Excluded areas** are the account controls for stopping Auto ads or protecting
specific page regions. They are not configured by `data-no-ads` or by this JSON.
Account exclusions must be recorded with their affected host and reason; section
exclusions do not automatically cover another subdomain.

## Coverage and future tools

- Main static build: the existing final HTML injector normalizes to one current
  loader. `verify-auto-ads-build.mjs` runs immediately afterward and fails on any
  eligible emitted HTML without exactly one current loader.
- Composed tool responses: `lib/public-tool-page.js` applies the same policy.
- Independent owners: use the existing single `network-ads-v1.js` integration in
  their shared layout or after every static page generator. The network runtime
  is rebuilt centrally; a policy change does not require editing each page.
- Production subdomain hosts are derived from the tool registry, in addition to
  the explicit external-domain list. Preview deployments do not request live ads.
- Before launching a new independent tool, add it to the existing registry and
  integrate the loader in its shared layout/build. A central script cannot inject
  itself into a deployment that never includes it. Register the production URL,
  verify generated child pages, confirm the site's AdSense approval/settings, and
  run the network audit. Hosting migrations must preserve this contract.

`npm run audit:adsense` discovers content from all main sitemaps, both live tool
hubs, registered tool roots, and each independent host's robots/sitemap declarations.
It follows sitemap indexes and checks every discovered URL. The daily GitHub workflow
also runs it and retains the complete report. Failed fetches, broken sitemap discovery,
missing tags and client-only references are visible failures, not silently excluded.
Use authenticated AdSense reports and browser checks to resolve delivery separately.
Do not click ads while testing.

## Rollout and account verification

1. Run full repository verification and inspect the complete baseline inventory.
2. Deploy standard code centrally, then repair owner integrations found by the audit.
3. In AdSense, verify each root domain is approved/ready, Auto ads is on, ads.txt is
   recognized, and Policy Center has no serving restrictions. Review existing exclusions.
4. Keep the user's preferred anchor/vignette formats; keep ad-intent links/chips off.
   Tune in-page density and excluded areas in the account, based on real mobile/desktop
   interactions. The loader itself cannot select or guarantee these settings.
5. Reaudit production, distinguish installation/request/fill/account-report evidence,
   and record unresolved deployment/account blockers without declaring them fixed.

Account access was signed out at the start of this work. Settings are unverified
until an authenticated review is recorded. Do not claim this document enables Auto
ads inside Google's account. Google notes setting changes may take up to an hour.

Rollback: restore the previous config and deploy, or set `loaderMode: off` for the
covered integrations. Already-open pages retain loaded scripts until refreshed;
independent legacy integrations and Google account settings have their own scope.

References:
- https://support.google.com/adsense/answer/9261307
- https://support.google.com/adsense/answer/9262311
- https://support.google.com/adsense/answer/9274634
