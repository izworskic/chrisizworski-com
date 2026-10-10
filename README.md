# ChrisIzworski.com source migration

## Website growth, revenue and personal search authority

The ongoing plan is [**Million Impressions + Revenue Playbook**](MILLION_IMPRESSIONS_PLAYBOOK.md), with a dated [**Growth Session Log**](docs/GROWTH_SESSION_LOG.md). Together they define the 1,000,000 Search impressions/28 days and 5% CTR objectives, revenue milestones up to $300/day, and protections for the Chris Izworski branded SERP. See these documents before proposing, coding or evaluating a search-growth or monetization mission. Existing `AGENTS.md`, search governance and CI requirements still control implementation.

This repository is the staging area for converting the existing live site into a reproducible, GitHub-backed deployment without changing public URLs or search signals.

The live-site audit is read-only:

```bash
node scripts/crawl-live.mjs
```

After a fresh audit capture, rebuild the checked-in public source manually with `npm run prepare:source`. This is deliberately not named `prepare`, because npm automatically runs that lifecycle name during dependency installation.

Production traffic must not be moved until the preview passes route, metadata, structured-data, redirect, asset, interaction, and visual parity checks.

## Verification

```bash
npm run verify:all
```

The source verifier compares unchanged pages and assets with the clean live-site capture. The endpoint tests check the response contracts used by the buoy explorer and heirloom variety matchmaker.

Vercel preview hostnames intentionally send `X-Robots-Tag: noindex`, while custom domains remain indexable. `npm run verify:production-ready` validates that host split, confirms API routes remain `noindex`, and must pass before either live domain can be attached.

See [MIGRATION.md](MIGRATION.md) for the staged cutover and rollback procedure and [SEO_PARITY.md](SEO_PARITY.md) for the search-preservation record.
