---
name: transformers-js
description: "Evaluate Hugging Face Transformers.js for browser or offline JS inference, only where its measurable benefit outweighs mobile/download and caching costs."
---
# Transformers.js integration review

Adapted from https://github.com/huggingface/skills/tree/main/skills/transformers-js (reviewed 2026-11-22). The source is an Apache-2.0 skill. This adaptation installs nothing.

Use only after `huggingface-best` establishes a task-specific baseline. Suitable experiments include semantic search, local image caption suggestions, photo classification and optional visitor-controlled audio. Confirm the exact package/model revision and API from current upstream docs before writing code.

Preferred order: (A) no ML, (B) offline/precomputed output, (C) voluntary on-demand browser inference with WebGPU and WASM fallback, (D) server inference only with a separately approved operational case.

- Do not load a model as a global `<script>`, on initial page render, for bots, or solely to fill a decorative UI.
- Preserve initial semantic HTML, existing search/filter/map actions, person/canonical, Auto ads and no-JS behavior. If inference fails/offline/unsupported, restore the existing answer and avoid empty/loading forever states.
- Quantify actual model asset bytes, first-run latency, CPU usage, battery/data impact, browser cache policy, small-screen memory and reduced-data restrictions. Test desktop and low-end Android at 390px, keyboard, offline, A→B→A and rapid query changes.
- Keep queries entirely client-side if stated; do not upload location, visitor photos, microphone captures or other user data without an independently approved permission flow.
- Dispose pipelines, manage cancellation/state, and benchmark relevance; no false freshness or license provenance claims. Never use generated captions as source-confirmed geographic facts.

Example evaluated candidate: `onnx-community/all-MiniLM-L6-v2-ONNX`, model license Apache-2.0, but this does **not** authorize an automatic production deployment.
