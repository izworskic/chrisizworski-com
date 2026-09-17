# AdSense readiness review — September 17, 2026

This is a technical and content review, not an AdSense approval. Google has not supplied a specific rejection reason. Only the account's Sites status and Google's review can establish approval.

## Evidence

The live crawl inspected 280 distinct sitemap URLs, ads.txt, robots.txt and a deliberately missing URL. It returned 266 successful responses and 17 HTTP 404 responses, including the intentional missing-page test. Sixteen genuine broken URLs were aurora destination pages whose working owner sites were bypassed by the main site's generic rewrite.

The HTML audit found 213 pages with an AdSense loader, no duplicate loaders and no noindex pages with ads. Fourteen monetized tool landing pages lacked direct privacy/contact links because their HTML bypassed the main site's build process. The missing-page response had no ads. These counts describe the pre-change crawl; they do not imply every interactive feature was tested.

The main site's publisher record was present in ads.txt. A browser check of the rivers tool returned 21 rivers and 31 gauges for Bay City, Michigan. The Blue Spring wrapper supplied planning content, source links and an embed fallback.

## Changes

- Route the 16 existing aurora destination URLs to their already deployed state owners. Preserve the URLs and sitemap entries.
- Compose 14 existing tool landing pages with the shared policy footer. Keep owner HTML, canonical URLs, titles, scripts, original links and tool APIs intact. Fixed source mapping prevents arbitrary proxy destinations.
- Correct privacy disclosures about advertising, location inputs, browser storage, contact messages and embedded services. Remove the inaccurate claim that all advertising code is verification-only or technically required on every page.
- Exclude static HTML aliases for error and policy pages from advertising eligibility.
- In the Gazette owner repository, disclose AI-assisted automated publication accurately, retain Chris Izworski's publisher identity and corrections contact, and enforce the existing source-health criteria before saving or exposing a new edition. No archive issue is deleted or rewritten.

No branded coverage page, title, canonical, Person identifier or sitemap URL is removed. No new keyword pages are created. The privacy policy replaces inaccurate prose; the Gazette replaces inaccurate personal-authorship and absolute-accuracy claims.

## Verification

Main repository: `npm run verify:all` passed, including 430 tests and all registered search, entity, routing and product gates. New tests cover fixed-source routing, hostile source rejection, all 16 aurora destination mappings and HTML preservation. Routing expectations now resolve the composition handler to the same previously required owner URL; API and asset ownership remain enforced.

Gazette repository: `npm test` passed. Regression checks prove invalid dates, insufficient source data and missing headlines cause zero Redis writes; a valid edition retains normal persistence. A pre-existing growth test was corrected to expect the already deployed GA4 gateway wrapper and verify its delegation.

Production checks after PR #368 confirmed the 14 tool landing pages retain their original titles, canonicals and links, gain policy navigation and load one ad script each. The rivers browser search returned 21 rivers and 31 monitors. The privacy and Gazette disclosures were present. The 16 aurora routes still failed with the sitemap's trailing slash even though slashless owner routes worked; a follow-up adds exact routes to each owner's existing `index.html` file for both public URL forms. Tests now enforce these exact routes ahead of the wildcards. Final production checks follow that deployment. This document records the release basis, not an account-side approval claim.

## Remaining account-side checks

- Confirm AdSense **Sites** shows `Ready`, or request review after deployed fixes have been checked. Do not interpret the presence of the loader or ads.txt as approval.
- Verify **Privacy & messaging**, including a Google-certified consent-management platform for applicable EEA, UK and Switzerland traffic. Absence of a static CMP marker in fetched HTML cannot establish whether an account-generated or regional message is configured.
- Confirm Auto ads or intended ad units are enabled after approval, with appropriate exclusions for utility/error/policy surfaces.

The AdSense sign-in page returned a connection error in this session, so account status, review submission and consent configuration remain unverified.

## Google references

- [Site readiness and review guidance](https://support.google.com/adsense/answer/12176698)
- [Eligibility requirements](https://support.google.com/adsense/answer/9724)
- [Google Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938)
- [Privacy-related policies](https://support.google.com/adsense/answer/1348695?hl=en)
- [Consent-management requirements](https://support.google.com/adsense/answer/13554116?hl=en)

AI use alone does not establish rejection. The practical review concerns are useful original content, accurate representation, reliable navigation and compliance with applicable publisher policies. None of these site changes guarantees Google's decision or search rankings.
