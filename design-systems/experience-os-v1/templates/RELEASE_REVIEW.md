# Experience release review — [tool]

- Date / owning repo / canonical URL / PR / head SHA:
- Design brief / external sources checked:
- Change scope / baseline: 
- Actual screenshot evidence (360, 390, 768, desktop, deep scroll):
- Real browser tests (selection, reset, 3 scenarios):
- Test commands and exit status (not intentions):
- CI run and status:
- Production smoke URL/status (only after released):

## Scoring

| Category | Weight | Observed score 0–5 or NOT MEASURED | Evidence |
| --- | ---: | --- | --- |
| Visitor decision | 25 | | |
| Distinct experience | 15 | | |
| Causal interactions | 15 | | |
| Truth and provenance | 15 | | |
| Visual / photography | 10 | | |
| Mobile and accessibility | 10 | | |
| Performance and failure | 5 | | |
| Integration / SEO / ads | 5 | | |

Weighted total: [not measured until all categories observed]; any category below 4/5? [yes/no/unknown].
All `QA_SCORECARD.md` hard gates pass? [yes/no/unknown]. Merge allowed? [yes/no; owner CI takes precedence].

## Fallback checks

- JS disabled:
- No tiles / map unsupported:
- Stale/missing data:
- Keyboard/focus/alternative to drag:
- Reduced motion:
- Source rights/photo credits:
- Canonical, Person ID, indexing, ad controls, no Redis regression:

## What the next builder should reuse

Pattern ID, source URL and checked date, verified behavior, one successful choice and one failed/avoided approach. Update inspiration/anti-pattern entries after the release is verified.
