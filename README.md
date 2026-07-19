# ChrisIzworski.com source migration

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

The migration preview intentionally sends a global `X-Robots-Tag: noindex` header. `npm run verify:production-ready` must fail while that preview-only protection is present and must pass before either live domain can be attached.

See [MIGRATION.md](MIGRATION.md) for the staged cutover and rollback procedure and [SEO_PARITY.md](SEO_PARITY.md) for the search-preservation record.
