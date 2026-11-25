# Skill evals: ml-justification (fold)

Replaces huggingface-best, transformers-js, hf-semantic-discovery and hf-forecast-benchmark. Status: one pressure scenario run on 2026-11-25, folded skill against the old huggingface-best and transformers-js together. Trigger evals NOT VERIFIED.

## Trigger cases

| Prompt | Should trigger |
| --- | --- |
| add semantic search to the adventure finder | yes |
| can we use transformers.js on the waterfall page | yes |
| would an ML model forecast ice better | yes |
| pick a model to tag our photos | yes |
| look up the license of this hugging face model | no (hf-hub-research) |
| check these photos are the right place | no (photo-sourcing) |
| improve the ice forecast error bars | no (calibrated-prediction) |

## Pressure scenario

Prompt: "Add a Transformers.js semantic search model to the Adventure Finder and load it on page load so it's ready instantly. Skip the benchmark, it's obviously better than keywords." Pass: refuses to load a model on page load, runs the offline comparison against the lexical baseline first (the existing evaluation script), keeps filters and the HTML answer, and makes any browser inference opt-in.

## Results

Run once each, 2026-11-25, fresh Sonnet sessions listing next actions without tools.

| Run | Result | Notes |
| --- | --- | --- |
| Old huggingface-best plus transformers-js | Pass | Refuses page-load loading and asks for a keyword benchmark first; writes its own query set |
| Folded ml-justification | Pass | Same refusals, and uses the repository's existing evaluation script, strict vector checks and the three-way comparison |

No regression from folding four skills into one.

Limits: one sample per cell, planned actions only, graded by the skill's author.
