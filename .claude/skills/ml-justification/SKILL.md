---
name: ml-justification
description: "Decide whether machine learning is worth it for a tool, and if so prove a specific model beats a no-model baseline offline before any page change: model selection, browser inference with Transformers.js, semantic search and forecast challengers. Use when someone proposes an ML model, embeddings, semantic search, image or forecast models, or Transformers.js for a tool."
---

# ML justification: prove it beats no model, offline, first

Folded from four earlier skills (huggingface-best, transformers-js, hf-semantic-discovery, hf-forecast-benchmark, adapted from huggingface/skills, Apache-2.0). Hub research and dataset inspection live in `hf-hub-research`; photo review lives in `photo-sourcing`.

## 1. Is ML needed at all?

Define the decision, the input, the output the visitor needs, representative Great Lakes counterexamples, the cost of a wrong answer, and the speed, memory, download and privacy budgets. Then compare, on the same held-out cases:

- (A) no model: the current logic, a lookup, keywords or rules;
- (B) a deterministic or statistical baseline (naive persistence, seasonal normal, BM25-style lexical ranking);
- (C) at least two licensed model candidates.

A model that does not clearly beat A and B on the held-out set does not ship.

## 2. Choose a candidate honestly

- Do not pick by likes, downloads or leaderboard rank.
- Verify the exact model card, revision and license. Commercial use on an ad-supported site must be allowed; gated, NC, ND, custom or unknown terms need separate review. A dataset's license does not license downstream images or place facts.
- Example candidates only, to re-verify before use: `onnx-community/all-MiniLM-L6-v2-ONNX` (Apache-2.0) for text similarity, `Xenova/clip-vit-base-patch32` (MIT) for images, `amazon/chronos-bolt-tiny` (Apache-2.0) for time series.

## 3. Evaluate offline

- Hold out cases before building. Metrics that match the decision: hit@3 and MRR for search, precision for photos, out-of-time MAE, bias and interval coverage for forecasts, false reassurance rate for safety-relevant answers.
- Forecasts: identical horizons, station IDs, units, missing-value policy and train, validation and test cutoffs for A, B and C. Never present an inferred reading as an official sensor value.
- Semantic search pilot (Adventure Finder, `public/michigan-destinations/`, 20 curated HTML cards): `node scripts/evaluate-adventure-semantic-search.mjs --json` gives the lexical baseline; model vectors are generated offline with a pinned revision and checked with `--vectors PATH --strict` (no missing ids, non-finite values or dimension mismatches). Region, activity and season stay hard visitor-selected filters, never guessed from embeddings.
- Unrun evaluations are NOT VERIFIED.

## 4. If it wins: where it runs

Preferred order: (A) no ML; (B) precomputed offline output shipped as static data; (C) voluntary, on-demand browser inference with Transformers.js, WebGPU with a WASM fallback; (D) server inference only with a separately approved operational case.

For browser inference:

- Never load a model on initial page render, as a global script, for bots, or for decoration. Load it only after the visitor asks for the feature.
- Measure model bytes, first-run latency, CPU, memory on a low-end Android phone at 390 px, battery and data cost, and caching; respect reduced-data settings.
- Keep the existing HTML answer, filters, no-JS behavior, canonical and Person identity, and Auto ads. On failure, unsupported devices or offline, fall back to the existing answer, never an endless spinner.
- Keep visitor queries on the device; never upload location, photos or audio without a separately approved permission flow.
- Dispose pipelines, cancel stale requests, and test rapid input changes.

## Output

The decision, the three-way comparison table on held-out cases, licenses with revisions, the chosen run location with measured costs, and a go or no-go. No new hosting, external API, job, endpoint or GPU spend is implied.

## Boundaries

Python Intelligence OS (for analytical work), calibrated-prediction, Experience OS and owning-repository tests apply. Bounded and opt-in: no installs, model downloads or production changes from loading this skill. Do not auto-merge.
