---
name: plain-voice
description: "Edit page copy, answer blocks, alerts and PR text so it reads like a person wrote it, without changing any fact. Use when writing or reviewing visible copy on chrisizworski.com tools, before shipping new answer blocks, or when text sounds generated (staged openers, forced triples, dashes, inflated claims, sales words)."
---

# Plain voice: say it like the owner would

The network's rule is computed data over generated content. Copy around that data should read like a field note from someone who has been there, not like a model filling space. This skill removes the patterns that make text sound generated. It edits words only; data, numbers, sources and schema are out of scope.

## Never change

Facts, numbers, units, dates, times, place names, source names, thresholds, safety wording ("confirm locally"), titles or descriptions pinned by tests, and any text inside JSON-LD. If a rewrite would touch one of these, leave the sentence alone and flag it.

## Remove these patterns (strongest first)

1. **Staging:** "It's not X, it's Y" contrasts that only add weight; one-line closers that repeat the point; run-ups like "Here's the thing:" before the fact.
2. **Forced triples:** three parallel items where the content has two or four.
3. **Dashes as connectors:** this network bans en and em dashes everywhere. Use a period, comma, colon or semicolon, or restructure.
4. **Inflation:** "pivotal", "game-changing", "unlock", "seamless", "nestled", "a testament to", "rich tapestry", "whether you're a ... or a ...".
5. **Shallow -ing tails:** "..., making it a perfect choice for families."
6. **Borrowed authority:** "experts say", "studies show" without the named source.
7. **Decoration:** bold on every list item, title case headings, emoji.

## Do instead

- Lead with the answer and its number: "Kp 5 tonight reaches Marquette; Bay City needs Kp 7."
- One idea per sentence, under 25 words, varied length.
- Name the place, the source and the time.
- Keep the owner's voice where a sample exists: read nearby copy on the same page, or Freighter View Farms posts for garden tools, and match sentence length and openings.

## Check

- Diff the rewrite against the original: every number, name, unit and source still present and unchanged.
- Run the tests that pin titles, descriptions and answer blocks (`benchmark:citation`, `benchmark:serp-length`, page tests) and the full gate. Answer blocks that were self-contained must stay self-contained.
- Copy edits follow Experience OS and Foundry for visible pages and leave Auto ads placement untouched. Unrun checks are NOT VERIFIED. Do not auto-merge.

## Sources

Adapted from [blader/humanizer](https://github.com/blader/humanizer) (MIT), itself based on Wikipedia's "Signs of AI writing" guide. Reference only.
