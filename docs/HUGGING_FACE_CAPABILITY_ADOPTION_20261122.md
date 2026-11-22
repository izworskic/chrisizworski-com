# Hugging Face skills adoption — 2026-11-22

**Scope:** agent-side capability adoption and offline Adventure Finder evaluation only. **No production UI changes**, routes, Auto ads / AdSense changes, environment variables, scheduled jobs, Redis, dependencies, model downloads or inference services. The Michigan Adventure Finder at [`/michigan-destinations/`](https://chrisizworski.com/michigan-destinations/) remains HTML-first, map-first by context, and indexable.

## What was adopted

Five adapted Hugging Face [Agent Skills](https://github.com/huggingface/skills) from the official repository, plus three project-specific applications, mirrored byte-identically in `.agents/skills/`, `.claude/skills/`, and `.github/skills/`. These are **adaptations** and do not install upstream software, CLI tools, external models or MCP servers.

| Skill | Purpose | Use | Source |
|---|---|---|---|
| `hf-cli` | Read-only Hub discovery & secure metadata handling | When Hugging Face account/Hub is relevant | [Upstream](https://github.com/huggingface/skills/tree/main/skills/hf-cli) |
| `huggingface-best` | Evidence-backed model selection and baselines | Before choosing models | [Upstream](https://github.com/huggingface/skills/tree/main/skills/huggingface-best) |
| `huggingface-datasets` | Versioned, rights-aware dataset inspection | Potential offline public data | [Upstream](https://github.com/huggingface/skills/tree/main/skills/huggingface-datasets) |
| `huggingface-tool-builder` | Reproducible bounded research utilities | Repeated model/dataset tasks | [Upstream](https://github.com/huggingface/skills/tree/main/skills/huggingface-tool-builder) |
| `transformers-js` | Browser/offline ML engineering gate | Where measured value warrants model inference | [Upstream](https://github.com/huggingface/skills/tree/main/skills/transformers-js) |
| `hf-semantic-discovery` | Adventure Finder query relevance evaluation | First offline visitor-search pilot | This repository |
| `hf-visual-evidence` | Source-first photograph triage and caption suggestions | Foundry/editorial QA only | This repository |
| `hf-forecast-benchmark` | Out-of-time model challengers to existing science engines | Python Intelligence OS only | This repository |

## Candidate models (not dependencies)

- [`onnx-community/all-MiniLM-L6-v2-ONNX`](https://huggingface.co/onnx-community/all-MiniLM-L6-v2-ONNX), Apache-2.0; semantic retrieval pilot; model revision and performance must be pinned/checked before reuse.
- [`onnx-community/Florence-2-base-ft`](https://huggingface.co/onnx-community/Florence-2-base-ft), MIT; experimental local photo descriptive assistance, **not** photo rights/geographic truth.
- [`Xenova/clip-vit-base-patch32`](https://huggingface.co/Xenova/clip-vit-base-patch32), MIT; possible image/topic scoring for already-licensed photographs.
- [`amazon/chronos-bolt-tiny`](https://huggingface.co/amazon/chronos-bolt-tiny), Apache-2.0; model challenger only, not an authoritative observation.
- Reject noncommercial, unknown, custom or incompatible licenses until explicit rights review. User's Hugging Face account is free; none of these require paid hosting in this PR.

## First pilot: Adventure Finder semantic relevance

**Current visitor job:** choose a Michigan destination through 20 source-owned HTML cards using season, activity and region; the existing `public/assets/michigan-destinations.js` owns those filters and the destination map. No keyword text-search field exists today. This pilot is not a hidden change to the public search experience.

**Two approaches:**
1. Browser-loaded inference for every visitor. **Reject for now**: heavy first-run model bytes and mobile latency, no proven benefit for a 20-item catalog; introduces failure/loading states.
2. **Selected:** offline model challenge using the checked-in source cards, curated human-readable questions, lexical baseline and an optional separately generated pinned vector snapshot. No download, external fetch or production behavior.

### Reproduce

```bash
node scripts/evaluate-adventure-semantic-search.mjs --help
node scripts/evaluate-adventure-semantic-search.mjs --json
# Only after independent model/rights review and OFFLINE embedding generation:
node scripts/evaluate-adventure-semantic-search.mjs --vectors /path/to/reviewed-embeddings.json --strict
node --test tests/hugging-face-capabilities.test.js
npm run verify:all
```

Vector file shape: `{model:"onnx-community/all-MiniLM-L6-v2-ONNX",revision:"<40 hex commit>",license:"apache-2.0",documentVectors:{"pictured-rocks":[...]},queryVectors:{"sandstone cliffs and kayak along Lake Superior":[...]}}`. Every current card ID and all 12 gold queries must be present with matching dimensions, finite nonzero values and a full revision SHA. The evaluator refuses incomplete input. **No generated vectors or model weight files are included in the repo.**

### Gates and failure cases

- Baseline is lexical-only; until independently generated model vectors exist, status **NOT_EVALUATED**. With vectors, an experimental model needs at least baseline hit@3 and MRR improvement ≥0.02 (offline threshold only).
- Map order and user-selected hard season/activity/region filters remain authoritative. Semantic similarity must not invent a destination, weather conditions, access, mileage or opening status.
- Before implementing a public UI: compare representative query intent, empty or ambiguous results, Android/mobile payload and latency, caching and offline behavior, keyboard/screen-reader/390px layouts, existing no-JS content, map, ads and SEO.
- Must pass real browser/CI; no claims of traffic uplift, GSC or CTR impact. The current PR changes **zero** public pages and zero deploy infrastructure.
- Rights and revision check are separate from a model output; none of the photo models can prove verified location.


## Second investment: pinned model comparison on an ephemeral CI runner

The first 12 prompts are a small, keyword-friendly baseline (lexical hit@3 1.000, MRR 0.806 in an isolated pure-function smoke test). A separate 20-question paraphrase set now tests more natural visitor language with source-backed expected destination IDs. **Neither set demonstrates model quality before executing actual inference.**

- Model: [`onnx-community/all-MiniLM-L6-v2-ONNX`](https://huggingface.co/onnx-community/all-MiniLM-L6-v2-ONNX/commit/aff7a1dc4e8a1ea593e6ea21e95c22ef0a25966f), immutable revision `aff7a1dc4e8a1ea593e6ea21e95c22ef0a25966f`, Apache-2.0 license, q4 ONNX. Source checked 2026-11-22.
- Runtime: `@huggingface/transformers@4.3.2` installed **only** into a temporary GitHub-hosted runner directory. CPU execution; no paid Hugging Face Jobs, inference endpoints or Vercel dependencies.
- Trigger: `.github/workflows/hf-semantic-benchmark.yml` on scoped PR file changes or explicit manual dispatch. 20-minute job limit, 7-day artifact retention; no schedule, credentials or remote visitors.
- Output: `report.json`, `vectors.json`, `summary.md`; strict model ID, SHA, dimensions, finite numbers and complete-source coverage. The runner calculates separate hit@3 and MRR for original 12 prompts and 20 untouched paraphrases, with cold-start and inference timings.
- **Decision rule:** require hit@3 at least as high as lexical and MRR at least 0.02 higher on **both** cohorts. A pass only warrants a subsequent measured mobile UX pilot, not deployment; a fail means keep the model out.
- Test command without model download: `node --test tests/hugging-face-capabilities.test.js tests/hf-semantic-pilot.test.js`. Model execution requires the scoped GitHub Action; no production build loads ML.
- Runner execution evidence, exact-head full CI and mobile browser QA: **NOT VERIFIED** until the new workflow actually completes. This is a research-only branch; no AdSense, search, canonical or map changes were made.

## Release status / handoff

- GitHub source/snapshot inspection: VERIFIED from currently accessible repo files and known HF model cards, 2026-11-22.
- New skill definitions, offline benchmark and tests: PROPOSED IN PR. Results from Node/GitHub CI: **NOT VERIFIED** until jobs run on the exact PR SHA.
- Mobile browser QA: **NOT VERIFIED** (no visitor-facing changes in this PR).
- GSC, AdSense and visitor outcomes: **NOT AVAILABLE**, not inferred from implementation.
- **Exactly one next action:** generate a pinned, rights-reviewed all-MiniLM vector snapshot offline, run the strict relevance comparison against the 12-question gold set, and do not touch production unless that evidence supports a measured UX experiment.
