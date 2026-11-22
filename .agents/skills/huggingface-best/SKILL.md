---
name: huggingface-best
description: "Choose and benchmark small, license-appropriate Hugging Face models against measurable visitor tasks and baseline approaches."
---
# Model-selection gate

Adapted from https://github.com/huggingface/skills/tree/main/skills/huggingface-best (reviewed 2026-11-22). Use when selecting an ML model for a concrete tool. Do not choose by likes/downloads or generic leaderboard rank alone.

1. Define the decision, input type, required output, representative Michigan/Great Lakes counterexamples, acceptable false-positive cost, minimum speed, memory, download and privacy budgets.
2. Compare **no model**, a deterministic or statistical baseline, and at least two legitimate model candidates. Prefer native Node/static code before adding a model.
3. Verify exact card/revision and license; evaluate commercial usage, derivatives and attribution on an ad-supported site. Gated, `other`, NC, ND, unknown or custom terms require separate review. A dataset license does not automatically license downstream images or place facts.
4. Require holdout examples and metrics appropriate to the decision: query MRR/hit@3, photo precision, out-of-time MAE/coverage, calibration or false-positive rate. State missing evaluations as NOT VERIFIED.
5. Check real CPU/mobile hardware, quantization, download size, latency, WebGPU/WASM fallback, model loading, caching and reduced-data behavior. Favor offline inference if it meets the job; never install a model on initial page load by default.
6. Deliver a source-linked selection table, fallback/rollback, and an explicit decision. No new hosting, external API, or user-data upload is implied.

Candidate reference examples only: `onnx-community/all-MiniLM-L6-v2-ONNX` (Apache-2.0), `Xenova/clip-vit-base-patch32` (MIT), `amazon/chronos-bolt-tiny` (Apache-2.0). Verify cards again before integration.
