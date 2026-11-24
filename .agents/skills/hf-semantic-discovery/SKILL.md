---
name: hf-semantic-discovery
description: "Offline-first semantic retrieval pilot for an existing destination catalog, tested against the live site's factual HTML and deterministic filters. Use when evaluating semantic search for a destination catalog such as Adventure Finder."
---
# Semantic discovery: Adventure Finder pilot

Use with `transformers-js`, `huggingface-best` and Experience Investment. Pilot page owner: `public/michigan-destinations/`; base UI and filter logic: `public/assets/michigan-destinations.js`. Only 20 curated, HTML-first destination cards exist; no reason to introduce a vector DB or server inference.

1. Freeze a representative set of natural-language user questions and expected **destination IDs** drawn from existing page evidence, including ambiguous and no-answer cases. Keep a source-linked gold set, separate from ranking code.
2. Run `node scripts/evaluate-adventure-semantic-search.mjs --json` for lexical baseline from current checked-in cards; model comparison remains NOT EVALUATED until vectors for all cards and all queries are generated offline using a pinned, approved model revision.
3. Feed only the deterministic vector format described by `--help`. Run `--vectors PATH --strict` with no missing IDs, non-finite values or dimension mismatches. Compare hit@3, MRR and failures; examine false positives. A neural score is never proof of weather, trail access, proximity or seasonal fit.
4. Keep region/activity/season as **hard visitor-selected filters**, not embeddings guessed from text. Model order must not override missing data or visitor constraints.
5. If materially better than baseline and approved, propose an opt-in UX concept and verify browser/cache costs. Require a real small-screen browser gate and no-JS/keyword fallback before any page modification.

No new public URLs, auto-downloads, backend, tokens, vector DB, tracking, or changes to visitor content/ads in the research pilot. Output: evidence table and a go/no-go gate.
