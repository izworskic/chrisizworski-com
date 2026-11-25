---
name: hf-hub-research
description: "Read-only research on the Hugging Face Hub: model and dataset cards, licenses, revisions, dataset rows and reusable research scripts, with tokens kept out of everything. Use when asked to inspect a Hugging Face model, dataset, Space or license, when public-data-scout points to a Hub dataset, or when a recurring Hub research task needs a small script."
---

# Hugging Face Hub research, read-only

Folded from three earlier skills (hf-cli, huggingface-datasets, huggingface-tool-builder, adapted from huggingface/skills). Whether to use a model at all is `ml-justification`'s question; this skill gathers the facts it needs.

## 1. Access

- Prefer the connected Hugging Face connector or read-only public endpoints. Check `hf --help` locally rather than trusting remembered syntax; do not assume a connector's login carries into a local shell.
- Public cards need no token. Request a token only for an explicitly authorized gated read. Never print, commit, log or embed `HF_TOKEN`, and never put it in browser code, a PR or an output file.
- Never start a Job, Space, endpoint, inference provider, paid GPU, upload, write or scheduled fetch without separate approval.

## 2. Models and Spaces

Record: repo id, full revision hash, task, license and any extra usage terms, size, runtime, card date, where the weights come from, and whether running it needs external code. Do not run `trust_remote_code`, setup scripts, pickle weights or Space code that has not been reviewed; evaluate only in a disposable environment with a stated download and compute budget.

## 3. Datasets

The Hub hosts datasets; it is not a primary source of geographic truth.

1. Read the card: version, creator, original publisher, collection and refresh dates, spatial and time precision, schema, units and license.
2. Use the Dataset Viewer API read-only, in order: `/is-valid`, `/splits`, `/first-rows`, `/rows` or `/parquet`, `/statistics` at `https://datasets-server.huggingface.co`. Paginate politely.
3. Audit sample and edge rows: missing coordinates, duplicate ids, stale timestamps, wrong units, records outside the region, unsafe access points.
4. For operational answers prefer the owning agency (NOAA, NWS, USGS, USACE, NPS, Canadian agencies). A Hub snapshot may support discovery or offline validation, never override live ground truth.

## 4. Reusable research scripts

When research will recur, write the smallest standard-library Node or Python script: `--help`, deterministic inputs, machine-readable output, bounded pagination, retries, timeouts and cache size. It fails closed: no invented rankings, observations, images or advice. Include offline fixture tests and a non-ML baseline on the same inputs. Outputs stay outside `public/` until they pass Experience OS, rights, mobile and CI checks. The existing example is `scripts/evaluate-adventure-semantic-search.mjs`.

## Output

A short ACCEPT, EXPERIMENT, REJECT or NOT VERIFIED verdict with the source ledger (ids, revisions, licenses, dates), schema and coverage samples for datasets, and a fallback if the source disappears.

## Boundaries

public-data-scout and data-contract-validation apply to any data that reaches a tool. No installs of the `hf` CLI, no model downloads into the repository, no Vercel changes and no merges from loading this skill. Do not auto-merge.
