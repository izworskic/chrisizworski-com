---
name: huggingface-datasets
description: "Inspect Hub datasets read-only as potential offline research inputs, with source, licensing, coverage and quality validation. Use when a Hub dataset is proposed as an input to a tool or study."
---
# Dataset inspection for evidence-backed tools

Adapted from https://github.com/huggingface/skills/tree/main/skills/huggingface-datasets (reviewed 2026-11-22). Use after `public-data-scout` identifies a potentially relevant dataset. The Hub is a repository host, not a primary geographic truth source.

1. Inspect dataset card, version, creator, original publisher, collection/refresh dates, spatial/temporal precision, split, schema, unit conventions, location licensing and permitted use. Reject unverified live-status claims.
2. Read-only Dataset Viewer process: `/is-valid` -> `/splits` -> `/first-rows` -> `/rows` or `/parquet` -> `/statistics`. Use `https://datasets-server.huggingface.co`; paginate responsibly and respect API limits.
3. Audit representative and edge-case rows. Look for missing geocoordinates, duplicate identifiers, stale timestamps, incorrect units, non-Michigan records, unsafe entrances and source revisions. Preserve clear source-attribution fields in any derived dataset.
4. Prefer the owning agency's NOAA/NWS/USGS/USACE/NPS or Canadian feed for operational decisions. Third-party HF snapshots may support discovery or **offline** validation, never override live ground truth.
5. Output schema/coverage samples, source ledger, rights verdict, freshness and source-removal fallback. Only approve a static artifact after independent source verification and owning-repo tests.

No train-on-user-data, private traces upload, production scraping, per-visit calls, or new Vercel dependencies.
