# Adventure Finder local intent acceptance report — November 22, 2026

PR #1851, still UNMERGED / NOT DEPLOYED. The earlier HF MiniLM experiment failed the separate 20-question holdout, so no model is added to the public site. Instead a static source-grounded phrase matcher works against the existing twenty article bodies, titles and tags.

## Acceptance metrics (local source-level preliminary evaluation)

| 36 curated examples | Lexical full-card baseline | Deterministic intent |
| --- | ---: | ---: |
| Top-three relevant match, 30 positive | 93.3% | 100% |
| MRR, 30 positive | 0.832 | 0.983 |
| Reject six unsupported requests | 0 of 6 | 6 of 6 |

The prompts in scripts/fixtures/adventure-intent-acceptance.json are NEW EDITORIAL ACCEPTANCE CASES. They are not a blind holdout, random sample, or visitor search logs. The baseline was given the same full twenty-card text; gains are not from secretly adding more source text to one competitor. Exact-head GitHub test and browser execution are required to verify numbers.

Unsupported examples include lifeguards, airport charging, ski lift tickets, reserved accessible parking, ice safety, and guaranteed warm swimming conditions. No match is better than an invented facility/safety answer.

## Interface and evidence rules

The optional description input is a single compact line inside the current season/activity/region finder. It does not alter the page hero, headline, canonical, structured data, advertising, original photo, attribution, official source links or all-20-cards no-JS HTML. Its selected results and map use the exact same pre-existing destination IDs. It never reorders DOM cards, guesses today's openings or moves AdSense blocks.

When a description is entered, a source-evidence explanation and one Start with link appear. A no-match response offers the existing reset/clear action. Typed text never enters a URL, analytics, geolocation, localStorage or external request.

## Release decision

Candidate feature for review, NOT yet public. User explicitly requested no merge while remaining investment work is in progress. On the final PR head, pass the full verification job, Chromium mobile/desktop search and photo/map workflow, inspect screenshots and resolve regressions. Actual search engagement, CTR, revenue and improved trip choices have not been measured.
