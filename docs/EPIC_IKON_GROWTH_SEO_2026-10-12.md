# Epic / Ikon 2026–27 search growth — October 12, 2026

## Objective
Turn the verified /epic-ikon-pass/ Vail vertical slice into a useful, indexable, search-intent hub while keeping ONE canonical tool, its deterministic pass gate, V2/V3 experience, ads, attribution, pricing honesty and performance.

## Baseline (not invented)
Windsor.ai Search Console property `sc-domain:chrisizworski.com`, 2026-09-10 through 2026-10-11, page filter `/epic-ikon-pass/`: **zero returned rows** for clicks, impressions, CTR and queries. Page published Oct 12; no measurable page baseline yet. Do not represent zero rows as zero eventual demand, and do not claim the million-impressions goal is achieved.

## Search clusters to verify in Search Console
- `epic local pass blackout dates 2026 2027`, `epic local vail december 31`, `vail epic local christmas`;
- `ikon base blackout dates 2026 27`, `ikon base snowmass`, `ikon base aspen mountain`;
- `aspen snowmass ikon shared days`, `jackson hole ikon reservation 2026 27`;
- broader `epic vs ikon pass 2026 27`, `epic day pass blackout checker`.

These are researched search-intent hypotheses, **not verified page query impressions**.

## Single-source actions
- Query-first HTML title/description, OG and X metadata; keep original canonical URL, Person @id and National Tools listing.
- Helpful static source-linked Epic Local, Ikon Base, Epic Day, full-pass and Aspen pooled-day explanations with exact seasons.
- Four shareable deep links to *one* canonical tool; never create indexed parameter pages.
- Six human-visible exact FAQ answers with matching FAQPage JSON-LD. Google restricts FAQ rich results largely to authoritative health/government sites; do not claim eligibility or CTR lift.
- One unobtrusive `ski_intent_shortcut_click` GA4 event, separate from existing `pass_decoder_check`. No API, cron, Redis, paid feeds, photo injections or mass pages.

## Score/loss gates
Eligibility false positive **hard veto**. SEO identity/canonical conflict **hard veto**. Season/date/source mismatch **hard veto**. Repeated FAQ text that differs from structured answer **hard veto**. Avoid changing first mobile verdict, Vail photo/map, current peak engine or pass form.
Value goal: raise qualified impressions and meaningful tool checks while keeping source integrity.
Review GSC date-window 28-day after indexing. Record impressions, clicks, CTR, ranking and top non-brand queries for the one canonical page. Review GA4 `ski_intent_shortcut_click` → `pass_decoder_check` (avoid counting implied bookings), plus engagement and actual source outbounds. No promised 1M impressions or 5% CTR for this page.

## Official sources and Google guidance
- https://www.epicpass.com/info/peak-restricted-dates.aspx
- https://www.ikonpass.com/en/compare-passes
- https://www.ikonpass.com/en/faq/
- https://www.ikonpass.com/en/how-to-use-your-ikon-pass
- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/blog/2023/08/howto-faq-changes
