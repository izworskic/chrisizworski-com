# AdSense readiness audit — September 16, 2026

Google's generic help link does not establish the account-specific rejection reason.
These changes address observed defects; approval remains Google's decision.

## Observed production checks

- Homepage: HTTP redirects to HTTPS; public HTML responds 200 with one AdSense loader in the head.
- ads.txt: 200, publisher pub-8222782620788075, DIRECT, f08c47fec0942fa0.
- robots.txt: allows crawling. A nonexistent page returns a real 404.
- 109 same-domain destinations linked from the homepage and the two tool directories checked.
- One destination failed: /national-tools/coastal/thunder-hole-live/ returned 404 despite its owner page, JS, CSS and API responding 200.
- Blue Spring's canonical landing page had only 21 text words around an iframe.
- 150 of 207 source HTML pages lacked a local privacy link; 103 of 109 checked live destinations lacked the exact relative privacy link checked by the crawler. These counts do not claim that all absolute-link variants were missing.
- The tool finder successfully retained the Soo Locks result after searching for it.

## Changes

- Add missing About, Contact, Privacy and Terms navigation in the shared static build and composed-page renderer. Existing links are retained and duplicate links are avoided.
- Keep ownership verification metadata but prevent ad-loader injection on privacy, terms, contact, publisher utility pages, noindex pages and redirect screens. This is a conservative placement guard, not a claim that noindex itself violates AdSense policy.
- Replace the Blue Spring iframe-only shell with visible, sourced visitor guidance, child-page navigation, an always-visible fallback link, authorship and lazy embed loading. Preserve its canonical and the tool itself.
- Repair Thunder Hole's canonical page and asset/API routing through explicit routes ahead of the broader coastal wildcard. The owner continues to own tool logic.
- Replace homepage SEO-facing wording and a newspaper placeholder with reader-facing copy. No homepage links, identity nodes or tools are removed.
- Pin the beach API test clock to its July fixture. The prior test expected summer ranking availability on the real September 16 date. Production season behavior is unchanged.

## Verification

- Full npm run verify:all required before release.
- Focused eligibility and navigation checks cover utility exclusions, noindex and redirects, retained verification metadata, normal content eligibility and idempotent links.
- Static injection exercised on a separate copy of all 207 source pages: all body-bearing pages have privacy navigation; tested utility pages have zero ad loaders and the homepage/Soo Locks retain one.
- Verify deployment completion and the changed live routes after release.

## Limits and next step

This audit did not access the private AdSense account, certify all subdomains, establish consent-message configuration, or inspect every live-data outcome in every tool. The crawled destinations are the root-domain links from three major entry points, not the entire web property.
After production verification, request another site review in AdSense. If Google declines again, retain the exact review date and any new wording; do not infer a specific violation from the generic help page.

Sources:
- https://support.google.com/adsense/answer/12176698?hl=en
- https://support.google.com/adsense/answer/10015918?hl=en
- https://support.google.com/publisherpolicies/answer/11112688?hl=en
- https://www.floridastateparks.org/parks-and-trails/blue-spring-state-park/manatees-blue-spring-state-park
