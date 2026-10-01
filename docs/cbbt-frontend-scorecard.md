# CBBT traveler frontend scorecard

Date: 2026-10-01
Canonical target: `https://chrisizworski.com/chesapeake-bay-bridge-tunnel/`
Backend contract: `/api/cbbt`

## Pre-code decision

Primary human decision: **What does CBBT officially report right now, does that official state permit my selected vehicle, and what immediate trip impacts or toll details matter?**

Design rules:

- CBBT operational status always precedes NOAA/NWS context.
- `UNKNOWN` and `OFFICIAL_STATUS_CONFLICT` never inherit optimistic styling or copy.
- Vehicle eligibility and toll amounts are rendered from `/api/cbbt`; browser code only collects inputs and translates returned states.
- The 390 px first screen prioritizes official status, selected vehicle result, compact incident state and bridge wind.
- Radar and real imagery load after the decision layer and can fail without degrading operational status.
- Planned advisories remain visually and semantically separate from live incidents.

## Pre-code score

| Dimension | Weight | Score |
| --- | ---: | ---: |
| Immediate decision utility | 20 | 20 |
| Operational truth / safety | 15 | 15 |
| Mobile usability | 15 | 14 |
| Vehicle decision experience | 10 | 10 |
| Information hierarchy | 10 | 10 |
| Trust / provenance / freshness | 10 | 10 |
| Toll experience | 5 | 5 |
| Weather / radar context | 5 | 4 |
| Experience layer | 5 | 4 |
| Performance / accessibility | 5 | 5 |
| **Total** | **100** | **97** |

Remaining pre-code risks: external NWS radar rendering and keeping the experience layer useful without competing with the immediate crossing decision.

## Benchmark conclusions

- **Mackinac Bridge Live:** keep the official bridge authority visually dominant, clearly label environmental data as context, expose freshness, and personalize the crossing answer by vehicle.
- **Gordie Howe / Michigan border tools:** state the direction or traveler decision before explanatory content and avoid pretending missing operator data exists.
- **Soo Locks / strongest experience products:** after answering the live decision, use real imagery and a compact explanatory layer that makes the physical experience understandable.
- **Official CBBT:** source truth is authoritative but scattered across traffic, weather, toll, advisory and project pages; the product opportunity is to unify those decisions without replacing CBBT authority.

## Loss controls

The frontend must fail closed to `UNKNOWN` presentation when official state is unavailable, preserve conflict presentation, never derive a restriction from wind, never calculate rates client-side, visually age stale observations, and keep radar non-blocking.

## Final score

Complete after implementation and browser verification.
