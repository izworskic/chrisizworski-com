# Google AdSense launch plan

Status: technical and audience preparation only. No display-ad network is active in this change.

## Purpose

Use programmatic ads as the first monetization layer after search CTR, impressions, measured pageviews, and page performance reach a defensible baseline. Sponsorship outreach follows only after the site can show real results.

Google does not publish a minimum traffic requirement for AdSense eligibility. The 10,000-pageview threshold below is ChrisIzworski.com's economic and user-experience gate, not a Google rule.

## Activation gate

All conditions must be true before ad code is released:

1. At least 10,000 measured pageviews in a rolling 30-day period.
2. At least 2.5% Google Search CTR for a complete comparable 28-day window.
3. Core Web Vitals remain stable for 28 days.
4. Chris owns and approves the AdSense account, and Google approves the site.
5. The code uses the real publisher ID. Never commit a placeholder ID.
6. The privacy policy accurately describes the live ad and measurement configuration.
7. A Google-certified consent-management platform is configured for applicable EEA, UK, and Switzerland traffic, plus applicable US-state privacy messages.
8. `ads.txt` is published only after the real publisher ID and authorized-seller record are known.

## Launch sequence

1. Record measured pageviews and top landing-page engagement for 28 uninterrupted days.
2. Fix CTR on the five high-impression pages and grow the FVF/gardening and birding clusters.
3. Apply for or connect the owner-controlled AdSense account.
4. Complete identity, tax, payment, site-ownership, privacy, and consent steps in the owner account.
5. Release conservative Auto ads on a small page cohort. Start with anchor and in-page formats; keep ad load low.
6. Compare ad-on and ad-off cohorts for revenue, page RPM, viewability, bounce/engagement, search clicks, and Core Web Vitals.
7. Expand only when revenue rises without a material search, speed, or reader-experience regression.

## Stop-loss rules

- Roll back the latest ad-load change if priority-page organic clicks decline more than 20% across two comparable weekly checks.
- Roll back if a Core Web Vital moves from passing to failing and remains failed after the normal data lag.
- Remove placements that obscure the first answer, navigation, safety guidance, source attribution, or primary tool controls.
- Never use ads that imitate site navigation, download buttons, or editorial recommendations.

## Sponsorship proof gate

Do not sell sponsor packages until the site has:

- At least 25,000 measured monthly pageviews for three consecutive months.
- At least three months of real display-ad and category-level performance data.
- A sponsor report that can show measured audience, geography, device mix, pageviews, and aggregate CTA performance without exposing personal visitor data.

At that point, price sponsor inventory from demonstrated category demand and opportunity cost. Do not revive speculative fixed packages from the pre-proof plan.

## Owner-only steps

Chris must control the AdSense account, accept Google's terms, submit tax/payment information, approve the real publisher ID and `ads.txt` record, choose consent settings, and authorize production activation. This PR intentionally does none of those actions.

## Official references

- [AdSense eligibility requirements](https://support.google.com/adsense/answer/9724?hl=en)
- [Google Publisher Policies](https://support.google.com/adsense/answer/10502938?hl=en)
- [Required privacy-policy content](https://support.google.com/adsense/answer/1348695?hl=en)
- [European regulations consent requirements](https://support.google.com/adsense/answer/11546682?hl=en)
- [Google consent-management platform](https://support.google.com/adsense/answer/16918505?hl=en)
- [US-state privacy messages](https://support.google.com/adsense/answer/10961479?hl=en)
- [Auto ads settings](https://support.google.com/adsense/answer/9305577?hl=en)
- [`ads.txt` guidance](https://support.google.com/adsense/answer/16906718?hl=en)
