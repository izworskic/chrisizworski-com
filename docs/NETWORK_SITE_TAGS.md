# ChrisIzworski.com network site-tag contract

This is a mandatory production contract for every repository that serves HTML at:

- `https://chrisizworski.com/...`
- any `https://*.chrisizworski.com/...` host
- any extracted tool repository whose canonical output is routed or mirrored into `chrisizworski.com`

## Required tags

Every rendered HTML document must inherit both of these site-wide identifiers:

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-Y5D2V2W7HN"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-Y5D2V2W7HN');
</script>

<!-- Google AdSense account ownership -->
<meta name="google-adsense-account" content="ca-pub-8222782620788075">
```

Canonical identifiers:

- GA4 measurement ID: `G-Y5D2V2W7HN`
- AdSense publisher ID: `ca-pub-8222782620788075`

## Implementation rule

Do not hand-add these tags only to today's pages. They must live at the global layout, document, template, generator, or post-build layer so every future page receives them automatically.

Use the implementation that matches the project:

- Static/public HTML: scan every emitted `.html` file at build time and inject any missing required tag before `</head>`.
- Next.js App Router: put the AdSense account meta in the root `app/layout` head and initialize GA4 globally.
- Next.js Pages Router: put both in `pages/_document` or an equivalent global document layer.
- Generated sites: put the tags in the generator's shared head or run an idempotent post-generation build scanner over all emitted HTML.
- Other frameworks: use the framework's root HTML/head mechanism, not per-page duplication.

The implementation must be idempotent. A build must never duplicate GA4 or the AdSense publisher tag when a page already contains them.

## New-repository release gate

A new or extracted repository must not be attached to a `chrisizworski.com` production hostname or become the authoritative source for a routed canonical until all of the following are true:

1. GA4 `G-Y5D2V2W7HN` is global.
2. AdSense publisher `ca-pub-8222782620788075` is global.
3. Future HTML/routes inherit both without manual page edits.
4. The production/build output is checked for both identifiers.
5. Existing canonical URLs and analytics continuity are preserved during extraction or routing changes.

If the project has a verification or CI gate, missing either identifier in rendered HTML is a release failure, not a warning.

## Redirect-only exception

A repository that serves only HTTP redirects and no HTML document does not need to inject document tags. The canonical destination receiving the traffic must satisfy this contract.

## Scope note

The AdSense account meta tag establishes the publisher account relationship. It is separate from decisions about visible ad units, Auto Ads, consent, placement, density, or monetization UX.

## Standing rule for agents

Whenever an agent creates, extracts, migrates, or deploys a repository for the Chris Izworski web network, site-tag coverage is part of the definition of done. Do not wait for a separate analytics or monetization request.
