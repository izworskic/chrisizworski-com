---
name: data-contract-validation
description: "Use when changing data ingestion, source schemas, timestamp freshness, unit normalization, API contracts or conflicting and incomplete upstream feeds. Not for unrelated visual edits."
---

# Data Contract Validation

Proposed first pilot: Michigan Ski Hills. This is an engineering workflow, not an installed runtime or a claim of improved results.

## Workflow

- Inventory upstream and public contracts, consumers, source rights, timestamp meanings, units, expected ranges, nullable fields and revision policy. Distinguish explicit zero/closed from missing/unknown and unavailable from stale.
- Prefer existing validation; compare Ajv for versioned JSON contracts or Pandera for offline dataframe checks. Schema versions are explicit; tolerate harmless additive fields where appropriate, reject incompatible required changes, and retain original source evidence.
- Validate parse, semantic types, timezone, freshness, future timestamps, location/identity, duplicate/revised records, unit conversions and cross-field constraints. Quarantine invalid records while preserving valid independently usable data; no silent zero fill or fabricated status.
- Define AVAILABLE/PARTIAL/STALE/UNAVAILABLE behavior and bounded cache/retry policy. A last known value carries its original observation date; no retry storm, unbounded request or false live label.
- Add representative source fixtures including failures, golden output and consumer compatibility tests; log aggregate diagnostics without private data. Deliver a source ledger, schema version, failure UX and rollback, not a new monitoring service.

## Integration and release boundary

Read root AGENTS.md, the owning repository instructions, and Python Intelligence OS README and QUALITY_GATES for substantive analytical work. Use Experience OS, Experience Investment and Foundry for significant visitor-facing changes. Scope this skill to the authorized task, preserve source rights, canonical Person/URLs, Auto ads, existing dependencies and owning-repository release gates. No new route, cron, paid service, database, push notification, or package install is authorized by loading this skill. Use skill-eval for adoption, compare against baseline, record unrun tests as NOT VERIFIED, and open a reviewed PR; do not auto-merge.

## Upstream references

- [pandera-dev/pandera](https://github.com/pandera-dev/pandera)
- [ajv-validator/ajv](https://github.com/ajv-validator/ajv)

Reference only; no upstream code is vendored. Verify license, maintenance, compatibility and data rights at the selected revision before any implementation adoption.
