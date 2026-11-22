---
name: huggingface-tool-builder
description: "Build bounded local scripts for read-only Hugging Face model/dataset audits and reproducible evidence preparation."
---
# Reusable Hugging Face research tools

Adapted from https://github.com/huggingface/skills/tree/main/skills/huggingface-tool-builder (reviewed 2026-11-22).

Use when the research will recur: evaluate multiple model revisions, compare licensing metadata, produce controlled offline embeddings, or validate dataset rows.

- Build the smallest stdlib Node or Python script; require `--help`, deterministic inputs and machine-readable output. Read-only public endpoints or local files are preferred. `HF_TOKEN` is optional for gated access and must never appear in the browser, output, files, PR or logs.
- Bound pagination, retries, timeouts, data size, caches and artifact permissions. Never add per-visitor backend inference, production scraping or a scheduled job without separate approval.
- Validate schema, unique IDs, finite vectors, model revision, license, source timestamp, dimensions, portability and tests for missing/corrupt/duplicate inputs.
- Script must fail closed: no fabricated rankings, observations, images, access advice or weather. Include offline fixture tests; compare a non-ML baseline on the same inputs.
- Keep outputs outside `public/` until evidence has passed Experience OS, source rights, mobile and CI checks.
- Produce invocation examples, a review of costs, owner-specific rollback, and a NOT VERIFIED label for any unrun check.

First local implementation: `scripts/evaluate-adventure-semantic-search.mjs` evaluates lexical results from the existing twenty Adventure Finder destination cards against optional **offline** model vectors. It does not generate embeddings or change production.
